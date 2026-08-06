import { useEffect, useRef } from 'react'

// Message types for cross-tab communication (copied from bugbasher-script types)
type BroadcastMessage =
	| {
			type: 'SCREEN_SHARING_STARTED'
			projectId: string
			source: 'recorder' | 'toolbar'
	  }
	| { type: 'SCREEN_SHARING_STOPPED' }
	| { type: 'RECORDING_STARTED'; startTime: number; sessionId: string }
	| { type: 'RECORDING_STOPPED' }

// Messages from script to watcher iframe
type ScriptToWatcherMessage =
	| { type: 'START_RECORDING'; projectId: string; sessionId: string }
	| { type: 'STOP_RECORDING' }
	| { type: 'GET_RECORDING_STATUS' }

// Messages from watcher iframe to script
type WatcherMessage =
	| { type: 'SCREEN_SHARING_ACTIVE'; projectId: string }
	| { type: 'SCREEN_SHARING_STOPPED' }
	| { type: 'RECORDING_STARTED'; startTime: number; sessionId: string }
	| { type: 'RECORDING_STOPPED' }
	| {
			type: 'RECORDING_DATA'
			videoBlob: string
			duration: number
			sessionId: string
	  }
	| { type: 'RECORDING_ERROR'; error: string }
	| { type: 'RECORDING_STATUS'; isRecording: boolean; duration: number }

interface ScreenSharingState {
	isActive: boolean
	projectId: string
	source?: 'recorder' | 'toolbar'
}

// Screen capture functionality moved from bugbasher-script
class ScreenCapture {
	private mediaRecorder: MediaRecorder | null = null
	private recordedChunks: Blob[] = []
	private stream: MediaStream | null = null
	private startTime: number = 0

	async startRecording(): Promise<void> {
		try {
			// Request screen sharing permission
			this.stream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					width: { ideal: 1920 },
					height: { ideal: 1080 },
					frameRate: { ideal: 30 },
				},
				audio: false, // Audio will be handled by recorder page if needed
			})

			// Set up MediaRecorder
			const options: MediaRecorderOptions = {
				mimeType: this.getSupportedMimeType(),
				videoBitsPerSecond: 2500000, // 2.5 Mbps
			}

			this.mediaRecorder = new MediaRecorder(this.stream, options)
			this.recordedChunks = []
			this.startTime = Date.now()

			// Handle data available
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.recordedChunks.push(event.data)
				}
			}

			// Handle recording stop
			this.mediaRecorder.onstop = () => {
				this.cleanup()
			}

			// Handle stream end (user stops sharing)
			const videoTrack = this.stream.getVideoTracks()[0]
			if (videoTrack) {
				videoTrack.addEventListener('ended', () => {
					if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
						this.stopRecording()
					}
				})
			}

			// Start recording
			this.mediaRecorder.start(1000) // Collect data every second
		} catch (error) {
			this.cleanup()
			throw this.handleScreenCaptureError(error)
		}
	}

	stopRecording(): Promise<Blob> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
				reject(new Error('No active recording to stop'))
				return
			}

			this.mediaRecorder.onstop = () => {
				try {
					const blob = new Blob(this.recordedChunks, {
						type: this.getSupportedMimeType(),
					})
					this.cleanup()
					resolve(blob)
				} catch (error) {
					reject(error)
				}
			}

			this.mediaRecorder.stop()
		})
	}

	getDuration(): number {
		return this.startTime > 0
			? Math.floor((Date.now() - this.startTime) / 1000)
			: 0
	}

	isRecording(): boolean {
		return this.mediaRecorder?.state === 'recording'
	}

	private getSupportedMimeType(): string {
		const types = [
			'video/webm;codecs=vp9',
			'video/webm;codecs=vp8',
			'video/webm',
			'video/mp4',
		]

		for (const type of types) {
			if (MediaRecorder.isTypeSupported(type)) {
				return type
			}
		}

		return 'video/webm' // Fallback
	}

	private handleScreenCaptureError(error: any): Error {
		if (error.name === 'NotAllowedError') {
			return new Error(
				'Screen sharing permission denied. Please allow screen sharing to record.',
			)
		} else if (error.name === 'NotSupportedError') {
			return new Error(
				'Screen sharing is not supported in this browser. Please use Chrome, Firefox, or Safari.',
			)
		} else if (error.name === 'NotFoundError') {
			return new Error('No screen sharing source available.')
		} else {
			return new Error(`Failed to start screen sharing: ${error.message}`)
		}
	}

	private cleanup(): void {
		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop())
			this.stream = null
		}
		this.mediaRecorder = null
		this.startTime = 0
	}
}

/**
 * Watcher Iframe Component
 *
 * Hidden iframe that facilitates cross-tab communication between:
 * - Recorder page (via BroadcastChannel)
 * - Embedded script/toolbar (via postMessage)
 *
 * Now also handles screen capture functionality delegated from the script
 *
 * This component implements Requirements 5.1, 5.2, 5.3, 5.4
 */
