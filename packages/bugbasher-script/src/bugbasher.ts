import type { BugBasherAPI, BugBasherConfig, SessionData } from './types.js'
import { markStart, markEnd } from './performance-monitor.js'
import { extensionBridge } from './extension-bridge.js'
import { Logger } from './logger.js'

// Lazy loaders for heavy components - using direct imports for now
async function loadOpenReplay(): Promise<typeof import('./openreplay.js')> {
	markStart('openReplayLoad')
	const module = await import('./openreplay.js')
	markEnd('openReplayLoad')
	return module
}

async function loadToolbar(): Promise<typeof import('./toolbar-react.js')> {
	markStart('toolbarLoad')
	const module = await import('./toolbar-react.js')
	markEnd('toolbarLoad')
	return module
}

async function loadCommentSystem(): Promise<
	typeof import('./comment-system.js')
> {
	markStart('commentSystemLoad')
	const module = await import('./comment-system.js')
	markEnd('commentSystemLoad')
	return module
}

async function loadCommunication(): Promise<
	typeof import('./communication.js')
> {
	markStart('communicationLoad')
	const module = await import('./communication.js')
	markEnd('communicationLoad')
	return module
}

export class BugBasher implements BugBasherAPI {
	private config: Required<BugBasherConfig>
	private logger: Logger
	private openReplay: any = null
	private toolbar: any = null
	private commentSystem: any = null
	private communication: any = null
	private recordingStartTime: number = 0
	private currentSessionId: string | null = null
	private isRecording: boolean = false

	// Lazy loading flags
	private openReplayLoaded = false
	private toolbarLoaded = false
	private commentSystemLoaded = false
	private communicationLoaded = false

	constructor(config: BugBasherConfig) {
		this.config = {
			projectId: config.projectId,
			apiOrigin: config.apiOrigin || window.location.origin,
			debug: config.debug || false,
			uiDetection: config.uiDetection || {},
		}

		// Initialize logger with debug setting
		this.logger = new Logger(this.config.debug, 'BugBasher')

		// Initialize communication immediately for cross-tab coordination
		this.initializeCommunication()
	}

	private async initializeCommunication(): Promise<void> {
		if (this.communicationLoaded) return

		try {
			const { Communication } = await loadCommunication()
			this.communication = new Communication(
				this.config.apiOrigin,
				this.config.debug,
			)
			this.communicationLoaded = true

			// Set up cross-tab communication handlers
			this.setupCommunicationHandlers()
		} catch (error) {
			this.logger.error('Failed to load communication module:', error)
		}
	}

	private async initializeOpenReplay(): Promise<void> {
		if (this.openReplayLoaded) return

		try {
			const { OpenReplayIntegration } = await loadOpenReplay()
			this.openReplay = new OpenReplayIntegration(
				this.config.projectId,
				this.config.apiOrigin,
				this.config.debug,
				this.config.uiDetection,
			)
			this.openReplayLoaded = true

			await this.openReplay.initialize()
			this.logger.log('OpenReplay initialized for recording session')
		} catch (error) {
			this.logger.error('Failed to initialize OpenReplay:', error)
		}
	}

	private async initializeCommentSystem(): Promise<void> {
		if (this.commentSystemLoaded) return

		try {
			const { CommentSystem } = await loadCommentSystem()
			this.commentSystem = new CommentSystem((comment) => {
				this.logger.log('Comment added:', comment)
				// Track comment event in OpenReplay (only if initialized)
				if (this.openReplay?.isInitialized()) {
					this.openReplay.trackEvent('bugbasher_comment_added', {
						element: comment.element.selector,
						relativeTime: comment.relativeTime,
					})
				}
			}, this.config.debug)
			this.commentSystemLoaded = true
		} catch (error) {
			this.logger.error('Failed to load comment system:', error)
		}
	}

