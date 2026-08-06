/**
 * Recording Manager - Simplified tab capture recording
 *
 * Handles the full recording lifecycle:
 * 1. Page requests recording via content bridge
 * 2. Background gets streamId and starts offscreen document recording
 * 3. Offscreen document handles MediaRecorder
 * 4. Background sends video data back to page
 */

import browser from 'webextension-polyfill'

interface BackgroundRecordingState {
	isRecording: boolean
	startTime: number | null
	tabId: number | null
}

const state: BackgroundRecordingState = {
	isRecording: false,
	startTime: null,
	tabId: null,
}

let pendingRecordingData: { videoData: string; duration: number } | null = null

/**
 * Wait for offscreen document to be ready by pinging it
 */
async function waitForOffscreen(timeoutMs: number = 2000): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeoutMs) {
		try {
			const response = await browser.runtime.sendMessage({ type: 'PING' })
			if (response?.ok) {
				return
			}
		} catch (e) {
			// Ignore error (receiving end does not exist) and retry
		}

		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	throw new Error(
		`Offscreen document failed to respond to ping within ${timeoutMs}ms`,
	)
}

/**
 * Ensure offscreen document exists for MediaRecorder
 */
async function ensureOffscreenDocument(): Promise<void> {
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
	})

	if (existingContexts.length > 0) {
		try {
			// Check if existing document is responsive
			await waitForOffscreen(1000)
			return
		} catch (e) {
			console.warn(
				'[RecordingManager] Existing offscreen document unresponsive, recreating...',
			)
			try {
				await chrome.offscreen.closeDocument()
			} catch (closeError) {
				console.warn(
					'[RecordingManager] Failed to close offscreen document:',
					closeError,
				)
			}
		}
	}

	await chrome.offscreen.createDocument({
		url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
		reasons: [chrome.offscreen.Reason.USER_MEDIA],
		justification: 'Recording tab video and audio',
	})

	await waitForOffscreen(5000)
}

/**
 * Get media stream ID for tab capture using desktopCapture (avoids user gesture requirement for background script)
 */
async function getMediaStreamId(tabId: number): Promise<string> {
	return new Promise((resolve, reject) => {
		// Use native chrome.tabs.get to ensure we have the exact object structure expected by desktopCapture
		chrome.tabs.get(tabId, (tab) => {
			if (chrome.runtime.lastError) {
				return reject(
					new Error(
						`Failed to get tab ${tabId}: ${chrome.runtime.lastError.message}`,
					),
				)
			}
			if (!tab) {
				return reject(new Error(`Tab ${tabId} not found`))
			}

			console.log('[RecordingManager] tab object:', JSON.stringify(tab))

			try {
				// Use desktopCapture to prompt user for permission
				// Trying standard sources. 'audio' sometimes causes issues if not supported or configured.
				const sources: chrome.desktopCapture.DesktopCaptureSourceType[] = [
					'screen',
					'window',
					'tab',
				]

				const id = chrome.desktopCapture.chooseDesktopMedia(
					sources,
					tab,
					(streamId: string) => {
						if (chrome.runtime.lastError) {
							reject(new Error(chrome.runtime.lastError.message))
						} else if (!streamId) {
							reject(new Error('Selection cancelled or failed'))
						} else {
							resolve(streamId)
						}
					},
				)
			} catch (error) {
				reject(error)
			}
		})
	})
}

/**
 * Start recording with an already-obtained stream ID (from popup with user gesture)
 */
