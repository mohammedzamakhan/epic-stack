/**
 * Bridge Content Script - Communication relay between page and extension
 *
 * Simplified flow:
 * - Page script (bugbasher-script) sends messages via window.postMessage
 * - Bridge forwards to background via chrome.runtime.sendMessage
 * - Background handles recording via offscreen document
 * - Results sent back through the same channel
 */

import browser from 'webextension-polyfill'

const EXTENSION_VERSION = '1.0.0'

type BBMessageRequest = {
	bb: 1
	direction: 'page->ext'
	kind: 'req'
	type: string
	requestId: string
	payload?: unknown
}

type BBMessageResponse = {
	bb: 1
	direction: 'ext->page'
	kind: 'res'
	requestId: string
} & (
	| { ok: true; payload?: unknown }
	| { ok: false; error: { message: string; code?: string } }
)

type BBMessageEvent = {
	bb: 1
	direction: 'ext->page'
	kind: 'event'
	type: string
	payload?: unknown
}

interface BackgroundResponse {
	ok: boolean
	payload?: unknown
	error?: { message: string; code?: string }
}

function sendResponseToPage(response: BBMessageResponse): void {
	window.postMessage(response, window.location.origin)
}

function sendEventToPage(type: string, payload?: unknown): void {
	const event: BBMessageEvent = {
		bb: 1,
		direction: 'ext->page',
		kind: 'event',
		type,
		payload,
	}
	window.postMessage(event, window.location.origin)
}

interface LocalRecorderState {
	mediaRecorder: MediaRecorder | null
	recordedChunks: Blob[]
	startTime: number
	isProcessingStop: boolean
}

const localState: LocalRecorderState = {
	mediaRecorder: null,
	recordedChunks: [],
	startTime: 0,
	isProcessingStop: false,
}

