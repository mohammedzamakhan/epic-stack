import { brand } from '@repo/config/brand'
import browser from 'webextension-polyfill'
import { logger, debugMessage } from './debug'

const domain = brand.name.toLowerCase().replace(/\s+/g, '-') + '.me'

export const AUTH_STATUS_KEY = 'auth_status'
export const DOMAIN = `.${domain}`
export const APP_URL = `https://app.${domain}:2999`

export interface AuthStatus {
	isLoggedIn: boolean
	lastChecked: number
}

// Message types for consistent communication
export enum MessageType {
	AUTH_STATUS_CHANGED = 'AUTH_STATUS_CHANGED',
	AUTH_STATUS_REQUEST = 'AUTH_STATUS_REQUEST',
	CONTENT_SCRIPT_READY = 'CONTENT_SCRIPT_READY',
	INJECT_CONTENT_SCRIPT = 'INJECT_CONTENT_SCRIPT',
	DESTROY_CONTENT_SCRIPT = 'DESTROY_CONTENT_SCRIPT',
	PING = 'PING',
	OPEN_POPUP = 'OPEN_POPUP',
}

export interface ExtensionMessage {
	type: MessageType
	payload?: any
	tabId?: number
}

// Centralized message handler
export class MessageHandler {
	private static listeners = new Map<
		MessageType,
		Set<(message: ExtensionMessage) => void>
	>()

	static addListener(
		type: MessageType,
		callback: (message: ExtensionMessage) => void,
	) {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set())
		}
		this.listeners.get(type)!.add(callback)
	}

	static removeListener(
		type: MessageType,
		callback: (message: ExtensionMessage) => void,
	) {
		const listeners = this.listeners.get(type)
		if (listeners) {
			listeners.delete(callback)
		}
	}

	static async sendMessage(
		message: ExtensionMessage,
		tabId?: number,
	): Promise<any> {
		try {
			debugMessage('sent', message, tabId ? `tab-${tabId}` : 'runtime')

			if (tabId) {
				return await browser.tabs.sendMessage(tabId, message)
			} else {
				return await browser.runtime.sendMessage(message)
			}
		} catch (error) {
			logger.warn('Message sending failed:', error)
			return null
		}
	}

	static handleMessage(message: ExtensionMessage) {
		debugMessage('received', message, 'handler')

		const listeners = this.listeners.get(message.type)
		if (listeners) {
			listeners.forEach((callback) => {
				try {
					callback(message)
				} catch (error) {
					logger.error('Message handler error:', error)
				}
			})
		}
	}
}

export const getAuthStatus = async (): Promise<AuthStatus | null> => {
	try {
		const result = await browser.storage.local.get([AUTH_STATUS_KEY])
		return (result[AUTH_STATUS_KEY] as AuthStatus) || null
	} catch (error) {
		console.error('Error getting auth status:', error)
		return null
	}
}

export const setAuthStatus = async (authStatus: AuthStatus): Promise<void> => {
	try {
		await browser.storage.local.set({ [AUTH_STATUS_KEY]: authStatus })

		// Notify all listeners about the change
		const message: ExtensionMessage = {
			type: MessageType.AUTH_STATUS_CHANGED,
			payload: authStatus,
		}

		// Broadcast to all tabs
		const tabs = await browser.tabs.query({})
		tabs.forEach((tab) => {
			if (tab.id) {
				void MessageHandler.sendMessage(message, tab.id)
			}
		})
	} catch (error) {
		console.error('Error setting auth status:', error)
	}
}

export const checkAuthCookie = async (): Promise<boolean> => {
	try {
		const cookies = await browser.cookies.getAll({
			domain: DOMAIN,
			name: 'en_session',
		})
		return cookies.length > 0 && !!cookies[0].value
	} catch (error) {
		console.error('Error checking auth cookie:', error)
		return false
	}
}