	private setupCommunicationHandlers(): void {
		if (!this.communication) return

		// Handle screen sharing started from recorder page
		this.communication.onMessage('SCREEN_SHARING_ACTIVE', (data: any) => {
			this.logger.log('Screen sharing active from recorder')
			// Show toolbar without recording controls
			if (!this.toolbar) {
				this.showToolbar(data.projectId)
			}
		})

		// Handle screen sharing stopped
		this.communication.onMessage('SCREEN_SHARING_STOPPED', () => {
			this.logger.log('Screen sharing stopped')
			this.isRecording = false
			if (this.toolbar) {
				this.toolbar.setRecording(false)
			}
		})

		// Handle recording started from recorder page
		this.communication.onMessage('RECORDING_STARTED', async (data: any) => {
			this.logger.log('Recording started from recorder page')

			this.recordingStartTime = data.startTime
			this.currentSessionId = data.sessionId
			this.isRecording = true

			// Track event in OpenReplay (if loaded)
			if (this.openReplay?.isInitialized()) {
				this.openReplay.trackEvent('bugbasher_recording_started', {
					source: 'toolbar',
					method: 'recorder_page',
				})
			}

			// Update toolbar state
			if (this.toolbar) {
				this.toolbar.setRecording(true)
			}
		})

		// Handle recording stopped from recorder page
		this.communication.onMessage('RECORDING_STOPPED', () => {
			this.logger.log('Recording stopped from recorder page')
			this.isRecording = false

			// Stop OpenReplay when recording ends
			if (this.openReplay?.isInitialized()) {
				this.openReplay.stop()
			}

			// Update toolbar state
			if (this.toolbar) {
				this.toolbar.setRecording(false)
			}
		})
	}

	// Public API methods

	async showToolbar(projectId: string): Promise<void> {
		if (this.toolbar) {
			this.toolbar.show()
			return
		}

		if (!this.toolbarLoaded) {
			try {
				const { Toolbar } = await loadToolbar()
				this.toolbar = new Toolbar(
					projectId,
					() => this.startRecording(),
					() => this.stopRecording(),
					() => this.startCommenting(),
					() => this.stopCommenting(),
					this.config.debug,
				)
				this.toolbarLoaded = true
			} catch (error) {
				this.logger.error('Failed to load toolbar:', error)
				return
			}
		}

		this.toolbar.show()
	}

	async hideToolbar(): Promise<void> {
		if (this.toolbar) {
			this.toolbar.hide()
		}
	}

	async startRecording(): Promise<void> {
		try {
			if (this.isRecording) {
				throw new Error('Recording already in progress')
			}

			// Initialize OpenReplay only when recording starts
			await this.initializeOpenReplay()

			const sessionId = this.openReplay?.getSessionId()

			// Try to use Chrome extension for recording (no popup required)
			const extensionAvailable = await extensionBridge.detect(
				1000,
				this.config.debug,
			)

			if (
				extensionAvailable &&
				extensionBridge.getCapabilities()?.videoRecording
			) {
				this.logger.log('Starting recording via Chrome extension')

				const result = await extensionBridge.startRecording()

				if (result.ok) {
					this.isRecording = true
					this.recordingStartTime = Date.now()
					this.currentSessionId = sessionId || this.generateSessionId()

					// Update toolbar to show recording state
					if (this.toolbar) {
						this.toolbar.setRecording(true)
					}

					// Listen for recording events from extension
					extensionBridge.onRecordingEvent('RECORDING_STOPPED', () => {
						this.isRecording = false
						if (this.toolbar) {
							this.toolbar.setRecording(false)
						}
					})

					extensionBridge.onRecordingEvent('RECORDING_ERROR', (payload) => {
						this.logger.error('Recording error:', payload)
						this.isRecording = false
						if (this.toolbar) {
							this.toolbar.setRecording(false)
						}
					})

					this.logger.log('Recording started via extension')
					return
				}

				// Extension recording failed
				this.logger.error('Extension recording failed:', result.error)
				throw new Error(
					result.error?.message || 'Failed to start recording via extension',
				)
			}

			// Fallback: Open recorder page in new tab ONLY when extension is NOT available
			const recorderUrl = new URL(
				`${this.config.apiOrigin}/recorder/${encodeURIComponent(this.config.projectId)}`,
			)
			recorderUrl.searchParams.set('sessionId', sessionId as string)
			recorderUrl.searchParams.set('source', 'toolbar')
			recorderUrl.searchParams.set('autoStart', 'true')
			recorderUrl.searchParams.set('returnUrl', window.location.href)

			const recorderWindow = window.open(recorderUrl.toString(), '_blank')

			if (!recorderWindow) {
				throw new Error(
					'Failed to open recorder window. Please allow popups for this site.',
				)
			}

			this.logger.log('Recorder page opened:', recorderUrl.toString())
		} catch (error) {
			this.logger.error('Failed to start recording:', error)
			if (this.toolbar) {
				this.toolbar.setRecording(false)
			}
			throw error
		}
	}

