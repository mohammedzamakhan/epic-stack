/**
 * Background Service Worker
 *
 * Simplified architecture:
 * - Handles messages from content scripts and page scripts
 * - Uses RecordingManager for tab capture recording
 * - Manages auth status and script injection
 */

import browser from 'webextension-polyfill'
import bridgeScript from '../content/bridge.ts?script'
import contentScript from '../content/index.tsx?script'
import {
	checkAuthCookie,
	setAuthStatus,
	MessageHandler,
	MessageType,
	type ExtensionMessage,
	type AuthStatus,
} from '../lib/auth'
import { getConfig } from '../lib/config'
import {
	startRecording,
	startRecordingWithStreamId,
	stopRecording,
	handleRecordingComplete,
	handleRecordingError,
	resetRecordingState,
	isTabRecording,
} from './recording-manager'
import {
	storeRecordingData,
	getRecordingData,
	initSessionLogs,
	appendNetworkRequest,
	appendConsoleMessage,
	appendUserAction,
	appendNavigationEvent,
	getSessionLogs,
} from './recording-storage'

interface BugBasherMessage {
	type: string
	payload?: unknown
}

// Auth status checking
const AUTH_CHECK_INTERVAL = 30000
let authCheckInterval: ReturnType<typeof setInterval> | null = null

async function updateAuthStatus(): Promise<void> {
	try {
		const isLoggedIn = await checkAuthCookie()
		const authStatus: AuthStatus = {
			isLoggedIn,
			lastChecked: Date.now(),
		}
		await setAuthStatus(authStatus)
		console.log('[Background] Auth status updated:', authStatus)
	} catch (error) {
		console.error('[Background] Error updating auth status:', error)
	}
}

// Script injection
async function injectBridgeScript(tabId: number): Promise<void> {
	try {
		await browser.scripting.executeScript({
			target: { tabId },
			files: [bridgeScript],
		})
		console.log('[Background] Bridge script injected into tab:', tabId)
	} catch (error) {
		console.error('[Background] Error injecting bridge script:', error)
	}
}

async function injectBugBasherScript(
	tabId: number,
	projectId?: string,
): Promise<void> {
	try {
		const config = await getConfig()
		const scriptUrl = config.bugbasherScriptUrl

		console.log('[Background] Injecting BugBasher script from:', scriptUrl)

		await browser.scripting.executeScript({
			target: { tabId },
			world: 'MAIN',
			func: (
				url: string,
				apiOrigin: string,
				projId: string | null,
				debug: boolean,
			) => {
				if (document.querySelector('script[data-bugbasher-injected]')) {
					console.log('[BugBasher] Script already injected')
					return
				}

				const script = document.createElement('script')
				script.src = url
				script.type = 'module'
				script.async = true
				script.setAttribute('data-bugbasher-injected', 'true')

				if (projId) {
					script.setAttribute('data-project-id', projId)
				}
				script.setAttribute('data-api-origin', apiOrigin)
				script.setAttribute('data-debug', String(debug))

				script.onload = () => {
					console.log('[BugBasher] Script loaded successfully')
					setTimeout(() => {
						if (
							projId &&
							typeof (window as any).BugBasher?.showToolbar === 'function'
						) {
							;(window as any).BugBasher.showToolbar(projId)
						}
					}, 100)
				}

				script.onerror = (error) => {
					console.error('[BugBasher] Failed to load script:', error)
				}

				document.head.appendChild(script)
			},
			args: [scriptUrl, config.apiOrigin, projectId ?? null, config.debug],
		})

		console.log(
			'[Background] BugBasher script injection initiated for tab:',
			tabId,
		)
	} catch (error) {
		console.error('[Background] Error injecting BugBasher script:', error)
	}
}

async function injectContentScript(tabId: number): Promise<void> {
	try {
		const response = await browser.tabs
			.sendMessage(tabId, { type: MessageType.CONTENT_SCRIPT_READY })
			.catch(() => null)

		if (!response) {
			await browser.scripting.executeScript({
				target: { tabId },
				files: [contentScript],
			})
		}
	} catch (error) {
		console.error('[Background] Error injecting content script:', error)
	}
}

// Screenshot capture
async function captureScreenshot(): Promise<{
	ok: boolean
	payload?: string
	error?: { message: string; code: string }
}> {
	try {
		const dataUrl = await browser.tabs.captureVisibleTab(undefined, {
			format: 'jpeg',
			quality: 100,
		})
		return { ok: true, payload: dataUrl }
	} catch (error) {
		console.error('[Background] Screenshot capture failed:', error)
		return {
			ok: false,
			error: {
				message: error instanceof Error ? error.message : 'Capture failed',
				code: 'CAPTURE_ERROR',
			},
		}
	}
}