async function handlePageRequest(message: BBMessageRequest): Promise<void> {
	const { type, requestId, payload } = message

	try {
		switch (type) {
			case 'HELLO': {
				sendResponseToPage({
					bb: 1,
					direction: 'ext->page',
					kind: 'res',
					requestId,
					ok: true,
					payload: {
						version: EXTENSION_VERSION,
						capabilities: {
							screenshot: true,
							videoRecording: true,
							version: EXTENSION_VERSION,
							extensionId: chrome.runtime.id,
						},
					},
				})
				break
			}

			case 'BB_STORE_RECORDING_DATA':
			case 'BB_INIT_SESSION_LOGS':
			case 'BB_APPEND_NETWORK_REQUEST':
			case 'BB_APPEND_CONSOLE_MESSAGE':
			case 'BB_APPEND_USER_ACTION':
			case 'BB_APPEND_NAVIGATION_EVENT':
			case 'BB_GET_SESSION_LOGS': {
				const response = (await browser.runtime.sendMessage({
					type,
					payload,
				})) as BackgroundResponse

				sendResponseToPage({
					bb: 1,
					direction: 'ext->page',
					kind: 'res',
					requestId,
					ok: response?.ok ?? false,
					...(response?.ok
						? { payload: response.payload }
						: { error: response?.error }),
				} as BBMessageResponse)
				break
			}

			case 'CAPTURE_SCREENSHOT': {
				const response = (await browser.runtime.sendMessage({
					type: 'BB_CAPTURE_SCREENSHOT',
					payload,
				})) as BackgroundResponse

				sendResponseToPage({
					bb: 1,
					direction: 'ext->page',
					kind: 'res',
					requestId,
					ok: response?.ok ?? false,
					...(response?.ok
						? { payload: response.payload }
						: {
								error: response?.error || {
									message: 'Screenshot failed',
									code: 'CAPTURE_FAILED',
								},
							}),
				} as BBMessageResponse)
				break
			}

			case 'START_RECORDING': {
				// 1. Get streamId from background
				const response = (await browser.runtime.sendMessage({
					type: 'BB_START_RECORDING',
					payload,
				})) as BackgroundResponse & { payload?: { streamId: string } }

				if (!response.ok || !response.payload?.streamId) {
					sendResponseToPage({
						bb: 1,
						direction: 'ext->page',
						kind: 'res',
						requestId,
						ok: false,
						error: response.error || {
							message: 'Failed to get stream ID',
							code: 'START_FAILED',
						},
					})
					return
				}

				try {
					// 2. Start local recording using the streamId
					const stream = await navigator.mediaDevices.getUserMedia({
						audio: {
							mandatory: {
								chromeMediaSource: 'desktop',
								chromeMediaSourceId: response.payload.streamId,
							},
						} as MediaTrackConstraints,
						video: {
							mandatory: {
								chromeMediaSource: 'desktop',
								chromeMediaSourceId: response.payload.streamId,
								maxWidth: 1920,
								maxHeight: 1080,
							},
						} as MediaTrackConstraints,
					})

					localState.recordedChunks = []
					localState.startTime = Date.now()
					localState.isProcessingStop = false

					const mimeType = MediaRecorder.isTypeSupported(
						'video/webm;codecs=vp9',
					)
						? 'video/webm;codecs=vp9'
						: 'video/webm'

					localState.mediaRecorder = new MediaRecorder(stream, {
						mimeType,
						videoBitsPerSecond: 2500000,
					})

					localState.mediaRecorder.ondataavailable = (event) => {
						if (event.data.size > 0) {
							localState.recordedChunks.push(event.data)
						}
					}

					// Listen for when recording is stopped externally (e.g., browser controls)
					localState.mediaRecorder.onstop = () => {
						// This handles the case when user stops via browser's recording indicator
						console.log('[BugBasher Bridge] Recording stopped (onstop event)')
					}

					// Listen for track ended events (when user clicks browser's stop button)
					stream.getTracks().forEach((track) => {
						track.onended = () => {
							console.log(
								'[BugBasher Bridge] Track ended externally:',
								track.kind,
							)

							// Prevent duplicate processing (both video and audio tracks might fire)
							if (localState.isProcessingStop) {
								console.log(
									'[BugBasher Bridge] Already processing stop, skipping',
								)
								return
							}
							localState.isProcessingStop = true

							// If any track ends and we're still "recording", handle the stop
							if (
								localState.mediaRecorder &&
								localState.mediaRecorder.state !== 'inactive'
							) {
								// MediaRecorder is still active, stop it gracefully
								try {
									localState.mediaRecorder.stop()
								} catch (e) {
									console.log(
										'[BugBasher Bridge] MediaRecorder already stopped',
									)
								}
							}

							// Give MediaRecorder a moment to flush any remaining data
							setTimeout(() => {
								// Process the recording and notify the page
								const duration = (Date.now() - localState.startTime) / 1000
								if (localState.recordedChunks.length > 0) {
									const blob = new Blob(localState.recordedChunks, {
										type: localState.mediaRecorder?.mimeType || 'video/webm',
									})
									const reader = new FileReader()
									reader.onloadend = () => {
										const base64data = reader.result as string
										sendEventToPage('RECORDING_STOPPED', {
											videoData: base64data,
											duration,
										})
										// Clean up
										localState.mediaRecorder = null
										localState.recordedChunks = []
										localState.isProcessingStop = false
									}
									reader.onerror = () => {
										sendEventToPage('RECORDING_STOPPED', {
											videoData: '',
											duration,
										})
										localState.mediaRecorder = null
										localState.recordedChunks = []
										localState.isProcessingStop = false
									}
									reader.readAsDataURL(blob)
								} else {
									sendEventToPage('RECORDING_STOPPED', {
										videoData: '',
										duration,
									})
									localState.mediaRecorder = null
									localState.recordedChunks = []
									localState.isProcessingStop = false
								}
							}, 500) // Wait 500ms for MediaRecorder to flush
						}
					})

					// Start recording
					localState.mediaRecorder.start(1000)

					sendResponseToPage({
						bb: 1,
						direction: 'ext->page',
						kind: 'res',
						requestId,
						ok: true,
					})

					// Notify page about start
					sendEventToPage('RECORDING_STARTED', {
						startTime: localState.startTime,
					})
				} catch (e) {
					console.error('[BugBasher Bridge] Local recording failed:', e)
					sendResponseToPage({
						bb: 1,
						direction: 'ext->page',
						kind: 'res',
						requestId,
						ok: false,
						error: {
							message:
								e instanceof Error ? e.message : 'Local recording init failed',
							code: 'LOCAL_RECORDING_ERROR',
						},
					})
				}
				break
			}

			case 'STOP_RECORDING': {
				if (
					!localState.mediaRecorder ||
					localState.mediaRecorder.state === 'inactive'
				) {
					sendResponseToPage({
						bb: 1,
						direction: 'ext->page',
						kind: 'res',
						requestId,
						ok: false,
						error: { message: 'No active recording', code: 'NOT_RECORDING' },
					})
					return
				}

				const stopPromise = new Promise<{
					videoData: string
					duration: number
				}>((resolve, reject) => {
					if (!localState.mediaRecorder) return reject('No recorder')

					localState.mediaRecorder.onstop = () => {
						const duration = (Date.now() - localState.startTime) / 1000
						const blob = new Blob(localState.recordedChunks, {
							type: localState.mediaRecorder?.mimeType || 'video/webm',
						})

						const reader = new FileReader()
						reader.onloadend = () => {
							const base64data = reader.result as string
							resolve({ videoData: base64data, duration })
						}
						reader.onerror = () => reject('Failed to read blob')
						reader.readAsDataURL(blob)

						// Stop all tracks
						localState.mediaRecorder?.stream
							.getTracks()
							.forEach((t) => t.stop())
						localState.mediaRecorder = null
						localState.recordedChunks = []
					}

					localState.mediaRecorder.stop()
				})

				try {
					const result = await stopPromise

					// Notify background to cleanup if needed
					await browser.runtime.sendMessage({
						type: 'BB_STOP_RECORDING',
						payload,
					})

					sendResponseToPage({
						bb: 1,
						direction: 'ext->page',
						kind: 'res',
						requestId,
						ok: true,
						payload: result,
					})

					// Send event
					sendEventToPage('RECORDING_STOPPED', result)
				} catch (e) {
					sendResponseToPage({
						bb: 1,
						direction: 'ext->page',
						kind: 'res',
						requestId,
						ok: false,
						error: {
							message: 'Failed to process recording',
							code: 'STOP_FAILED',
						},
					})
				}
				break
			}

			default:
				sendResponseToPage({
					bb: 1,
					direction: 'ext->page',
					kind: 'res',
					requestId,
					ok: false,
					error: {
						message: `Unknown message type: ${type}`,
						code: 'UNKNOWN_TYPE',
					},
				})
		}
	} catch (error) {
		console.error('[BugBasher Bridge] Error handling request:', error)
		sendResponseToPage({
			bb: 1,
			direction: 'ext->page',
			kind: 'res',
			requestId,
			ok: false,
			error: {
				message: error instanceof Error ? error.message : 'Unknown error',
				code: 'INTERNAL_ERROR',
			},
		})
	}
}

function handleMessage(event: MessageEvent): void {
	if (event.source !== window) return
	if (event.origin !== window.location.origin) return

	const data = event.data
	if (!data || data.bb !== 1) return
	if (data.direction !== 'page->ext') return
	if (data.kind !== 'req') return

	void handlePageRequest(data as BBMessageRequest)
}

// Listen for events from background script
browser.runtime.onMessage.addListener((message: unknown) => {
	if (!message || typeof message !== 'object' || !('type' in message)) {
		return
	}

	const msg = message as { type: string; payload?: unknown }

	// Forward BB_EVENT_* messages to page
	if (msg.type.startsWith('BB_EVENT_')) {
		const eventType = msg.type.replace('BB_EVENT_', '')
		sendEventToPage(eventType, msg.payload)
	}
})

window.addEventListener('message', handleMessage)

console.log('[BugBasher Bridge] Content script loaded')

export { sendEventToPage }