	async stopRecording(): Promise<SessionData> {
		try {
			// Ensure comment system is loaded for session data
			await this.initializeCommentSystem()

			let videoData: string | null = null
			let duration = 0
			let recordingMethod = 'recorder_page'

			// Try to stop recording via extension if it was started that way
			if (extensionBridge.isExtensionAvailable()) {
				this.logger.log('Stopping recording via Chrome extension')

				const result = await extensionBridge.stopRecording()

				if (result.ok) {
					videoData = result.payload.videoData
					duration = result.payload.duration
					recordingMethod = 'extension'

					this.logger.log(
						'Recording stopped via extension, duration:',
						duration,
					)
				} else {
					this.logger.warn('Extension stop recording failed:', result.error)
				}
			}

			// Calculate duration from start time if not provided by extension
			if (duration === 0 && this.recordingStartTime) {
				duration = (Date.now() - this.recordingStartTime) / 1000
			}

			const sessionData: SessionData = {
				sessionId: this.currentSessionId || this.generateSessionId(),
				openReplaySessionId: this.openReplay?.getSessionToken() || '',
				openReplaySessionHash: '',
				videoData: videoData,
				duration: duration,
				comments: this.commentSystem?.getComments() || [],
				url: window.location.href,
				projectId: this.config.projectId,
				userAgent: navigator.userAgent,
				recordingStartTime: this.recordingStartTime,
				source: 'toolbar',
			}

			// Track event in OpenReplay (only if initialized)
			if (this.openReplay?.isInitialized()) {
				this.openReplay.trackEvent('bugbasher_recording_stopped', {
					commentsCount: sessionData.comments.length,
					method: recordingMethod,
					duration: duration,
				})
			}

			// Stop OpenReplay when recording ends
			if (this.openReplay?.isInitialized()) {
				this.openReplay.stop()
			}

			// Clear state
			if (this.commentSystem) {
				this.commentSystem.clearComments()
			}
			this.recordingStartTime = 0
			this.currentSessionId = null
			this.isRecording = false

			// Update toolbar to show stopped state
			if (this.toolbar) {
				this.toolbar.setRecording(false)
			}

			this.logger.log('Recording stopped', {
				method: recordingMethod,
				duration,
				hasVideo: !!videoData,
			})

			// Open recorder page to review the recording
			if (videoData) {
				// Try to store data in the extension background for retrieval
				let capabilities = extensionBridge.getCapabilities()
				let extensionId = capabilities?.extensionId

				if (!extensionId) {
					this.logger.log('Extension ID missing in cache, re-detecting...')
					// Force re-detection to get fresh capabilities
					await extensionBridge.detect(1000)
					capabilities = extensionBridge.getCapabilities()
					extensionId = capabilities?.extensionId
				}

				this.logger.log('Final extension capabilities:', capabilities)
				this.logger.log('Final extension ID:', extensionId)

				if (extensionId) {
					this.logger.log(
						'Storing session data in extension background',
						extensionId,
					)
					await extensionBridge.storeRecordingData(
						sessionData.sessionId,
						sessionData,
					)
				}

				// Prepare for cross-origin data transfer via postMessage (fallback)
				// ... (keep existing handshake logic)

				const handleReviewHandshake = (event: MessageEvent) => {
					const data = event.data

					// Ignore messages that aren't for us
					if (!data || data.type !== 'BB_REVIEW_READY') return

					this.logger.log('Received handshake message', {
						origin: event.origin,
						expectedOrigin: this.config.apiOrigin,
					})

					// Verify origin matches apiOrigin
					if (event.origin !== this.config.apiOrigin) {
						this.logger.warn(
							`Origin mismatch. Expected ${this.config.apiOrigin}, got ${event.origin}`,
						)
						// return; // Commenting out strict return for debugging
					}

					if (data.sessionId === sessionData.sessionId) {
						// Send the session data to the recorder page
						this.logger.log('Sending session data to recorder page', {
							targetOrigin: event.origin,
						})

						;(event.source as Window).postMessage(
							{
								type: 'BB_REVIEW_DATA',
								payload: sessionData,
							},
							'*',
						) // Use * to ensure delivery during dev/debug, though specific origin is better for prod

						// Clean up listener after successful transfer
						window.removeEventListener('message', handleReviewHandshake)
					}
				}

				// Listen for the handshake from the new window
				window.addEventListener('message', handleReviewHandshake)

				// Open recorder page with session ID
				const reviewUrl = new URL(
					`${this.config.apiOrigin}/recorder/${encodeURIComponent(this.config.projectId)}`,
				)
				reviewUrl.searchParams.set('sessionId', sessionData.sessionId)
				reviewUrl.searchParams.set('source', 'extension')
				reviewUrl.searchParams.set('review', 'true')
				if (extensionId) {
					reviewUrl.searchParams.set('extensionId', extensionId)
				}

				window.open(reviewUrl.toString(), 'BugBasherReview')
			}

			return sessionData
		} catch (error) {
			this.logger.error('Failed to stop recording:', error)
			if (this.toolbar) {
				this.toolbar.setRecording(false)
			}
			throw error
		}
	}

