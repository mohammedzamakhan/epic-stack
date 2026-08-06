import type { SessionData, Comment } from './types'
import { Logger } from './logger.js'

export class SessionManager {
	private projectId: string
	private logger: Logger

	constructor(projectId: string, debug: boolean = false) {
		this.projectId = projectId
		this.logger = new Logger(debug, 'BugBasher')
	}

	async assembleSessionData(
		videoBlob: Blob | null,
		comments: Comment[],
		openReplaySessionId: string | null,
		openReplaySessionHash: string | null,
		recordingStartTime: number | null,
		source: 'toolbar' | 'recorder' = 'toolbar',
	): Promise<SessionData> {
		const sessionId = this.generateSessionId()

		// Convert video blob to base64 if present
		let videoData: string | null = null
		if (videoBlob) {
			try {
				videoData = await this.blobToBase64(videoBlob)
			} catch (error) {
				this.logger.error('Failed to convert video to base64:', error)
				// Continue without video data
			}
		}

		// Calculate duration
		const duration = recordingStartTime
			? Math.floor((Date.now() - recordingStartTime) / 1000)
			: 0

		const sessionData: SessionData = {
			sessionId,
			openReplaySessionId: openReplaySessionId || '',
			openReplaySessionHash: openReplaySessionHash || '',
			videoData,
			duration,
			comments: [...comments],
			url: window.location.href,
			projectId: this.projectId,
			userAgent: navigator.userAgent,
			recordingStartTime: recordingStartTime || Date.now(),
			source,
		}

		return sessionData
	}

	async storeSessionData(sessionData: SessionData): Promise<void> {
		const storageKey = `bugbasher_session_${sessionData.sessionId}`

		try {
			// Try to store the complete session data
			const serializedData = JSON.stringify(sessionData)
			localStorage.setItem(storageKey, serializedData)

			this.logger.log(
				'Session data stored successfully:',
				sessionData.sessionId,
			)
		} catch (error) {
			// Handle quota exceeded error
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				this.logger.warn(
					'localStorage quota exceeded, attempting to store without video',
				)
				await this.handleStorageQuotaExceeded(sessionData, storageKey)
			} else {
				this.logger.error('Failed to store session data:', error)
				throw error
			}
		}
	}

	private async handleStorageQuotaExceeded(
		sessionData: SessionData,
		storageKey: string,
	): Promise<void> {
		try {
			// Clear old sessions first
			this.clearOldSessions()

			// Try again with the original data
			const serializedData = JSON.stringify(sessionData)
			localStorage.setItem(storageKey, serializedData)

			this.logger.log('Session data stored after cleanup')
		} catch (error) {
			// If still failing, store without video data
			this.logger.warn(
				'Storing session data without video due to storage constraints',
			)

			const reducedSessionData: SessionData = {
				...sessionData,
				videoData: null,
			}

			try {
				const reducedData = JSON.stringify(reducedSessionData)
				localStorage.setItem(storageKey, reducedData)

				// Notify user about data loss
				this.showStorageWarning()
			} catch (finalError) {
				this.logger.error(
					'Failed to store even reduced session data:',
					finalError,
				)
				throw new Error(
					'Unable to store session data due to storage constraints',
				)
			}
		}
	}

	private clearOldSessions(): void {
		const keys = Object.keys(localStorage)
		const sessionKeys = keys.filter((key) =>
			key.startsWith('bugbasher_session_'),
		)

		// Sort by timestamp (assuming session IDs contain timestamps)
		sessionKeys.sort()

		// Remove oldest sessions (keep only the 5 most recent)
		const keysToRemove = sessionKeys.slice(
			0,
			Math.max(0, sessionKeys.length - 5),
		)

		keysToRemove.forEach((key) => {
			try {
				localStorage.removeItem(key)
				this.logger.log('Removed old session:', key)
			} catch (error) {
				this.logger.warn('Failed to remove old session:', key, error)
			}
		})
	}

	private showStorageWarning(): void {
		// Simple notification - could be enhanced with better UI
		const message =
			'Video data was too large to store locally. Session saved without video.'

		if (typeof window !== 'undefined' && window.alert) {
			setTimeout(() => {
				window.alert(`BugBasher: ${message}`)
			}, 100)
		} else {
			this.logger.warn(`${message}`)
		}
	}

	async openReviewPage(sessionData: SessionData): Promise<void> {
		const apiOrigin = window.location.origin
		const reviewUrl = `${apiOrigin}/review/${sessionData.sessionId}`

		try {
			// Open review page in new tab
			const reviewWindow = window.open(reviewUrl, '_blank')

			if (!reviewWindow) {
				throw new Error('Failed to open review page - popup blocked')
			}

			// Send session data via postMessage
			const sendData = () => {
				try {
					reviewWindow.postMessage(
						{
							type: 'BUGBASHER_SESSION_DATA',
							sessionData,
						},
						apiOrigin,
					)

					this.logger.log('Session data sent to review page')
				} catch (error) {
					this.logger.error(
						'Failed to send session data via postMessage:',
						error,
					)
				}
			}

			// Send data when the window loads
			reviewWindow.addEventListener('load', sendData)

			// Also send after a short delay as fallback
			setTimeout(sendData, 1000)
		} catch (error) {
			this.logger.error('Failed to open review page:', error)

			// Fallback: navigate to review page in current tab
			window.location.href = reviewUrl
		}
	}

	retrieveSessionData(sessionId: string): SessionData | null {
		const storageKey = `bugbasher_session_${sessionId}`

		try {
			const serializedData = localStorage.getItem(storageKey)
			if (!serializedData) {
				return null
			}

			const sessionData = JSON.parse(serializedData) as SessionData
			return sessionData
		} catch (error) {
			this.logger.error('Failed to retrieve session data:', error)
			return null
		}
	}

	clearSessionData(sessionId: string): void {
		const storageKey = `bugbasher_session_${sessionId}`

		try {
			localStorage.removeItem(storageKey)
			this.logger.log('Session data cleared:', sessionId)
		} catch (error) {
			this.logger.warn('Failed to clear session data:', error)
		}
	}

	private generateSessionId(): string {
		// Generate a unique session ID
		const timestamp = Date.now()
		const random = Math.random().toString(36).substring(2, 15)
		return `${timestamp}_${random}`
	}

	private blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()

			reader.onload = () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result)
				} else {
					reject(new Error('Failed to convert blob to base64'))
				}
			}

			reader.onerror = () => {
				reject(new Error('FileReader error'))
			}

			reader.readAsDataURL(blob)
		})
	}

	// Utility method to estimate storage usage
	getStorageUsage(): { used: number; available: number; percentage: number } {
		try {
			let used = 0

			// Calculate used storage
			for (let key in localStorage) {
				if (localStorage.hasOwnProperty(key)) {
					used += localStorage[key].length
				}
			}

			// Estimate available storage (5MB is typical localStorage limit)
			const estimated = 5 * 1024 * 1024 // 5MB in bytes
			const percentage = (used / estimated) * 100

			return {
				used,
				available: estimated - used,
				percentage: Math.min(percentage, 100),
			}
		} catch (error) {
			this.logger.warn('Failed to calculate storage usage:', error)
			return { used: 0, available: 0, percentage: 0 }
		}
	}

	// List all stored sessions
	listStoredSessions(): string[] {
		try {
			const keys = Object.keys(localStorage)
			return keys
				.filter((key) => key.startsWith('bugbasher_session_'))
				.map((key) => key.replace('bugbasher_session_', ''))
		} catch (error) {
			this.logger.warn('Failed to list stored sessions:', error)
			return []
		}
	}
}
