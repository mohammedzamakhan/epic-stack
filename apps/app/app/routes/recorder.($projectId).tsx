import { LiquidMetal } from '@paper-design/shaders-react'
import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { projectHooks } from '@repo/integrations'
import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Card, CardContent } from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Logo } from '@repo/ui/logo'
import { Mic, MicOff } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
	type LoaderFunctionArgs,
	useLoaderData,
	useNavigate,
	useFetcher,
	type ActionFunctionArgs,
} from 'react-router'
import { useTheme } from '#app/routes/resources+/theme-switch.tsx'
import { deleteOpenReplaySessionData } from '#app/utils/openreplay.server.ts'
import { logRecordingActivity } from '#app/utils/project-activity-log.server.ts'
import { uploadRecordingVideo } from '#app/utils/storage.server.ts'
import {
	estimateVideoDuration,
	getVideoFileSize,
	generateThumbnailKey,
} from '#app/utils/video.server.ts'
import { RecordingViewer } from '../components/recording-viewer'
import { type RecordingSessionData } from '../lib/types/recording'

// Types for recorder state management
interface RecorderState {
	// Configuration
	audioEnabled: boolean
	selectedMicrophone: string | null

	// Recording state
	isScreenSharing: boolean
	isRecording: boolean
	recordingStartTime: number | null

	// Media streams
	screenStream: MediaStream | null
	audioStream: MediaStream | null
	mediaRecorder: MediaRecorder | null

	// Captured data
	videoChunks: Blob[]
	openReplaySessionId: string | null
	openReplaySessionHash: string | null

	// Preview data
	sessionData: RecordingSessionData | null
	micPermissionDenied: boolean
}

// Message types for BroadcastChannel communication
type BroadcastMessage =
	| {
			type: 'SCREEN_SHARING_STARTED'
			projectId: string
			source: 'recorder' | 'toolbar'
	  }
	| { type: 'SCREEN_SHARING_STOPPED' }
	| { type: 'RECORDING_STARTED'; startTime: number; sessionId: string }
	| { type: 'RECORDING_STOPPED' }

export async function loader({ params, request }: LoaderFunctionArgs) {
	const { projectId } = params
	const url = new URL(request.url)

	const userId = await requireUserId(request)
	let project
	// Verify the project exists
	if (projectId) {
		project = await prisma.project.findUnique({
			where: { id: projectId },
			select: {
				id: true,
				name: true,
				organization: {
					select: {
						id: true,
						slug: true,
						name: true,
					},
				},
			},
		})
	}

	// Extract query parameters for toolbar integration
	const source = url.searchParams.get('source') // 'toolbar' or null
	const sessionId = url.searchParams.get('sessionId') // session ID from toolbar
	const autoStart = url.searchParams.get('autoStart') === 'true' // auto-start recording
	const returnUrl = url.searchParams.get('returnUrl') // URL to return to after recording
	const review = url.searchParams.get('review') === 'true' // review mode
	const extensionId = url.searchParams.get('extensionId') // extension ID for data retrieval

	return {
		projectId,
		project,
		userId,
		toolbarIntegration: {
			source,
			sessionId,
			autoStart,
			returnUrl,
			review,
			extensionId,
		},
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { projectId } = params

	if (!projectId) {
		throw new Response('Project ID is required', { status: 400 })
	}

	const project = await prisma.project.findUnique({
		where: { id: projectId },
		select: {
			id: true,
			organizationId: true,
			organization: {
				select: {
					slug: true,
				},
			},
		},
	})

	if (!project) {
		throw new Response('Project not found', { status: 404 })
	}

	const userId = await requireUserId(request)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'save-recording') {
		const title = formData.get('title')?.toString() || 'Untitled Recording'
		const description = formData.get('description')?.toString() || null
		const sessionData = formData.get('sessionData')?.toString() || null
		const videoBlob = formData.get('videoBlob') as File | null
		const openReplaySessionId =
			formData.get('openReplaySessionId')?.toString() || null
		const ignoredRecordingStartTime = formData
			.get('recordingStartTime')
			?.toString()

		if (!videoBlob) {
			throw new Response('Video file is required', { status: 400 })
		}

		try {
			// Calculate video metadata
			const videoFileSize = getVideoFileSize(videoBlob)
			const videoDuration = estimateVideoDuration(videoFileSize)

			// Verify if OpenReplay session exists, otherwise set to null to avoid FK error
			let validOpenReplaySessionId = openReplaySessionId
			if (validOpenReplaySessionId) {
				const sessionExists = await prisma.openReplaySession.findUnique({
					where: { sessionId: validOpenReplaySessionId },
					select: { id: true },
				})
				if (!sessionExists) {
					console.warn(
						`OpenReplay session ${validOpenReplaySessionId} not found, setting to null`,
					)
					validOpenReplaySessionId = null
				}
			}

			// Create the recording first to get the real ID
			const recording = await prisma.recording.create({
				data: {
					title,
					description,
					projectId: project.id,
					organizationId: project.organizationId,
					createdById: userId,
					sessionData,
					openReplaySessionId: validOpenReplaySessionId,
					status: 'processing', // Mark as processing until video is uploaded
					videoDuration,
					videoFileSize,
				},
			})

			// Now upload video with the real recording ID
			const videoObjectKey = await uploadRecordingVideo(
				userId,
				recording.id,
				videoBlob,
				project.organizationId,
			)

			// Generate thumbnail key with the real recording ID
			const videoThumbnailKey = generateThumbnailKey(
				project.organizationId,
				recording.id,
				'video-thumbnail',
			)

			// Update the recording with video keys and mark as completed
			await prisma.recording.update({
				where: { id: recording.id },
				data: {
					videoObjectKey,
					videoThumbnailKey,
					status: 'completed',
				},
			})

			// Trigger integration hooks and log activity
			try {
				await Promise.all([
					projectHooks.afterRecordingCreated(recording.id, userId),
					logRecordingActivity({
						recordingId: recording.id,
						userId,
						action: 'created',
						metadata: {
							title,
							description,
							projectId: project.id,
							videoDuration,
							videoFileSize,
							openReplaySessionId,
						},
					}),
				])
			} catch (error) {
				console.error(
					'Failed to trigger recording hooks or log activity:',
					error,
				)
			}

			return Response.json({
				success: true,
				recordingId: recording.id,
				redirectUrl: `/${project.organization.slug}/project/${project.id}/recordings/${recording.id}`,
			})
		} catch (error) {
			console.error('Failed to save recording:', error)
			throw new Response('Failed to save recording', { status: 500 })
		}
	}

	if (intent === 'discard-recording') {
		const openReplaySessionId = formData.get('openReplaySessionId')?.toString()

		if (openReplaySessionId) {
			try {
				await deleteOpenReplaySessionData(openReplaySessionId)
				console.log(
					`Deleted OpenReplay session data for discarded recording: ${openReplaySessionId}`,
				)
			} catch (error) {
				console.error('Failed to delete OpenReplay session data:', error)
				// Don't fail the request if cleanup fails
			}
		}

		return Response.json({ success: true })
	}

	throw new Response('Invalid intent', { status: 400 })
}