	getIsRecording(): boolean {
		return this.isRecording
	}

	private async startCommenting(): Promise<void> {
		try {
			// Initialize comment system only when needed
			await this.initializeCommentSystem()

			const recordingStartTime = this.recordingStartTime || Date.now()
			this.commentSystem.startCommenting(recordingStartTime)

			if (this.toolbar) {
				this.toolbar.setCommenting(true)
			}

			// Track event in OpenReplay (only if initialized)
			if (this.openReplay?.isInitialized()) {
				this.openReplay.trackEvent('bugbasher_commenting_started', {})
			}

			this.logger.log('Commenting started')
		} catch (error) {
			this.logger.error('Failed to start commenting:', error)
			throw error
		}
	}

	private async stopCommenting(): Promise<void> {
		try {
			if (!this.commentSystem) return

			this.commentSystem.stopCommenting()

			if (this.toolbar) {
				this.toolbar.setCommenting(false)
			}

			// If we have comments but no recording, open review page
			const comments = this.commentSystem.getComments()
			if (comments.length > 0 && !this.isRecording) {
				const sessionData: SessionData = {
					sessionId: this.generateSessionId(),
					openReplaySessionId: this.openReplay?.getSessionToken() || '',
					openReplaySessionHash: '',
					videoData: null, // Comments-only mode
					duration: 0,
					comments,
					url: window.location.href,
					projectId: this.config.projectId,
					userAgent: navigator.userAgent,
					recordingStartTime: this.recordingStartTime || Date.now(),
					source: 'toolbar',
				}

				if (this.communication) {
					this.communication.openReviewPage(sessionData)
				}
				this.commentSystem.clearComments()
			}

			this.logger.log('Commenting stopped')
		} catch (error) {
			this.logger.error('Failed to stop commenting:', error)
			throw error
		}
	}

	async setUser(userId: string, metadata?: Record<string, any>): Promise<void> {
		if (!this.openReplay?.isInitialized()) {
			this.logger.warn(
				'OpenReplay not initialized yet. User will be set when recording starts.',
			)
			return
		}
		this.openReplay.setUser(userId, metadata)
	}

	async trackEvent(name: string, payload: Record<string, any>): Promise<void> {
		if (!this.openReplay?.isInitialized()) {
			this.logger.warn(
				'OpenReplay not initialized yet. Event will be ignored:',
				name,
			)
			return
		}
		this.openReplay.trackEvent(name, payload)
	}

	async reportIssue(
		title: string,
		payload: Record<string, any>,
	): Promise<void> {
		if (!this.openReplay?.isInitialized()) {
			this.logger.warn(
				'OpenReplay not initialized yet. Issue report will be ignored:',
				title,
			)
			return
		}
		this.openReplay.trackEvent('bugbasher_issue_reported', {
			title,
			...payload,
		})
	}

	getSessionToken(): string | null {
		if (!this.openReplay?.isInitialized()) {
			return null
		}
		return this.openReplay.getSessionToken()
	}

	getSessionURL(): string | null {
		if (!this.openReplay?.isInitialized()) {
			return null
		}
		return this.openReplay.getSessionURL()
	}

	// Helper methods

	private generateSessionId(): string {
		return `bb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
	}
}