// Message handling
browser.runtime.onMessage.addListener(
	(
		message: unknown,
		sender: browser.Runtime.MessageSender,
	): Promise<unknown> | undefined => {
		if (!message || typeof message !== 'object' || !('type' in message)) {
			return undefined
		}

		const msg = message as BugBasherMessage | ExtensionMessage

		// Handle offscreen document messages
		if (msg.type.startsWith('OFFSCREEN_')) {
			switch (msg.type) {
				case 'OFFSCREEN_RECORDING_COMPLETE': {
					const payload = (msg as BugBasherMessage).payload as {
						videoData: string
						duration: number
					}
					handleRecordingComplete(payload)
					return undefined
				}

				case 'OFFSCREEN_RECORDING_ERROR': {
					const payload = (msg as BugBasherMessage).payload as { error: string }
					handleRecordingError(payload.error)
					return undefined
				}

				case 'OFFSCREEN_RECORDING_STARTED': {
					console.log('[Background] Recording started in offscreen document')
					return undefined
				}
			}
			return undefined
		}

		// Handle tab ID request
		if (msg.type === 'GET_CURRENT_TAB_ID') {
			return Promise.resolve({ tabId: sender.tab?.id })
		}

		// Handle BugBasher bridge messages
		if (msg.type.startsWith('BB_')) {
			switch (msg.type) {
				case 'BB_CAPTURE_SCREENSHOT':
					return captureScreenshot()

				case 'BB_START_RECORDING': {
					const tabId = sender.tab?.id
					if (!tabId) {
						return Promise.resolve({
							ok: false,
							error: { message: 'No tab ID available', code: 'NO_TAB' },
						})
					}
					return startRecording(tabId)
				}

				case 'BB_STOP_RECORDING':
					return stopRecording()

				case 'BB_START_RECORDING_WITH_STREAM': {
					// Called from popup with pre-obtained streamId (has user gesture)
					const payload = (msg as BugBasherMessage).payload as
						{ streamId?: string; tabId?: number } | undefined
					const streamId = payload?.streamId || (msg as any).streamId
					const targetTabId = payload?.tabId || (msg as any).tabId
					if (!streamId || !targetTabId) {
						return Promise.resolve({
							ok: false,
							error: {
								message: 'Missing streamId or tabId',
								code: 'INVALID_PARAMS',
							},
						})
					}
					return startRecordingWithStreamId(streamId, targetTabId)
				}

				case 'BB_STORE_RECORDING_DATA': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
						data: any
					}
					if (payload?.sessionId && payload?.data) {
						storeRecordingData(payload.sessionId, payload.data)
						return Promise.resolve({ ok: true })
					}
					return Promise.resolve({ ok: false, error: 'Invalid payload' })
				}

				case 'BB_GET_RECORDING_DATA': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
					}
					const sessionId = payload?.sessionId || (msg as any).sessionId

					if (sessionId) {
						const data = getRecordingData(sessionId)
						return Promise.resolve({ ok: true, payload: data })
					}
					return Promise.resolve({ ok: false, error: 'Session not found' })
				}

				case 'BB_INIT_SESSION_LOGS': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
						projectId: string
						url: string
						userAgent: string
						startTime: number
					}
					if (payload?.sessionId) {
						initSessionLogs(
							payload.sessionId,
							payload.projectId,
							payload.url,
							payload.userAgent,
							payload.startTime,
						)
						return Promise.resolve({ ok: true })
					}
					return Promise.resolve({ ok: false, error: 'Invalid payload' })
				}

				case 'BB_APPEND_NETWORK_REQUEST': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
						data: unknown
					}
					if (payload?.sessionId && payload?.data) {
						const success = appendNetworkRequest(
							payload.sessionId,
							payload.data as Parameters<typeof appendNetworkRequest>[1],
						)
						return Promise.resolve({ ok: success })
					}
					return Promise.resolve({ ok: false, error: 'Invalid payload' })
				}

				case 'BB_APPEND_CONSOLE_MESSAGE': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
						data: unknown
					}
					if (payload?.sessionId && payload?.data) {
						const success = appendConsoleMessage(
							payload.sessionId,
							payload.data as Parameters<typeof appendConsoleMessage>[1],
						)
						return Promise.resolve({ ok: success })
					}
					return Promise.resolve({ ok: false, error: 'Invalid payload' })
				}

				case 'BB_APPEND_USER_ACTION': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
						data: unknown
					}
					if (payload?.sessionId && payload?.data) {
						const success = appendUserAction(
							payload.sessionId,
							payload.data as Parameters<typeof appendUserAction>[1],
						)
						return Promise.resolve({ ok: success })
					}
					return Promise.resolve({ ok: false, error: 'Invalid payload' })
				}

				case 'BB_APPEND_NAVIGATION_EVENT': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
						data: unknown
					}
					if (payload?.sessionId && payload?.data) {
						const success = appendNavigationEvent(
							payload.sessionId,
							payload.data as Parameters<typeof appendNavigationEvent>[1],
						)
						return Promise.resolve({ ok: success })
					}
					return Promise.resolve({ ok: false, error: 'Invalid payload' })
				}

				case 'BB_GET_SESSION_LOGS': {
					const payload = (msg as BugBasherMessage).payload as {
						sessionId: string
					}
					if (payload?.sessionId) {
						const logs = getSessionLogs(payload.sessionId)
						return Promise.resolve({ ok: true, payload: logs })
					}
					return Promise.resolve({ ok: false, error: 'Session not found' })
				}

				default:
					return Promise.resolve({
						ok: false,
						error: { message: 'Unknown message type', code: 'UNKNOWN_TYPE' },
					})
			}
		}

		// Handle extension messages
		const extensionMessage = msg as ExtensionMessage

		switch (extensionMessage.type) {
			case MessageType.AUTH_STATUS_REQUEST:
				void updateAuthStatus()
				break

			case MessageType.INJECT_CONTENT_SCRIPT:
				if (extensionMessage.tabId) {
					void injectBridgeScript(extensionMessage.tabId)
					void injectBugBasherScript(
						extensionMessage.tabId,
						extensionMessage.payload?.projectId as string | undefined,
					)
					void injectContentScript(extensionMessage.tabId)
				}
				break

			case MessageType.DESTROY_CONTENT_SCRIPT:
				if (extensionMessage.tabId) {
					void browser.tabs
						.sendMessage(extensionMessage.tabId, {
							type: MessageType.CONTENT_SCRIPT_READY,
						})
						.catch(() => null)
				}
				break

			case MessageType.PING:
				return Promise.resolve({})

			default:
				MessageHandler.handleMessage(extensionMessage)
		}

		return undefined
	},
)

