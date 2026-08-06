/**
 * Offscreen Document for Tab Recording
 *
 * In MV3, service workers cannot use MediaRecorder or hold media streams.
 * This offscreen document handles the actual recording using the stream
 * provided via chrome.tabCapture.
 */

interface RecordingMessage {
	type: string
	streamId?: string
	tabId?: number
	sourceType?: 'tab' | 'desktop'
}

interface OffscreenRecordingState {
	isRecording: boolean
	mediaRecorder: MediaRecorder | null
	recordedChunks: Blob[]
	startTime: number
	tabId: number | null
}

const state: OffscreenRecordingState = {
	isRecording: false,
	mediaRecorder: null,
	recordedChunks: [],
	startTime: 0,
	tabId: null,
}

async function startRecording(
	streamId: string,
	tabId: number,
	sourceType: 'tab' | 'desktop' = 'tab',
): Promise<void> {
	console.log(
		'[Offscreen] startRecording called with streamId:',
		streamId?.substring(0, 20) + '...',
		'tabId:',
		tabId,
		'sourceType:',
		sourceType,
	)

	if (state.isRecording) {
		throw new Error('Recording already in progress')
	}

	try {
		console.log('[Offscreen] Getting media stream...')
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				mandatory: {
					chromeMediaSource: sourceType,
					chromeMediaSourceId: streamId,
				},
			} as MediaTrackConstraints,
			video: {
				mandatory: {
					chromeMediaSource: sourceType,
					chromeMediaSourceId: streamId,
					maxWidth: 1920,
					maxHeight: 1080,
					maxFrameRate: 30,
				},
			} as MediaTrackConstraints,
		})

		state.recordedChunks = []
		state.tabId = tabId
		state.startTime = Date.now()

		// Wait a brief moment to ensure stream is ready
		await new Promise((resolve) => setTimeout(resolve, 100))

		const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
			? 'video/webm;codecs=vp9'
			: 'video/webm'

		state.mediaRecorder = new MediaRecorder(stream, {
			mimeType,
			videoBitsPerSecond: 2500000,
		})

		state.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				state.recordedChunks.push(event.data)
			}
		}

		state.mediaRecorder.onstop = async () => {
			const duration = (Date.now() - state.startTime) / 1000
			const blob = new Blob(state.recordedChunks, { type: mimeType })

			const reader = new FileReader()
			reader.onloadend = () => {
				const base64data = reader.result as string

				chrome.runtime.sendMessage({
					type: 'OFFSCREEN_RECORDING_COMPLETE',
					payload: {
						videoData: base64data,
						duration,
						tabId: state.tabId,
					},
				})

				state.isRecording = false
				state.mediaRecorder = null
				state.recordedChunks = []
				state.tabId = null
			}
			reader.readAsDataURL(blob)

			stream.getTracks().forEach((track) => track.stop())
		}

		state.mediaRecorder.onerror = (event) => {
			console.error('MediaRecorder error:', event)
			chrome.runtime.sendMessage({
				type: 'OFFSCREEN_RECORDING_ERROR',
				payload: {
					error: 'Recording failed',
					tabId: state.tabId,
				},
			})
		}

		state.mediaRecorder.start(1000)
		state.isRecording = true
		console.log('[Offscreen] MediaRecorder started successfully')

		chrome.runtime.sendMessage({
			type: 'OFFSCREEN_RECORDING_STARTED',
			payload: {
				startTime: state.startTime,
				tabId: state.tabId,
			},
		})

		console.log('[Offscreen] Recording started')
	} catch (error) {
		console.error('[Offscreen] Failed to start recording:', error)
		throw error
	}
}

function stopRecording(): void {
	if (!state.isRecording || !state.mediaRecorder) {
		console.warn('[Offscreen] No recording in progress')
		return
	}

	state.mediaRecorder.stop()
	console.log('[Offscreen] Recording stopped')
}

function getStatus(): { isRecording: boolean; duration: number } {
	return {
		isRecording: state.isRecording,
		duration: state.isRecording ? (Date.now() - state.startTime) / 1000 : 0,
	}
}

chrome.runtime.onMessage.addListener(
	(message: RecordingMessage, _sender, sendResponse) => {
		switch (message.type) {
			case 'OFFSCREEN_START_RECORDING':
				if (message.streamId && message.tabId) {
					startRecording(message.streamId, message.tabId, message.sourceType)
						.then(() => sendResponse({ ok: true }))
						.catch((error) => sendResponse({ ok: false, error: error.message }))
					return true
				}
				sendResponse({ ok: false, error: 'Missing streamId or tabId' })
				break

			case 'OFFSCREEN_STOP_RECORDING':
				stopRecording()
				sendResponse({ ok: true })
				break

			case 'OFFSCREEN_GET_STATUS':
				sendResponse({ ok: true, payload: getStatus() })
				break

			case 'PING':
				sendResponse({ ok: true })
				break

			default:
				break
		}

		return false
	},
)

console.log('[Offscreen] Document loaded and ready')