export async function startRecordingWithStreamId(
	streamId: string,
	tabId: number,
): Promise<{ ok: boolean; error?: { message: string; code: string } }> {
	if (state.isRecording) {
		return {
			ok: false,
			error: {
				message: 'Recording already in progress',
				code: 'ALREADY_RECORDING',
			},
		}
	}

	try {
		console.log(
			'[RecordingManager] Starting recording with streamId for tab:',
			tabId,
		)

		// Ensure offscreen document is ready
		await ensureOffscreenDocument()

		// Tell offscreen document to start recording
		// Note: We assume streamId came from a source compatible with 'tab' or 'desktop'.
		// If it came from tabCapture.getMediaStreamId (e.g. popup), it is 'tab'.
		// If it came from desktopCapture, it is 'desktop'.
		// Since this function is called from popup (usually tabCapture), we default to 'tab' or let offscreen handle it?
		// Actually, startRecordingWithStreamId is legacy/popup path. It likely uses tabCapture.
		// Let's assume 'tab' for now or update the caller to specify.
		// For safety, we can try 'tab' first or just default to 'tab' as before.

		const response = await browser.runtime.sendMessage({
			type: 'OFFSCREEN_START_RECORDING',
			streamId,
			tabId,
			sourceType: 'tab', // Assume tab capture for popup-initiated streams
		})

		if (!response?.ok) {
			throw new Error(
				response?.error || 'Failed to start recording in offscreen',
			)
		}

		// Update state
		state.isRecording = true
		state.startTime = Date.now()
		state.tabId = tabId

		// Notify content script
		await browser.tabs
			.sendMessage(tabId, {
				type: 'BB_EVENT_RECORDING_STARTED',
				payload: { startTime: state.startTime },
			})
			.catch(() => null)

		console.log('[RecordingManager] Recording started successfully')
		return { ok: true }
	} catch (error) {
		console.error('[RecordingManager] Start recording failed:', error)
		state.isRecording = false
		state.startTime = null
		state.tabId = null
		return {
			ok: false,
			error: {
				message:
					error instanceof Error ? error.message : 'Start recording failed',
				code: 'START_ERROR',
			},
		}
	}
}

/**
 * Start recording a tab (obtains stream ID internally - requires user gesture in extension context)
 */
export async function startRecording(tabId: number): Promise<{
	ok: boolean
	payload?: { streamId: string }
	error?: { message: string; code: string }
}> {
	if (state.isRecording) {
		return {
			ok: false,
			error: {
				message: 'Recording already in progress',
				code: 'ALREADY_RECORDING',
			},
		}
	}

	try {
		console.log('[RecordingManager] V2 Flow - Getting streamId for tab:', tabId)

		// Get stream ID using desktopCapture (interactive picker)
		const streamId = await getMediaStreamId(tabId)
		console.log(
			'[RecordingManager] Got streamId:',
			streamId?.substring(0, 20) + '...',
		)

		// We return the streamId to the content script so it can record locally.
		// This bypasses the issue where offscreen documents cannot use stream IDs granted to a specific tab.
		return { ok: true, payload: { streamId } }
	} catch (error) {
		console.error('[RecordingManager] Start recording failed:', error)
		return {
			ok: false,
			error: {
				message:
					error instanceof Error ? error.message : 'Start recording failed',
				code: 'START_ERROR',
			},
		}
	}
}

/**
 * Stop recording and return video data
 */
export async function stopRecording(): Promise<{
	ok: boolean
	payload?: { videoData: string; duration: number }
	error?: { message: string; code: string }
}> {
	// If the background is not managing the recording (because we handed it off to the content script),
	// we just acknowledge the stop request. The content script handles the actual stopping.
	console.log('[RecordingManager] Stop recording requested')

	if (state.isRecording) {
		// Legacy offscreen cleanup if we ever support it
		try {
			await browser.runtime.sendMessage({ type: 'OFFSCREEN_STOP_RECORDING' })
		} catch {}
		resetRecordingState()
	}

	return { ok: true }
}

/**
 * Handle recording data from offscreen document
 */
export function handleRecordingComplete(payload: {
	videoData: string
	duration: number
}): void {
	pendingRecordingData = payload
}

/**
 * Handle recording error from offscreen document
 */
export function handleRecordingError(error: string): void {
	console.error('[RecordingManager] Recording error:', error)
	state.isRecording = false
	state.startTime = null
	state.tabId = null
}

/**
 * Wait for recording data from offscreen document
 */
function waitForRecordingData(
	timeoutMs: number,
): Promise<{ videoData: string; duration: number }> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error('Timeout waiting for recording data'))
		}, timeoutMs)

		const checkData = setInterval(() => {
			if (pendingRecordingData) {
				clearTimeout(timeout)
				clearInterval(checkData)
				const data = pendingRecordingData
				pendingRecordingData = null
				resolve(data)
			}
		}, 100)
	})
}

/**
 * Get current recording status
 */
export function getRecordingStatus(): BackgroundRecordingState {
	return { ...state }
}

/**
 * Reset recording state (e.g., when tab is closed)
 */
export function resetRecordingState(): void {
	state.isRecording = false
	state.startTime = null
	state.tabId = null
}

/**
 * Check if a specific tab is being recorded
 */
export function isTabRecording(tabId: number): boolean {
	return state.isRecording && state.tabId === tabId
}