// Handle external messages (from web pages)
browser.runtime.onMessageExternal.addListener(
	(
		message: unknown,
		sender: browser.Runtime.MessageSender,
	): Promise<unknown> | undefined => {
		if (!message || typeof message !== 'object' || !('type' in message)) {
			return undefined
		}

		const msg = message as BugBasherMessage
		console.log(
			'[Background] Received external message:',
			msg.type,
			'from',
			sender.url,
		)

		if (msg.type === 'BB_GET_RECORDING_DATA') {
			const payload = (msg as BugBasherMessage).payload as { sessionId: string }
			const sessionId = payload?.sessionId || (msg as any).sessionId

			if (sessionId) {
				const data = getRecordingData(sessionId)
				console.log(
					'[Background] Retrieving external data for session:',
					sessionId,
					!!data,
				)
				return Promise.resolve({ ok: true, payload: data })
			}
			return Promise.resolve({ ok: false, error: 'Session not found' })
		}

		if (msg.type === 'BB_GET_SESSION_LOGS') {
			const payload = (msg as BugBasherMessage).payload as { sessionId: string }
			const sessionId = payload?.sessionId || (msg as any).sessionId

			if (sessionId) {
				const logs = getSessionLogs(sessionId)
				console.log(
					'[Background] Retrieving external session logs:',
					sessionId,
					!!logs,
				)
				return Promise.resolve({ ok: true, payload: logs })
			}
			return Promise.resolve({ ok: false, error: 'Session not found' })
		}

		return undefined
	},
)

// Tab lifecycle listeners
browser.tabs.onRemoved.addListener((tabId) => {
	if (isTabRecording(tabId)) {
		console.log('[Background] Recording tab closed, resetting state')
		resetRecordingState()
	}
})

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	// Reset recording if tab navigates
	if (isTabRecording(tabId) && changeInfo.status === 'loading') {
		console.log('[Background] Recording tab navigated, resetting state')
		resetRecordingState()
	}

	// Auto-inject bridge script on page load
	if (changeInfo.status === 'complete' && tab.url) {
		try {
			const url = new URL(tab.url)

			if (!['http:', 'https:'].includes(url.protocol)) {
				return
			}

			// Always inject bridge for bugbasher-script communication
			await injectBridgeScript(tabId)

			// Check if domain is enabled
			const domain = url.hostname
			const result = await browser.storage.local.get([domain])

			if (result[domain]) {
				const domainConfig = result[domain]
				const projectId =
					typeof domainConfig === 'object' &&
					domainConfig !== null &&
					'projectId' in domainConfig
						? (domainConfig as { projectId: string }).projectId
						: 'yex1po9ch9ucxhmjj12301dv'

				await injectBugBasherScript(tabId, 'yex1po9ch9ucxhmjj12301dv')
				await injectContentScript(tabId)
			}
		} catch (error) {
			if (
				error instanceof Error &&
				!error.message?.includes('No tab with id')
			) {
				console.error('[Background] Error in tab update handler:', error)
			}
		}
	}
})

// Initialize
async function initialize(): Promise<void> {
	try {
		await updateAuthStatus()

		if (authCheckInterval) {
			clearInterval(authCheckInterval)
		}
		authCheckInterval = setInterval(updateAuthStatus, AUTH_CHECK_INTERVAL)

		console.log('[Background] Service worker initialized')
	} catch (error) {
		console.error('[Background] Error initializing:', error)
	}
}

browser.runtime.onSuspend?.addListener(() => {
	if (authCheckInterval) {
		clearInterval(authCheckInterval)
		authCheckInterval = null
	}
})

void initialize()
