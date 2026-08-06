/**
 * ExtensionBridge - Communication bridge between the bugbasher script and Chrome extension
 *
 * Handles bidirectional communication using postMessage for script ↔ content-script,
 * with automatic detection and fallback when extension is not available.
 */

import { Logger } from './logger.js'

export interface ExtensionCapabilities {
	screenshot: boolean
	videoRecording: boolean
	version: string
	extensionId?: string
}

export interface ExtensionBridgeResponse<T = unknown> {
	ok: true
	payload: T
}

export interface ExtensionBridgeError {
	ok: false
	error: { message: string; code?: string }
}

export type ExtensionBridgeResult<T = unknown> =
	ExtensionBridgeResponse<T> | ExtensionBridgeError

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

type BBMessage = BBMessageRequest | BBMessageResponse | BBMessageEvent

export type RecordingEventType =
	| 'RECORDING_STARTED'
	| 'RECORDING_STATUS'
	| 'RECORDING_STOPPED'
	| 'RECORDING_ERROR'

export interface RecordingStatusPayload {
	isRecording: boolean
	duration: number
}

export interface RecordingStoppedPayload {
	videoData: string
	duration: number
}

export interface RecordingErrorPayload {
	error: string
}

export interface NetworkRequestData {
	method: string
	url: string
	status: number
	request?: string
	response?: string
	requestHeaders?: Record<string, string>
	responseHeaders?: Record<string, string>
	timestamp: number
	duration: number
}

export interface ConsoleMessageData {
	level: string
	message: string
	timestamp: number
}

export interface UserActionData {
	type: string
	timestamp: number
	elementId: number
	selector: string
	label: string
	x: number
	y: number
	value: string
}

export interface NavigationEventData {
	type: string
	timestamp: number
	url: string
	referrer: string
	navigationStart: number
	documentTitle: string
}

export interface SessionLogData {
	sessionId: string
	projectId: string
	url: string
	userAgent: string
	startTime: number
	networkRequests: NetworkRequestData[]
	consoleMessages: ConsoleMessageData[]
	userActions: UserActionData[]
	navigationEvents: NavigationEventData[]
}

type EventCallback = (payload: unknown) => void

export class ExtensionBridge {
	private static instance: ExtensionBridge | null = null
	private isAvailable = false
	private capabilities: ExtensionCapabilities | null = null
	private pendingRequests = new Map<
		string,
		{
			resolve: (result: ExtensionBridgeResult) => void
			timeout: ReturnType<typeof setTimeout>
		}
	>()
	private eventListeners = new Map<string, Set<EventCallback>>()
	private channelId: string
	private initialized = false
	private logger: Logger

	private constructor() {
		this.channelId = this.generateId()
		this.logger = new Logger(false, 'ExtensionBridge') // Default to false, will be updated when detect is called
		this.setupMessageListener()
	}

	static getInstance(): ExtensionBridge {
		if (!ExtensionBridge.instance) {
			ExtensionBridge.instance = new ExtensionBridge()
		}
		return ExtensionBridge.instance
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
	}

	private setupMessageListener(): void {
		window.addEventListener('message', this.handleMessage.bind(this))
	}

	private handleMessage(event: MessageEvent): void {
		if (event.source !== window) return
		if (event.origin !== location.origin) return

		const data = event.data as BBMessage
		if (!data || data.bb !== 1) return
		if (data.direction !== 'ext->page') return

		if (data.kind === 'res') {
			this.handleResponse(data)
		} else if (data.kind === 'event') {
			this.handleEvent(data)
		}
	}

	private handleResponse(data: BBMessageResponse): void {
		const pending = this.pendingRequests.get(data.requestId)
		if (!pending) return

		clearTimeout(pending.timeout)
		this.pendingRequests.delete(data.requestId)

		if (data.ok) {
			pending.resolve({ ok: true, payload: data.payload })
		} else {
			pending.resolve({ ok: false, error: data.error })
		}
	}

	private handleEvent(data: BBMessageEvent): void {
		const listeners = this.eventListeners.get(data.type)
		if (listeners) {
			listeners.forEach((callback) => {
				try {
					callback(data.payload)
				} catch (error) {
					this.logger.error('Event listener error:', error)
				}
			})
		}
	}

	private sendMessage(message: BBMessageRequest): void {
		window.postMessage(message, location.origin)
	}

	async detect(timeoutMs = 300, debug = false): Promise<boolean> {
		// Update logger debug setting
		this.logger.setDebug(debug)

		if (this.initialized) {
			return this.isAvailable
		}

		this.logger.log('Detecting extension...')

		try {
			const result = await this.request<{
				version: string
				capabilities: ExtensionCapabilities
			}>('HELLO', { channelId: this.channelId }, timeoutMs)

			if (result.ok) {
				this.isAvailable = true
				this.capabilities = result.payload.capabilities
				this.logger.log('Extension detected:', result.payload.version)
			} else {
				this.logger.warn('Detection failed (response not ok):', result.error)
				this.isAvailable = false
				this.capabilities = null
			}
		} catch (e) {
			this.logger.warn('Detection failed (exception):', e)
			this.isAvailable = false
			this.capabilities = null
		}

		this.initialized = true
		return this.isAvailable
	}