export default function WatcherPage() {
	const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const lastScreenSharingStateRef = useRef<string | null>(null)
	const screenCaptureRef = useRef<ScreenCapture | null>(null)
	const currentSessionIdRef = useRef<string | null>(null)

	useEffect(() => {
		// Initialize screen capture
		screenCaptureRef.current = new ScreenCapture()

		// Initialize BroadcastChannel listener (Subtask 4.1)
		initializeBroadcastChannel()

		// Initialize localStorage polling (Subtask 4.2)
		initializeLocalStoragePolling()

		// Initialize postMessage listener for script communication
		initializeScriptMessageListener()

		// Cleanup on unmount
		return () => {
			cleanup()
		}
	}, [])

	/**
	 * Subtask 4.1: Implement BroadcastChannel listener
	 * Set up channel subscription for 'bugbasher_channel'
	 * Handle SCREEN_SHARING_STARTED, RECORDING_STARTED, and other events
	 */
	const initializeBroadcastChannel = () => {
		try {
			// Create BroadcastChannel for 'bugbasher_channel'
			broadcastChannelRef.current = new BroadcastChannel('bugbasher_channel')

			// Listen for messages from recorder page
			broadcastChannelRef.current.addEventListener('message', (event) => {
				const message: BroadcastMessage = event.data

				console.log('Watcher: Received BroadcastChannel message:', message)

				// Handle different message types
				switch (message.type) {
					case 'SCREEN_SHARING_STARTED':
						handleScreenSharingStarted(message.projectId, message.source)
						break
					case 'SCREEN_SHARING_STOPPED':
						handleScreenSharingStopped()
						break
					case 'RECORDING_STARTED':
						handleRecordingStarted(message.startTime)
						break
					case 'RECORDING_STOPPED':
						handleRecordingStopped()
						break
					default:
						console.warn(
							'Watcher: Unknown BroadcastChannel message type:',
							message,
						)
				}
			})

			console.log('Watcher: BroadcastChannel initialized successfully')
		} catch (error) {
			console.error('Watcher: Failed to initialize BroadcastChannel:', error)
		}
	}

	/**
	 * Initialize postMessage listener for script communication
	 * Handle recording commands from the embedded script
	 */
	const initializeScriptMessageListener = () => {
		const handleMessage = async (event: MessageEvent) => {
			// Validate origin for security
			const allowedOrigins = ['*'] // In production, restrict this to your domains

			try {
				const message: ScriptToWatcherMessage = event.data

				console.log('Watcher: Received message from script:', message)

				switch (message.type) {
					case 'START_RECORDING':
						await handleStartRecording(message.projectId, message.sessionId)
						break
					case 'STOP_RECORDING':
						await handleStopRecording()
						break
					case 'GET_RECORDING_STATUS':
						handleGetRecordingStatus()
						break
					default:
						console.warn('Watcher: Unknown script message type:', message)
				}
			} catch (error) {
				console.error('Watcher: Error handling script message:', error)
				sendMessageToParent({
					type: 'RECORDING_ERROR',
					error: error instanceof Error ? error.message : 'Unknown error',
				})
			}
		}

		window.addEventListener('message', handleMessage)

		// Return cleanup function
		return () => {
			window.removeEventListener('message', handleMessage)
		}
	}

	/**
	 * Handle start recording request from script
	 */
	const handleStartRecording = async (projectId: string, sessionId: string) => {
		try {
			if (!screenCaptureRef.current) {
				throw new Error('Screen capture not initialized')
			}

			if (screenCaptureRef.current.isRecording()) {
				throw new Error('Recording already in progress')
			}

			currentSessionIdRef.current = sessionId

			// Start screen capture
			await screenCaptureRef.current.startRecording()

			const startTime = Date.now()

			// Notify script that recording started
			sendMessageToParent({
				type: 'RECORDING_STARTED',
				startTime,
				sessionId,
			})

			// Broadcast to other tabs
			if (broadcastChannelRef.current) {
				broadcastChannelRef.current.postMessage({
					type: 'RECORDING_STARTED',
					startTime,
					sessionId,
				})
			}

			console.log('Watcher: Recording started successfully')
		} catch (error) {
			console.error('Watcher: Failed to start recording:', error)
			sendMessageToParent({
				type: 'RECORDING_ERROR',
				error:
					error instanceof Error ? error.message : 'Failed to start recording',
			})
		}
	}

	/**
	 * Handle stop recording request from script
	 */
	const handleStopRecording = async () => {
		try {
			if (!screenCaptureRef.current) {
				throw new Error('Screen capture not initialized')
			}

			if (!screenCaptureRef.current.isRecording()) {
				throw new Error('No active recording to stop')
			}

			// Stop screen capture and get video blob
			const videoBlob = await screenCaptureRef.current.stopRecording()
			const duration = screenCaptureRef.current.getDuration()

			// Convert blob to base64 for transfer
			const videoData = await blobToBase64(videoBlob)

			// Send recording data to script
			sendMessageToParent({
				type: 'RECORDING_DATA',
				videoBlob: videoData,
				duration,
				sessionId: currentSessionIdRef.current || '',
			})

			// Notify that recording stopped
			sendMessageToParent({
				type: 'RECORDING_STOPPED',
			})

			// Broadcast to other tabs
			if (broadcastChannelRef.current) {
				broadcastChannelRef.current.postMessage({
					type: 'RECORDING_STOPPED',
				})
			}

			currentSessionIdRef.current = null
			console.log('Watcher: Recording stopped successfully')
		} catch (error) {
			console.error('Watcher: Failed to stop recording:', error)
			sendMessageToParent({
				type: 'RECORDING_ERROR',
				error:
					error instanceof Error ? error.message : 'Failed to stop recording',
			})
		}
	}

	/**
	 * Handle recording status request from script
	 */
	const handleGetRecordingStatus = () => {
		const isRecording = screenCaptureRef.current?.isRecording() || false
		const duration = screenCaptureRef.current?.getDuration() || 0

		sendMessageToParent({
			type: 'RECORDING_STATUS',
			isRecording,
			duration,
		})
	}

	/**
	 * Convert blob to base64 for postMessage transfer
	 */
	const blobToBase64 = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				const result = reader.result as string
				resolve(result)
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	}
	/**
	 * Subtask 4.2: Implement localStorage polling
	 * Poll for screen sharing state changes
	 * Detect recording source (toolbar vs recorder)
	 */
	const initializeLocalStoragePolling = () => {
		// Poll localStorage every 500ms for state changes
		pollingIntervalRef.current = setInterval(() => {
			try {
				// Check for screen sharing state in localStorage
				const screenSharingState = localStorage.getItem(
					'bugbasher_screen_sharing_state',
				)

				// Only process if state has changed
				if (screenSharingState !== lastScreenSharingStateRef.current) {
					lastScreenSharingStateRef.current = screenSharingState

					if (screenSharingState) {
						try {
							const state = JSON.parse(screenSharingState) as ScreenSharingState

							// Detect recording source and project ID
							if (state.isActive && state.projectId) {
								console.log(
									'Watcher: Detected screen sharing from localStorage:',
									state,
								)
								handleScreenSharingStarted(
									state.projectId,
									state.source || 'recorder',
								)
							} else {
								handleScreenSharingStopped()
							}
						} catch (parseError) {
							console.warn(
								'Watcher: Failed to parse screen sharing state:',
								parseError,
							)
						}
					} else {
						// Screen sharing stopped
						handleScreenSharingStopped()
					}
				}
			} catch (error) {
				console.error('Watcher: Error during localStorage polling:', error)
			}
		}, 500)

		console.log('Watcher: localStorage polling initialized')
	}

	/**
	 * Subtask 4.3: Implement postMessage relay to parent
	 * Forward BroadcastChannel events to script.js via postMessage
	 * Verify origin for security
	 */
	const sendMessageToParent = (message: WatcherMessage) => {
		try {
			// Verify we have a parent window
			if (!window.parent || window.parent === window) {
				console.warn('Watcher: No parent window available for postMessage')
				return
			}

			// Get the origin from the referrer or use current origin as fallback
			const targetOrigin = document.referrer
				? new URL(document.referrer).origin
				: '*'

			// Send message to parent (script.js)
			window.parent.postMessage(message, targetOrigin)

			console.log(
				'Watcher: Sent message to parent:',
				message,
				'origin:',
				targetOrigin,
			)
		} catch (error) {
			console.error('Watcher: Failed to send message to parent:', error)
		}
	}

	// Event handlers
	const handleScreenSharingStarted = (
		projectId: string,
		source: 'recorder' | 'toolbar',
	) => {
		const message: WatcherMessage = {
			type: 'SCREEN_SHARING_ACTIVE',
			projectId,
		}
		sendMessageToParent(message)
	}

	const handleScreenSharingStopped = () => {
		const message: WatcherMessage = {
			type: 'SCREEN_SHARING_STOPPED',
		}
		sendMessageToParent(message)
	}

	const handleRecordingStarted = (startTime: number, sessionId?: string) => {
		const message: WatcherMessage = {
			type: 'RECORDING_STARTED',
			startTime,
			sessionId: sessionId || '',
		}
		sendMessageToParent(message)
	}

	const handleRecordingStopped = () => {
		const message: WatcherMessage = {
			type: 'RECORDING_STOPPED',
		}
		sendMessageToParent(message)
	}

	const cleanup = () => {
		// Clean up BroadcastChannel
		if (broadcastChannelRef.current) {
			broadcastChannelRef.current.close()
			broadcastChannelRef.current = null
		}

		// Clean up polling interval
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current)
			pollingIntervalRef.current = null
		}

		// Clean up screen capture
		if (screenCaptureRef.current && screenCaptureRef.current.isRecording()) {
			screenCaptureRef.current.stopRecording().catch(console.error)
		}
		screenCaptureRef.current = null

		console.log('Watcher: Cleanup completed')
	}

	// This component is hidden and doesn't render any visible UI
	return (
		<div style={{ display: 'none' }}>
			{/* Hidden watcher iframe - handles cross-tab communication */}
			<span>BugBasher Watcher - Cross-tab Communication Handler</span>
		</div>
	)
}