/**
 * Recorder Page Component
 *
 * World-class minimal recording interface inspired by modern tools.
 */
export default function RecorderPage() {
	const { projectId, project, toolbarIntegration } =
		useLoaderData<typeof loader>()
	const ignoredNavigate = useNavigate()
	const ignoredFetcher = useFetcher()
	const theme = useTheme()

	// State management
	const [state, setState] = useState<RecorderState>({
		audioEnabled: false,
		selectedMicrophone: null,

		isScreenSharing: false,
		isRecording: false,
		recordingStartTime: null,

		screenStream: null,
		audioStream: null,
		mediaRecorder: null,

		videoChunks: [],
		openReplaySessionId: null,
		openReplaySessionHash: null,

		sessionData: null,
		micPermissionDenied: false,
	})

	// New states from prototype
	const [recordingTime, setRecordingTime] = useState(0)
	const [showMicSelection, setShowMicSelection] = useState(false)
	const [availableMicrophones, setAvailableMicrophones] = useState<
		MediaDeviceInfo[]
	>([])
	const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const [saveSuccess, setSaveSuccess] = useState(false)

	const [connectionStatus, setConnectionStatus] = useState<
		'idle' | 'handshaking' | 'connected' | 'failed'
	>('idle')
	const [debugLogs, setDebugLogs] = useState<string[]>([])
	const dataFoundRef = useRef(false)

	const addDebugLog = useCallback((msg: string) => {
		// DO NOT call console.log here, it causes infinite loops with some observers
		setDebugLogs((prev) =>
			[...prev, `${new Date().toISOString().split('T')[1]} - ${msg}`].slice(
				-10,
			),
		)
	}, [])

	// Timer Effect
	useEffect(() => {
		let interval: NodeJS.Timeout
		if (state.isRecording) {
			interval = setInterval(() => {
				setRecordingTime((prev) => prev + 1)
			}, 1000)
		} else {
			setRecordingTime(0)
		}
		return () => clearInterval(interval)
	}, [state.isRecording])

	// Refs for cleanup and communication
	const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const videoChunksRef = useRef<Blob[]>([])

	useEffect(() => {
		const initializeBroadcastChannel = () => {
			try {
				broadcastChannelRef.current = new BroadcastChannel('bugbasher_channel')
			} catch (error) {
				console.error('Recorder: Failed to initialize BroadcastChannel:', error)
			}
		}

		const loadAvailableMicrophones = async () => {
			try {
				await navigator.mediaDevices.getUserMedia({ audio: true })
				const devices = await navigator.mediaDevices.enumerateDevices()
				const microphones = devices.filter(
					(device) => device.kind === 'audioinput',
				)

				setAvailableMicrophones(microphones)
				setState((prev) => ({ ...prev, micPermissionDenied: false }))

				if (microphones.length > 0 && !state.selectedMicrophone) {
					setState((prev) => ({
						...prev,
						selectedMicrophone: microphones[0]?.deviceId || null,
					}))
				}
			} catch (error) {
				console.error('Failed to load available microphones:', error)
				setState((prev) => ({ ...prev, micPermissionDenied: true }))
			}
		}

		const cleanup = () => {
			if (state.screenStream)
				state.screenStream.getTracks().forEach((track) => track.stop())
			if (state.audioStream)
				state.audioStream.getTracks().forEach((track) => track.stop())
			if (mediaRecorderRef.current && state.isRecording)
				mediaRecorderRef.current.stop()
			if (broadcastChannelRef.current) broadcastChannelRef.current.close()
			if (previewVideoUrl) URL.revokeObjectURL(previewVideoUrl)
		}

		const processReviewData = (sessionData: any) => {
			if (dataFoundRef.current) return
			dataFoundRef.current = true
			setConnectionStatus('connected')
			addDebugLog('Processing received session data...')

			if (sessionData.videoData) {
				try {
					const base64Data = sessionData.videoData.includes(',')
						? sessionData.videoData.split(',')[1]
						: sessionData.videoData

					const byteCharacters = atob(base64Data)

					// Safety check for empty data
					if (!byteCharacters || byteCharacters.length === 0) {
						throw new Error('Decoded base64 data is empty')
					}

					const byteArrays = []
					const sliceSize = 512

					for (
						let offset = 0;
						offset < byteCharacters.length;
						offset += sliceSize
					) {
						const slice = byteCharacters.slice(offset, offset + sliceSize)
						const byteNumbers = new Array(slice.length)
						for (let i = 0; i < slice.length; i++) {
							byteNumbers[i] = slice.charCodeAt(i)
						}
						const byteArray = new Uint8Array(byteNumbers)
						byteArrays.push(byteArray)
					}

					const videoBlob = new Blob(byteArrays, { type: 'video/webm' })
					const videoUrl = URL.createObjectURL(videoBlob)

					setPreviewVideoUrl(videoUrl)
					setState((prev) => ({
						...prev,
						sessionData,
						videoChunks: [videoBlob],
						openReplaySessionId: sessionData.openReplaySessionId || null,
						recordingStartTime: sessionData.recordingStartTime || null,
					}))
					addDebugLog('SUCCESS: Video parsed and loaded')
				} catch (e) {
					addDebugLog(
						`ERROR parsing video: ${e instanceof Error ? e.message : String(e)}`,
					)
					setConnectionStatus('failed')
				}
			} else {
				addDebugLog('ERROR: No videoData in payload')
			}
		}

		const initializeComponent = async () => {
			initializeBroadcastChannel()
			await loadAvailableMicrophones()

			if (toolbarIntegration.review && toolbarIntegration.sessionId) {
				if (dataFoundRef.current) return

				setConnectionStatus('handshaking')
				addDebugLog(`Review Mode: Session ${toolbarIntegration.sessionId}`)

				// Strategy 1: Extension Fetch
				if (toolbarIntegration.extensionId) {
					addDebugLog(
						`Extension ID detected: ${toolbarIntegration.extensionId}`,
					)
					try {
						// @ts-ignore
						const chromeApi = window.chrome
						if (
							chromeApi &&
							chromeApi.runtime &&
							chromeApi.runtime.sendMessage
						) {
							addDebugLog('Contacting extension background...')

							// Fetch both recording data and session logs in parallel
							let recordingData: any = null
							let sessionLogs: any = null
							let pendingRequests = 2

							const tryProcessData = () => {
								pendingRequests--
								if (pendingRequests > 0) return

								// Merge recording data with session logs
								if (recordingData) {
									const mergedData = {
										...recordingData,
										// Transform session logs to match RecordingSessionData format
										consoleLogs:
											sessionLogs?.consoleMessages?.map((msg: any) => ({
												type: 'ConsoleLog',
												timestamp: msg.timestamp,
												level: msg.level,
												value: msg.message,
											})) ||
											recordingData.consoleLogs ||
											[],
										networkRequests:
											sessionLogs?.networkRequests?.map((req: any) => ({
												type: 'NetworkRequest',
												requestType: 'Fetch',
												method: req.method,
												url: req.url,
												request: req.request || '',
												response: req.response || '',
												requestHeaders: req.requestHeaders,
												responseHeaders: req.responseHeaders,
												status: req.status,
												timestamp: req.timestamp,
												duration: req.duration,
												transferredBodySize: 0,
											})) ||
											recordingData.networkRequests ||
											[],
										userActions:
											sessionLogs?.userActions?.map((action: any) => ({
												type: action.type,
												timestamp: action.timestamp,
												elementId: action.elementId,
												value: action.value,
												x: action.x,
												y: action.y,
												label: action.label,
												selector: action.selector,
											})) ||
											recordingData.userActions ||
											[],
										navigation:
											sessionLogs?.navigationEvents?.map((nav: any) => ({
												type: 'SetPageLocation',
												timestamp: nav.timestamp,
												url: nav.url,
												referrer: nav.referrer,
												navigationStart: nav.navigationStart,
												documentTitle: nav.documentTitle,
											})) ||
											recordingData.navigation ||
											[],
									}
									addDebugLog(
										`Merged data: ${sessionLogs?.networkRequests?.length || 0} network, ${sessionLogs?.consoleMessages?.length || 0} console, ${sessionLogs?.userActions?.length || 0} actions`,
									)
									processReviewData(mergedData)
								}
							}

							// Fetch recording data (video, comments, etc.)
							// @ts-ignore
							chromeApi.runtime.sendMessage(
								toolbarIntegration.extensionId,
								{
									type: 'BB_GET_RECORDING_DATA',
									sessionId: toolbarIntegration.sessionId,
								},
								(response: any) => {
									if (chromeApi.runtime.lastError) {
										addDebugLog(
											`Extension error (recording): ${chromeApi.runtime.lastError.message}`,
										)
									} else if (response && response.ok && response.payload) {
										addDebugLog('Recording data retrieved from Extension!')
										recordingData = response.payload
									} else {
										addDebugLog('Extension returned empty recording response')
									}
									tryProcessData()
								},
							)

							// Fetch session logs (network, console, user actions, navigation)
							// @ts-ignore
							chromeApi.runtime.sendMessage(
								toolbarIntegration.extensionId,
								{
									type: 'BB_GET_SESSION_LOGS',
									payload: { sessionId: toolbarIntegration.sessionId },
								},
								(response: any) => {
									if (chromeApi.runtime.lastError) {
										addDebugLog(
											`Extension error (logs): ${chromeApi.runtime.lastError.message}`,
										)
									} else if (response && response.ok && response.payload) {
										addDebugLog('Session logs retrieved from Extension!')
										sessionLogs = response.payload
									} else {
										addDebugLog(
											'Extension returned empty session logs response',
										)
									}
									tryProcessData()
								},
							)
						} else {
							addDebugLog('Chrome runtime API not available')
						}
					} catch (e) {
						addDebugLog(
							`Extension contact failed: ${e instanceof Error ? e.message : String(e)}`,
						)
					}
				}

				// Strategy 2: Window Handshake (always enabled as fallback)
				const handleMessage = (event: MessageEvent) => {
					if (event.data?.type === 'BB_REVIEW_DATA' && event.data.payload) {
						addDebugLog('Data received via Window Handshake!')
						processReviewData(event.data.payload)
					}
				}

				window.addEventListener('message', handleMessage)

				// Initial handshake ping
				if (window.opener) {
					addDebugLog('Pinging parent tab...')
					window.opener.postMessage(
						{
							type: 'BB_REVIEW_READY',
							sessionId: toolbarIntegration.sessionId,
						},
						'*',
					)
				}

				// Cleanup for effect
				return () => window.removeEventListener('message', handleMessage)
			}

			if (
				toolbarIntegration.autoStart &&
				toolbarIntegration.source === 'toolbar'
			) {
				const currentUrl = new URL(window.location.href)
				if (currentUrl.searchParams.get('autoStart') === 'true') {
					setTimeout(() => void startScreenSharing(), 1000)
				}
			}
		}

		void initializeComponent()

		return cleanup
	}, [
		toolbarIntegration.review,
		toolbarIntegration.sessionId,
		toolbarIntegration.extensionId,
		toolbarIntegration.autoStart,
		toolbarIntegration.source,
		addDebugLog,
	])

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
	}

	const handleMicrophoneClick = async () => {
		// If microphone is already enabled, disable it
		if (state.audioEnabled) {
			setState((prev) => ({
				...prev,
				audioEnabled: false,
				selectedMicrophone: null,
			}))
			return
		}

		try {
			// First request permission with basic audio constraint
			await navigator.mediaDevices
				.getUserMedia({ audio: true })
				.then((stream) => stream.getTracks().forEach((track) => track.stop()))

			// Now enumerate devices after permission is granted
			const devices = await navigator.mediaDevices.enumerateDevices()
			const audioInputs = devices.filter(
				(device) => device.kind === 'audioinput' && device.deviceId,
			)
			setAvailableMicrophones(audioInputs)

			if (audioInputs.length === 0) {
				alert('No microphones found on this device.')
				return
			}

			if (audioInputs.length > 1) {
				setShowMicSelection(true)
			} else {
				// Use the default microphone directly
				setState((prev) => ({
					...prev,
					selectedMicrophone: audioInputs[0]?.deviceId || 'default',
					audioEnabled: true,
				}))
			}
		} catch (error) {
			console.error('Error accessing microphone:', error)
			alert(
				'Unable to access microphone. Please check your browser permissions.',
			)
		}
	}

	const handleSelectMicrophone = async (deviceId: string) => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: deviceId ? { deviceId: { exact: deviceId } } : true,
			})
			stream.getTracks().forEach((track) => track.stop())
			setState((prev) => ({
				...prev,
				selectedMicrophone: deviceId,
				audioEnabled: true,
			}))
			setShowMicSelection(false)
		} catch (error) {
			console.error('Error selecting microphone:', error)
			// Fallback to default if specific device fails
			setState((prev) => ({
				...prev,
				selectedMicrophone: 'default',
				audioEnabled: true,
			}))
			setShowMicSelection(false)
		}
	}

	const broadcastMessage = useCallback((message: BroadcastMessage) => {
		if (broadcastChannelRef.current) {
			try {
				broadcastChannelRef.current.postMessage(message)
			} catch (error) {
				console.error('Recorder: Failed to broadcast message:', error)
			}
		}
	}, [])

	const startScreenSharing = async () => {
		try {
			const screenStream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					width: { ideal: 1920 },
					height: { ideal: 1080 },
					frameRate: { ideal: 30 },
				},
				audio: false,
			})

			setState((prev) => ({
				...prev,
				screenStream,
				isScreenSharing: true,
			}))

			localStorage.setItem(
				'bugbasher_screen_sharing_state',
				JSON.stringify({
					isActive: true,
					projectId,
					source: 'recorder',
				}),
			)

			broadcastMessage({
				type: 'SCREEN_SHARING_STARTED',
				projectId,
				source: 'recorder',
			})

			// Remove autoStart query parameter once screen sharing actually starts
			if (toolbarIntegration.autoStart) {
				const url = new URL(window.location.href)
				url.searchParams.delete('autoStart')
				window.history.replaceState({}, '', url.toString())
			}

			const videoTrack = screenStream.getVideoTracks()[0]
			if (videoTrack) {
				videoTrack.addEventListener('ended', () => {
					stopScreenSharing()
				})
			}

			await startRecording(screenStream)
		} catch (error) {
			console.error('Recorder: Failed to start screen sharing:', error)
		}
	}

	const stopScreenSharing = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === 'recording'
		) {
			try {
				mediaRecorderRef.current.requestData()
				mediaRecorderRef.current.stop()

				setTimeout(async () => {
					if (!previewVideoUrl && videoChunksRef.current.length > 0) {
						await processRecordingChunks(videoChunksRef.current)
					}
				}, 1000)
			} catch (error) {
				console.error('Recorder: Failed to stop MediaRecorder:', error)
			}
		} else if (videoChunksRef.current.length > 0) {
			void processRecordingChunks(videoChunksRef.current)
		}

		if (state.screenStream) {
			state.screenStream.getTracks().forEach((track) => track.stop())
		}

		setState((prev) => ({
			...prev,
			screenStream: null,
			isScreenSharing: false,
		}))

		localStorage.removeItem('bugbasher_screen_sharing_state')
		broadcastMessage({ type: 'SCREEN_SHARING_STOPPED' })
	}

	const getAudioStream = async (): Promise<MediaStream | null> => {
		if (!state.audioEnabled || !state.selectedMicrophone) {
			return null
		}

		try {
			const audioStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					deviceId: state.selectedMicrophone,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			})
			return audioStream
		} catch (error) {
			console.error('Recorder: Failed to capture audio stream:', error)
			return null
		}
	}

	const startRecording = async (providedScreenStream?: MediaStream) => {
		const screenStream = providedScreenStream || state.screenStream
		if (!screenStream) return

		try {
			const audioStream = await getAudioStream()
			const combinedStream = new MediaStream()

			screenStream.getVideoTracks().forEach((track) => {
				combinedStream.addTrack(track)
			})

			if (audioStream) {
				audioStream.getAudioTracks().forEach((track) => {
					combinedStream.addTrack(track)
				})
				setState((prev) => ({ ...prev, audioStream }))
			}

			let mimeType = 'video/webm;codecs=vp9,opus'
			if (!MediaRecorder.isTypeSupported(mimeType)) {
				mimeType = 'video/webm;codecs=vp8,opus'
				if (!MediaRecorder.isTypeSupported(mimeType)) {
					mimeType = 'video/webm'
					if (!MediaRecorder.isTypeSupported(mimeType)) {
						mimeType = ''
					}
				}
			}

			const mediaRecorder = new MediaRecorder(
				combinedStream,
				mimeType ? { mimeType } : {},
			)
			mediaRecorderRef.current = mediaRecorder
			videoChunksRef.current = []

			mediaRecorder.addEventListener('dataavailable', (event) => {
				if (event.data && event.data.size > 0) {
					videoChunksRef.current.push(event.data)
				}
			})

			mediaRecorder.addEventListener('stop', async () => {
				await processRecordingChunks(videoChunksRef.current)
			})

			mediaRecorder.start(100)
			const startTime = Date.now()

			// Use session ID from toolbar if available, otherwise generate new one
			const sessionId = toolbarIntegration.sessionId || `session_${startTime}`

			setState((prev) => ({
				...prev,
				mediaRecorder,
				isRecording: true,
				recordingStartTime: startTime,
				videoChunks: [],
			}))

			broadcastMessage({
				type: 'RECORDING_STARTED',
				startTime,
				sessionId,
			})
		} catch (error) {
			console.error('Recorder: Failed to start recording:', error)
		}
	}

	const processRecordingChunks = async (
		chunks: Blob[] = videoChunksRef.current,
	) => {
		if (chunks.length === 0) return

		const videoBlob = new Blob(chunks, { type: 'video/webm' })
		const videoUrl = URL.createObjectURL(videoBlob)

		// Generate session ID - use toolbar session ID if available, otherwise generate one
		const sessionId =
			toolbarIntegration.sessionId ||
			`session_${state.recordingStartTime || Date.now()}`

		const mockSessionData: RecordingSessionData = {
			metadata: {
				id: sessionId,
				url: toolbarIntegration.returnUrl || window.location.href,
				timestamp: new Date(
					state.recordingStartTime || Date.now(),
				).toISOString(),
				os:
					(navigator as any).userAgentData?.platform ||
					navigator.platform ||
					'Unknown',
				browser: navigator.userAgent.split(' ').pop() || 'Unknown',
				windowSize: `${window.innerWidth}x${window.innerHeight}`,
				country: 'US',
				countryFlag: '🇺🇸',
				batteryStatus: 'Unknown',
				customMetadata: {
					projectId,
					recordingDuration: `${Math.floor((Date.now() - (state.recordingStartTime || 0)) / 1000)}s`,
					audioEnabled: state.audioEnabled.toString(),
					source: toolbarIntegration.source || 'recorder',
					sessionIdFromToolbar: toolbarIntegration.sessionId || 'none',
				},
			},
			consoleLogs: [
				{
					type: 'ConsoleLog',
					timestamp: Date.now(),
					level: 'info',
					value: 'Recording session started',
				},
			],
			networkRequests: [],
			userActions: [
				{
					type: 'MouseClick',
					timestamp: Date.now(),
					elementId: 0,
					selector: 'button[data-action="record"]',
					value: '',
					x: 0,
					y: 0,
				},
			],
			navigation: [
				{
					type: 'SetPageLocation',
					timestamp: Date.now(),
					url: toolbarIntegration.returnUrl || window.location.href,
					referrer: document.referrer || '',
					navigationStart: Date.now(),
					documentTitle: document.title || 'Recording Session',
				},
			],
		}

		let sessionData: RecordingSessionData
		try {
			// Only try to fetch OpenReplay session data if we have a valid session ID
			if (
				sessionId &&
				sessionId !== 'session_null' &&
				!sessionId.includes('null')
			) {
				console.log(
					`Attempting to fetch OpenReplay session data for: ${sessionId}`,
				)
				const response = await fetch(
					`/api/openreplay/v1/web/session/${sessionId}`,
				)
				if (response.ok) {
					sessionData = (await response.json()) as RecordingSessionData
					console.log(
						`Successfully fetched OpenReplay session data for ${sessionId}`,
					)
				} else if (response.status === 404) {
					console.log(
						`OpenReplay session ${sessionId} not found. This is expected if:`,
					)
					console.log(`1. The embedded script hasn't sent OpenReplay data yet`)
					console.log(
						`2. The session ID is from the toolbar (${sessionId}) but OpenReplay uses a different UUID`,
					)
					console.log(`3. The embedded script is not properly configured`)
					console.log(`Using mock data for now.`)
					sessionData = mockSessionData
				} else {
					console.log(
						`Error fetching OpenReplay session data (${response.status}), using mock data`,
					)
					sessionData = mockSessionData
				}
			} else {
				console.log('Invalid session ID, using mock data')
				sessionData = mockSessionData
			}
		} catch (error) {
			console.log(
				'Failed to fetch OpenReplay session data, using mock data:',
				error,
			)
			sessionData = mockSessionData
		}

		setState((prev) => ({
			...prev,
			videoChunks: [...chunks],
			isRecording: false,
			mediaRecorder: null,
			openReplaySessionId: sessionId,
			sessionData,
		}))

		mediaRecorderRef.current = null
		setPreviewVideoUrl(videoUrl)
		broadcastMessage({ type: 'RECORDING_STOPPED' })
	}

	const handleSaveRecording = async () => {
		if (
			!previewVideoUrl ||
			!state.sessionData ||
			state.videoChunks.length === 0
		) {
			console.error('Cannot save: missing data', {
				hasPreviewUrl: !!previewVideoUrl,
				hasSessionData: !!state.sessionData,
				videoChunksLength: state.videoChunks.length,
			})
			return
		}

		if (!projectId) {
			alert('Project ID is required to save the recording')
			return
		}

		setIsSaving(true)

		try {
			const videoBlob = new Blob(state.videoChunks, { type: 'video/webm' })

			// Remove videoData from sessionData before serializing (it's sent as a separate blob)
			const sessionDataToSave = { ...state.sessionData }
			delete sessionDataToSave.videoData

			const formData = new FormData()
			formData.append('intent', 'save-recording')
			formData.append('title', `Recording ${new Date().toLocaleString()}`)
			formData.append(
				'description',
				`Bug recording for ${project?.name || 'Unknown Project'}`,
			)
			formData.append('sessionData', JSON.stringify(sessionDataToSave))
			formData.append('videoBlob', videoBlob, 'recording.webm')
			formData.append('openReplaySessionId', toolbarIntegration.sessionId || '')
			formData.append(
				'recordingStartTime',
				state.recordingStartTime?.toString() || '',
			)

			const response = await fetch(window.location.pathname, {
				method: 'POST',
				body: formData,
			})

			if (response.ok) {
				const result = (await response.json()) as {
					success: boolean
					redirectUrl?: string
				}
				if (result.success) {
					setSaveSuccess(true)
					if (result.redirectUrl) {
						// Show success message and redirect after a delay
						setTimeout(() => {
							window.location.href = result.redirectUrl!
						}, 2000)
					}
				}
			} else {
				const errorText = await response.text()
				console.error('Server error:', response.status, errorText)
				throw new Error(
					`Failed to save recording: ${response.status} ${errorText}`,
				)
			}
		} catch (error) {
			console.error('Failed to save recording:', error)
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			alert(`Failed to save recording: ${errorMessage}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handleReturnToPage = () => {
		if (toolbarIntegration.returnUrl) {
			window.location.href = toolbarIntegration.returnUrl
		} else {
			window.close()
		}
	}

	const handleDiscardRecording = async () => {
		// Delete OpenReplay session data if it exists
		if (state.openReplaySessionId) {
			try {
				const formData = new FormData()
				formData.append('intent', 'discard-recording')
				formData.append('openReplaySessionId', state.openReplaySessionId)

				await fetch(window.location.pathname, {
					method: 'POST',
					body: formData,
				})
			} catch (error) {
				console.error('Failed to delete OpenReplay session data:', error)
				// Continue with cleanup even if this fails
			}
		}

		// Clean up local state
		if (previewVideoUrl) {
			URL.revokeObjectURL(previewVideoUrl)
		}
		setPreviewVideoUrl(null)
		setSaveSuccess(false)
		setState((prev) => ({
			...prev,
			videoChunks: [],
			sessionData: null,
			openReplaySessionId: null,
		}))
	}

	if (previewVideoUrl && state.sessionData) {
		if (saveSuccess) {
			return (
				<div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-4 antialiased">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: 'easeOut' }}
						className="mb-8 w-full max-w-[500px] text-center"
					>
						<div className="mb-6">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
								<Icon
									name="check"
									className="h-8 w-8 text-green-600 dark:text-green-400"
								/>
							</div>
							<h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
								Recording Saved Successfully!
							</h1>
							<p className="text-muted-foreground mb-6">
								Your bug recording has been saved to {project.name}.
							</p>

							{toolbarIntegration.returnUrl && (
								<Button onClick={handleReturnToPage} className="mb-4">
									<Icon name="arrow-left" className="mr-2 h-4 w-4" />
									Return to Page
								</Button>
							)}

							<p className="text-muted-foreground text-sm">
								{toolbarIntegration.returnUrl
									? 'Or redirecting to view recording...'
									: 'Redirecting to view recording...'}
							</p>
						</div>
					</motion.div>
				</div>
			)
		}

		return (
			<div>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: 'easeOut' }}
					className="w-full"
				>
					<div>
						<RecordingViewer
							data={state.sessionData}
							videoUrl={previewVideoUrl}
							title="Recording Preview"
							description="Your recorded session"
						>
							<Button
								variant="outline"
								onClick={handleDiscardRecording}
								disabled={isSaving}
								className="px-6"
							>
								<Icon name="trash-2" className="mr-2 h-4 w-4" />
								Discard
							</Button>
							<Button
								onClick={handleSaveRecording}
								disabled={isSaving}
								className="px-6"
							>
								{isSaving ? (
									<>
										<Icon name="loader" className="mr-2 h-4 w-4 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Icon name="check" className="mr-2 h-4 w-4" />
										Save Recording
									</>
								)}
							</Button>
						</RecordingViewer>
					</div>
				</motion.div>
			</div>
		)
	}

	return (
		<div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-4 antialiased">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
				className="w-full max-w-[500px]"
			>
				<Card className="bg-card relative overflow-visible rounded-3xl border p-2 shadow-sm">
					<CardContent className="flex flex-col items-center p-4 pb-8">
						{/* Title or Timer */}
						<div className="mb-4 text-center">
							{!state.isRecording ? (
								<div>
									<h1 className="text-2xl font-normal">
										{toolbarIntegration.source === 'toolbar'
											? 'Recording for'
											: 'Tap to record'}
									</h1>
									{toolbarIntegration.source === 'toolbar' && (
										<p className="text-muted-foreground mt-1 text-sm">
											{project.name}
										</p>
									)}
								</div>
							) : (
								<div className="flex items-center gap-2 text-xl">
									<div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
									<span className="text-muted-foreground font-mono">
										{formatTime(recordingTime)}
									</span>
								</div>
							)}
						</div>

						{showMicSelection && (
							<div className="bg-background border-border absolute top-1/2 left-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-2xl">
								<h2 className="mb-4 text-lg font-semibold">
									Select Microphone
								</h2>
								<div className="max-h-60 space-y-2 overflow-y-auto pr-2">
									{availableMicrophones.map((device, index) => (
										<button
											key={device.deviceId}
											onClick={() => handleSelectMicrophone(device.deviceId)}
											className="bg-secondary hover:bg-accent flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors"
										>
											<Mic className="text-muted-foreground h-4 w-4" />
											<span className="truncate text-sm">
												{device.label || `Microphone ${index + 1}`}
											</span>
										</button>
									))}
								</div>
								<button
									onClick={() => setShowMicSelection(false)}
									className="border-border hover:bg-accent mt-4 w-full rounded-lg border px-4 py-2 text-sm transition-colors"
								>
									Cancel
								</button>
							</div>
						)}

						{/* Record Button */}
						<div className="relative">
							<LiquidMetal
								width={280}
								height={280}
								colorBack={theme === 'dark' ? '#181818' : '#ffffff'}
								colorTint="#ffffff"
								shape="circle"
								repetition={2}
								softness={0.1}
								shiftRed={0.3}
								shiftBlue={0.3}
								distortion={0.07}
								contour={0.4}
								angle={0}
								speed={1}
								scale={0.86}
								fit="cover"
							>
								<div className="flex h-full w-full items-center justify-center">
									<button
										onClick={
											state.isRecording ? stopScreenSharing : startScreenSharing
										}
										className={cn(
											'flex h-56 w-56 items-center justify-center rounded-full transition-all duration-300',
											state.isRecording
												? 'bg-gradient-to-b from-[#e88383] to-[#db5757]'
												: 'bg-secondary',
										)}
										style={{
											border: state.isRecording
												? 'none'
												: theme === 'dark'
													? '3px solid #0a0a0a'
													: '3px solid #ffffff',
											boxShadow: state.isRecording
												? 'inset 0 -8px 20px rgba(0,0,0,0.35), inset 0 8px 20px rgba(255,255,255,0.15), 0 10px 30px rgba(0,0,0,0.4)'
												: theme === 'dark'
													? 'inset 0 -6px 16px rgba(0,0,0,0.6), inset 0 6px 16px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.5)'
													: 'inset 0 -6px 16px rgba(0,0,0,0.15), inset 0 6px 16px rgba(255,255,255,0.5), 0 8px 24px rgba(0,0,0,0.15)',
										}}
										aria-label={
											state.isRecording ? 'Stop recording' : 'Start recording'
										}
									>
										{/* Inner content */}
										<div className="relative z-10">
											{!state.isRecording ? (
												<div className="text-6xl">
													<Logo className="[&>div]:hidden [&>svg]:h-[54px] [&>svg]:w-[60px]" />
												</div>
											) : (
												<div
													className="h-8 w-8 rounded-[6px] bg-white"
													style={{
														boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
													}}
												/>
											)}
										</div>
									</button>
								</div>
							</LiquidMetal>

							{/* Microphone Button (only shown when not recording) */}
							{!state.isRecording && (
								<button
									onClick={handleMicrophoneClick}
									className="absolute -right-2 -bottom-2 z-20 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200"
									style={{
										background:
											theme === 'dark'
												? 'linear-gradient(180deg, #3a3a3a 0%, #252525 100%)'
												: 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
									}}
									aria-label={
										!state.audioEnabled
											? 'Enable microphone'
											: 'Microphone enabled'
									}
								>
									{!state.audioEnabled ? (
										<MicOff className="text-muted-foreground h-5 w-5" />
									) : (
										<Mic className="h-5 w-5 text-white" />
									)}
								</button>
							)}
						</div>
					</CardContent>
				</Card>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.5 }}
					transition={{ delay: 0.6 }}
					className="text-muted-foreground mt-8 flex items-center justify-center gap-2 text-[13px] font-medium"
				>
					<span>Powered by</span>
					<Logo />
				</motion.div>
			</motion.div>
		</div>
	)
}