	async request<T = unknown>(
		type: string,
		payload?: unknown,
		timeoutMs = 5000,
	): Promise<ExtensionBridgeResult<T>> {
		return new Promise((resolve) => {
			const requestId = this.generateId()

			const timeout = setTimeout(() => {
				this.pendingRequests.delete(requestId)
				resolve({
					ok: false,
					error: { message: 'Request timed out', code: 'TIMEOUT' },
				})
			}, timeoutMs)

			this.pendingRequests.set(requestId, {
				resolve: resolve as (result: ExtensionBridgeResult) => void,
				timeout,
			})

			const message: BBMessageRequest = {
				bb: 1,
				direction: 'page->ext',
				kind: 'req',
				type,
				requestId,
				payload,
			}

			this.sendMessage(message)
		})
	}

	async captureScreenshot(): Promise<ExtensionBridgeResult<string>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<string>('CAPTURE_SCREENSHOT', {
			format: 'png',
			quality: 1,
		})
	}

	async startRecording(): Promise<ExtensionBridgeResult<void>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		if (!this.capabilities?.videoRecording) {
			return {
				ok: false,
				error: {
					message: 'Video recording not supported',
					code: 'NOT_SUPPORTED',
				},
			}
		}

		return this.request<void>('START_RECORDING', {}, 10000)
	}

	async storeRecordingData(
		sessionId: string,
		data: unknown,
	): Promise<ExtensionBridgeResult<void>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<void>(
			'BB_STORE_RECORDING_DATA',
			{ sessionId, data },
			5000,
		)
	}

	async initSessionLogs(
		sessionId: string,
		projectId: string,
		url: string,
	): Promise<ExtensionBridgeResult<void>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<void>(
			'BB_INIT_SESSION_LOGS',
			{
				sessionId,
				projectId,
				url,
				userAgent: navigator.userAgent,
				startTime: Date.now(),
			},
			5000,
		)
	}

	async appendNetworkRequest(
		sessionId: string,
		data: NetworkRequestData,
	): Promise<ExtensionBridgeResult<void>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<void>(
			'BB_APPEND_NETWORK_REQUEST',
			{ sessionId, data },
			2000,
		)
	}

	async appendConsoleMessage(
		sessionId: string,
		data: ConsoleMessageData,
	): Promise<ExtensionBridgeResult<void>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<void>(
			'BB_APPEND_CONSOLE_MESSAGE',
			{ sessionId, data },
			2000,
		)
	}

	async appendUserAction(
		sessionId: string,
		data: UserActionData,
	): Promise<ExtensionBridgeResult<void>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<void>(
			'BB_APPEND_USER_ACTION',
			{ sessionId, data },
			2000,
		)
	}

	async appendNavigationEvent(
		sessionId: string,
		data: NavigationEventData,
	): Promise<ExtensionBridgeResult<void>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<void>(
			'BB_APPEND_NAVIGATION_EVENT',
			{ sessionId, data },
			2000,
		)
	}

	async getSessionLogs(
		sessionId: string,
	): Promise<ExtensionBridgeResult<SessionLogData>> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<SessionLogData>(
			'BB_GET_SESSION_LOGS',
			{ sessionId },
			5000,
		)
	}

	async stopRecording(): Promise<
		ExtensionBridgeResult<{ videoData: string; duration: number }>
	> {
		if (!this.isAvailable) {
			return {
				ok: false,
				error: { message: 'Extension not available', code: 'NOT_AVAILABLE' },
			}
		}

		return this.request<{ videoData: string; duration: number }>(
			'STOP_RECORDING',
			{},
			30000,
		)
	}

	onRecordingEvent(
		eventType: RecordingEventType,
		callback: EventCallback,
	): () => void {
		if (!this.eventListeners.has(eventType)) {
			this.eventListeners.set(eventType, new Set())
		}
		this.eventListeners.get(eventType)!.add(callback)

		return () => {
			this.eventListeners.get(eventType)?.delete(callback)
		}
	}

	getCapabilities(): ExtensionCapabilities | null {
		return this.capabilities
	}

	isExtensionAvailable(): boolean {
		return this.isAvailable
	}

	destroy(): void {
		window.removeEventListener('message', this.handleMessage.bind(this))
		this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout))
		this.pendingRequests.clear()
		this.eventListeners.clear()
		ExtensionBridge.instance = null
	}
}

export const extensionBridge = ExtensionBridge.getInstance()
