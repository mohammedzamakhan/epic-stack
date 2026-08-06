import type { BroadcastMessage, WatcherMessage, SessionData } from './types.js'
import { Logger } from './logger.js'

export class Communication {
	private broadcastChannel: BroadcastChannel | null = null
	private messageHandlers: Map<string, (data: any) => void> = new Map()
	private logger: Logger

	constructor(
		private apiOrigin: string,
		private debug = false,
	) {
		this.logger = new Logger(debug, 'BugBasher')
		this.initializeBroadcastChannel()
	}

	private initializeBroadcastChannel(): void {
		try {
			this.broadcastChannel = new BroadcastChannel('bugbasher_channel')

			this.broadcastChannel.addEventListener('message', (event) => {
				this.logger.log('Received broadcast message:', event.data)
				this.handleBroadcastMessage(event.data)
			})
		} catch (error) {
			// Keep console.warn for BroadcastChannel since it's a browser compatibility issue
			console.warn('BugBasher: BroadcastChannel not supported:', error)
		}
	}

	broadcastMessage(message: BroadcastMessage): void {
		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.postMessage(message)
				this.logger.log('Sent broadcast message:', message)
			} catch (error) {
				this.logger.warn('Failed to send broadcast message:', error)
			}
		}
	}

	private handleBroadcastMessage(message: BroadcastMessage): void {
		const handler = this.messageHandlers.get(message.type)
		if (handler) {
			handler(message)
		}
	}

	onMessage(type: string, handler: (data: any) => void): void {
		this.messageHandlers.set(type, handler)
	}

	offMessage(type: string): void {
		this.messageHandlers.delete(type)
	}

	storeSessionData(sessionId: string, data: SessionData): void {
		try {
			// Validate and sanitize session ID
			const sanitizedSessionId = this.sanitizeSessionId(sessionId)
			if (!sanitizedSessionId) {
				this.logger.warn('Invalid session ID provided for storage')
				return
			}

			const key = `bugbasher_session_${sanitizedSessionId}`
			localStorage.setItem(key, JSON.stringify(data))

			this.logger.log('Stored session data:', sanitizedSessionId)
		} catch (error) {
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				// Handle storage quota exceeded
				this.handleStorageQuotaExceeded(sessionId, data)
			} else {
				this.logger.error('Failed to store session data:', error)
			}
		}
	}

	getSessionData(sessionId: string): SessionData | null {
		try {
			// Validate and sanitize session ID
			const sanitizedSessionId = this.sanitizeSessionId(sessionId)
			if (!sanitizedSessionId) {
				return null
			}

			const key = `bugbasher_session_${sanitizedSessionId}`
			const data = localStorage.getItem(key)
			return data ? JSON.parse(data) : null
		} catch (error) {
			this.logger.error('Failed to retrieve session data:', error)
			return null
		}
	}

	clearSessionData(sessionId: string): void {
		try {
			// Validate and sanitize session ID
			const sanitizedSessionId = this.sanitizeSessionId(sessionId)
			if (!sanitizedSessionId) {
				return
			}

			const key = `bugbasher_session_${sanitizedSessionId}`
			localStorage.removeItem(key)
		} catch (error) {
			this.logger.error('Failed to clear session data:', error)
		}
	}

	openReviewPage(sessionData: SessionData): void {
		try {
			// Store session data
			this.storeSessionData(sessionData.sessionId, sessionData)

			// Open review page
			const reviewUrl = `${this.apiOrigin}/review/${sessionData.sessionId}`
			const reviewWindow = window.open(reviewUrl, '_blank')

			if (reviewWindow) {
				// Send data via postMessage after a short delay
				setTimeout(() => {
					try {
						reviewWindow.postMessage(
							{ type: 'SESSION_DATA', data: sessionData },
							new URL(this.apiOrigin).origin,
						)
					} catch (error) {
						this.logger.warn(
							'Failed to send session data via postMessage:',
							error,
						)
					}
				}, 1000)
			}
		} catch (error) {
			this.logger.error('Failed to open review page:', error)
			alert('Failed to open review page. Please try again.')
		}
	}

	private handleStorageQuotaExceeded(
		sessionId: string,
		data: SessionData,
	): void {
		this.logger.warn('Storage quota exceeded, attempting to reduce data size')

		try {
			// Clear old sessions first
			this.clearOldSessions()

			// Try storing without video data
			const reducedData: SessionData = {
				...data,
				videoData: null,
			}

			const sanitizedSessionId = this.sanitizeSessionId(sessionId)
			if (!sanitizedSessionId) {
				throw new Error('Invalid session ID')
			}

			const key = `bugbasher_session_${sanitizedSessionId}`
			localStorage.setItem(key, JSON.stringify(reducedData))

			// Notify user
			alert(
				'Recording saved without video due to storage limitations. Comments and session data are preserved.',
			)
		} catch (error) {
			this.logger.error('Failed to store even reduced session data:', error)
			alert(
				'Failed to save recording due to storage limitations. Please clear browser storage and try again.',
			)
		}
	}

	private sanitizeSessionId(sessionId: string): string | null {
		if (!sessionId || typeof sessionId !== 'string') {
			return null
		}

		// Trim whitespace and check if empty
		const trimmed = sessionId.trim()
		if (trimmed.length === 0) {
			return null
		}

		// Replace any characters that might cause issues in localStorage keys
		// Keep alphanumeric, hyphens, underscores
		const sanitized = trimmed.replace(/[^a-zA-Z0-9\-_]/g, '_')

		return sanitized
	}

	private clearOldSessions(): void {
		try {
			const keys = Object.keys(localStorage)
			const sessionKeys = keys.filter((key) =>
				key.startsWith('bugbasher_session_'),
			)

			// Sort by timestamp (assuming session IDs contain timestamps)
			sessionKeys.sort()

			// Remove oldest sessions (keep only last 5)
			const keysToRemove = sessionKeys.slice(0, -5)
			keysToRemove.forEach((key) => {
				localStorage.removeItem(key)
			})

			this.logger.log(`Cleared ${keysToRemove.length} old sessions`)
		} catch (error) {
			this.logger.error('Failed to clear old sessions:', error)
		}
	}

	destroy(): void {
		if (this.broadcastChannel) {
			this.broadcastChannel.close()
			this.broadcastChannel = null
		}

		this.messageHandlers.clear()
	}
}
