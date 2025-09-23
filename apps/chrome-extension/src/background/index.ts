import browser from 'webextension-polyfill'
import contentScript from '../content/index.tsx?script'
import {
	checkAuthCookie,
	setAuthStatus,
	MessageHandler,
	MessageType,
	type ExtensionMessage,
	type AuthStatus,
} from '../lib/auth'

// Auth status checking
const AUTH_CHECK_INTERVAL = 30000 // 30 seconds
let authCheckInterval: NodeJS.Timeout | null = null

const updateAuthStatus = async (): Promise<void> => {
	try {
		const isLoggedIn = await checkAuthCookie()
		const authStatus: AuthStatus = {
			isLoggedIn,
			lastChecked: Date.now(),
		}

		await setAuthStatus(authStatus)
		console.log('Auth status updated:', authStatus)
	} catch (error) {
		console.error('Error updating auth status:', error)
	}
}

// Content script injection helper
const injectContentScript = async (tabId: number): Promise<void> => {
	try {
		// Check if content script is already injected
		const response = await browser.tabs
			.sendMessage(tabId, {
				type: MessageType.CONTENT_SCRIPT_READY,
			})
			.catch(() => null)

		if (!response) {
			// Content script not present, inject it
			await browser.scripting.executeScript({
				target: { tabId },
				files: [contentScript],
			})
		}
	} catch (error) {
		console.error('Error injecting content script:', error)
	}
}

// Message handling
browser.runtime.onMessage.addListener(async (message: unknown) => {
	try {
		// Type guard to ensure message is our expected format
		if (!message || typeof message !== 'object' || !('type' in message)) {
			console.warn('Invalid message format:', message)
			return
		}

		const extensionMessage = message as ExtensionMessage

		switch (extensionMessage.type) {
			case MessageType.AUTH_STATUS_REQUEST:
				// Send current auth status back to requester
				await updateAuthStatus()
				break

			case MessageType.INJECT_CONTENT_SCRIPT:
				if (extensionMessage.tabId) {
					await injectContentScript(extensionMessage.tabId)
				}
				break

			case MessageType.DESTROY_CONTENT_SCRIPT:
				if (extensionMessage.tabId) {
					await browser.tabs
						.sendMessage(extensionMessage.tabId, {
							type: MessageType.CONTENT_SCRIPT_READY,
						})
						.catch(() => null)
				}
				break

			case MessageType.PING:
				return await Promise.resolve({})

			default:
				MessageHandler.handleMessage(extensionMessage)
		}
	} catch (error) {
		console.error('Error handling message:', error)
	}
})

// Tab update listener for auto-injection
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete' && tab.url) {
		try {
			const url = new URL(tab.url)

			// Only process http/https URLs
			if (!['http:', 'https:'].includes(url.protocol)) {
				return
			}

			const domain = url.hostname
			const result = await browser.storage.local.get([domain])

			if (result[domain]) {
				await injectContentScript(tabId)
			}
		} catch (error) {
			// Ignore URL parsing errors and tab access errors
			if (
				error instanceof Error &&
				!error.message?.includes('No tab with id')
			) {
				console.error('Error in tab update handler:', error)
			}
		}
	}
})

// Initialize
const initialize = async (): Promise<void> => {
	try {
		// Initial auth check
		await updateAuthStatus()

		// Set up periodic auth checking
		if (authCheckInterval) {
			clearInterval(authCheckInterval)
		}
		authCheckInterval = setInterval(updateAuthStatus, AUTH_CHECK_INTERVAL)

		console.log('Background script initialized')
	} catch (error) {
		console.error('Error initializing background script:', error)
	}
}

// Cleanup on extension shutdown
browser.runtime.onSuspend?.addListener(() => {
	if (authCheckInterval) {
		clearInterval(authCheckInterval)
		authCheckInterval = null
	}
})

// Start initialization
void initialize()
