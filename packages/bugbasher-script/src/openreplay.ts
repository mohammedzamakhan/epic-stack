import {
	extensionBridge,
	type NetworkRequestData,
	type ConsoleMessageData,
	type UserActionData,
	type NavigationEventData,
} from './extension-bridge.js'
import { Logger } from './logger.js'

interface SessionResponse {
	sessionToken: string
	sessionID: string
	sessionHash: string
	userUUID: string
	projectKey: string
	ingestPoint: string
	startTime: number
}

interface NetworkRequest {
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

interface ConsoleMessage {
	level: string
	message: string
	timestamp: number
}

interface WebSocketEvent {
	type: 'WebSocket'
	url: string
	event: 'open' | 'close' | 'error'
	timestamp: number
	duration?: number
	code?: number
	reason?: string
}

interface WebSocketMessage {
	type: 'WebSocket'
	url: string
	direction: 'incoming' | 'outgoing'
	timestamp: number
	data: string
}

interface UserAction {
	type: string
	timestamp: number
	elementId: number
	selector: string
	label: string
	x: number
	y: number
	value: string
}

interface UIComponentDetector {
	name: string
	isComponent: (element: HTMLElement) => boolean
	isTrigger?: (element: HTMLElement) => boolean
	getLabel: (element: HTMLElement) => string
	getIdentifier: (element: HTMLElement) => string
	getType?: (element: HTMLElement) => string
	getState?: (element: HTMLElement) => string
}

interface UIDetectionConfig {
	modal?: UIComponentDetector
	dropdown?: UIComponentDetector
	tab?: UIComponentDetector
	accordion?: UIComponentDetector
	button?: UIComponentDetector
	form?: UIComponentDetector
	custom?: UIComponentDetector[]
}

interface NavigationEvent {
	type: string
	timestamp: number
	url: string
	referrer: string
	navigationStart: number
	documentTitle: string
}

interface ResourceTiming {
	type: 'ResourceTiming'
	name: string
	initiatorType: string
	startTime: number
	duration: number
	transferSize: number
	encodedBodySize: number
	decodedBodySize: number
	timestamp: number
}

interface ResourceLoad {
	type: 'Image'
	url: string
	status: 'loaded' | 'error'
	timestamp: number
	duration: number
	width?: number
	height?: number
}

export class OpenReplayIntegration {
	private session: SessionResponse | null = null
	private projectKey: string
	private apiOrigin: string
	private debug: boolean
	private logger: Logger
	private userId: string | null = null
	private metadata: Record<string, any> = {}
	private messageQueue: any[] = []
	private isActive = false
	private batchTimer: number | null = null
	private originalFetch: typeof fetch
	private originalConsole: {
		log: typeof console.log
		warn: typeof console.warn
		error: typeof console.error
		info: typeof console.info
		debug: typeof console.debug
	}
	private uiDetectionConfig: UIDetectionConfig
	private useExtensionStorage = false
	private extensionSessionId: string | null = null

	constructor(
		projectKey: string,
		apiOrigin: string,
		debug = false,
		uiConfig?: UIDetectionConfig,
	) {
		this.projectKey = projectKey
		this.apiOrigin = apiOrigin
		this.debug = debug
		this.logger = new Logger(debug, 'BugBasher')
		this.uiDetectionConfig = this.mergeWithDefaultUIConfig(uiConfig || {})

		// Store original functions for restoration
		this.originalFetch = window.fetch.bind(window)
		this.originalConsole = {
			log: console.log.bind(console),
			warn: console.warn.bind(console),
			error: console.error.bind(console),
			info: console.info.bind(console),
			debug: console.debug.bind(console),
		}
	}

	private mergeWithDefaultUIConfig(
		userConfig: UIDetectionConfig,
	): UIDetectionConfig {
		const defaultConfig: UIDetectionConfig = {
			modal: {
				name: 'modal',
				isComponent: (element: HTMLElement) => {
					return (
						element.getAttribute('role') === 'dialog' ||
						element.getAttribute('role') === 'alertdialog' ||
						element.hasAttribute('data-dialog') ||
						element.hasAttribute('data-modal') ||
						element.classList.contains('modal') ||
						element.classList.contains('dialog')
					)
				},
				isTrigger: (element: HTMLElement) => {
					return (
						element.hasAttribute('data-dialog-trigger') ||
						element.hasAttribute('data-modal-trigger') ||
						element.getAttribute('aria-haspopup') === 'dialog' ||
						element.classList.contains('modal-trigger')
					)
				},
				getLabel: (element: HTMLElement) => {
					return (
						element.getAttribute('aria-label') ||
						element.getAttribute('data-label') ||
						element.textContent?.trim() ||
						'modal'
					)
				},
				getIdentifier: (element: HTMLElement) => {
					return (
						element.id ||
						element.getAttribute('data-testid') ||
						element.getAttribute('aria-labelledby') ||
						'modal'
					)
				},
				getType: (element: HTMLElement) => {
					if (element.getAttribute('role') === 'alertdialog')
						return 'alert dialog'
					if (element.classList.contains('confirmation'))
						return 'confirmation dialog'
					if (element.classList.contains('settings')) return 'settings modal'
					return 'modal'
				},
			},
			dropdown: {
				name: 'dropdown',
				isComponent: (element: HTMLElement) => {
					return (
						element.hasAttribute('data-radix-select-trigger') ||
						element.hasAttribute('data-headlessui-combobox-button') ||
						element.hasAttribute('data-reach-menu-button') ||
						element.getAttribute('aria-haspopup') === 'listbox' ||
						element.getAttribute('aria-haspopup') === 'menu' ||
						element.classList.contains('dropdown-trigger') ||
						element.classList.contains('select-trigger')
					)
				},
				getLabel: (element: HTMLElement) => {
					const trigger =
						element.closest('[data-radix-select-trigger]') || element
					const valueElement =
						trigger.querySelector('[data-radix-select-value]') ||
						trigger.querySelector('.select-value') ||
						trigger.querySelector('.dropdown-value')

					if (valueElement) {
						return valueElement.textContent?.trim() || 'dropdown'
					}

					return (
						trigger.textContent?.trim() ||
						trigger.getAttribute('aria-label') ||
						trigger.getAttribute('placeholder') ||
						'dropdown'
					)
				},
				getIdentifier: (element: HTMLElement) => {
					return (
						element.getAttribute('data-testid') ||
						element.getAttribute('name') ||
						element.id ||
						'custom-dropdown'
					)
				},
			},
			tab: {
				name: 'tab',
				isComponent: (element: HTMLElement) => {
					return (
						element.getAttribute('role') === 'tab' ||
						element.hasAttribute('data-tabs-trigger') ||
						element.classList.contains('tab-trigger')
					)
				},
				getLabel: (element: HTMLElement) => {
					return (
						element.textContent?.trim() ||
						element.getAttribute('aria-label') ||
						element.getAttribute('data-value') ||
						'tab'
					)
				},
				getIdentifier: (element: HTMLElement) => {
					return (
						element.getAttribute('data-value') ||
						element.getAttribute('aria-controls') ||
						element.id ||
						'tab'
					)
				},
			},
			accordion: {
				name: 'accordion',
				isComponent: (element: HTMLElement) => {
					return (
						element.hasAttribute('data-accordion-trigger') ||
						(element.getAttribute('role') === 'button' &&
							element.hasAttribute('aria-expanded')) ||
						element.classList.contains('accordion-trigger')
					)
				},
				getLabel: (element: HTMLElement) => {
					return (
						element.textContent?.trim() ||
						element.getAttribute('aria-label') ||
						'accordion item'
					)
				},
				getIdentifier: (element: HTMLElement) => {
					return (
						element.getAttribute('data-value') ||
						element.getAttribute('aria-controls') ||
						element.id ||
						'accordion'
					)
				},
				getState: (element: HTMLElement) => {
					return element.getAttribute('aria-expanded') === 'true' ||
						element.getAttribute('data-state') === 'open'
						? 'expanded'
						: 'collapsed'
				},
			},
			custom: [],
		}

		// Merge user config with defaults
		return {
			modal: userConfig.modal || defaultConfig.modal,
			dropdown: userConfig.dropdown || defaultConfig.dropdown,
			tab: userConfig.tab || defaultConfig.tab,
			accordion: userConfig.accordion || defaultConfig.accordion,
			button: userConfig.button,
			form: userConfig.form,
			custom: [...(defaultConfig.custom || []), ...(userConfig.custom || [])],
		}
	}

	async initialize(): Promise<void> {
		try {
			// Check if extension is available - if so, use extension storage instead of API
			const extensionAvailable = await extensionBridge.detect(500)

			if (extensionAvailable) {
				// Use extension storage mode - no API calls needed
				this.useExtensionStorage = true
				this.extensionSessionId = this.generateSessionId()
				this.isActive = true

				// Initialize session logs in extension
				await extensionBridge.initSessionLogs(
					this.extensionSessionId,
					this.projectKey,
					window.location.href,
				)

				this.logger.log('Using extension storage mode')
				this.logger.log('Extension Session ID:', this.extensionSessionId)
			} else {
				// Fallback to API mode
				const response = await fetch(
					`${this.apiOrigin}/api/openreplay/v1/web/start`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							projectKey: this.projectKey,
							userUUID: this.userId,
							metadata: this.metadata,
						}),
					},
				)

				if (!response.ok) {
					throw new Error(`Session start failed: ${response.status}`)
				}

				this.session = await response.json()
				this.isActive = true

				this.logger.log('OpenReplay integration initialized successfully')
				if (this.session) {
					this.logger.log('Session ID:', this.session.sessionID)
					this.logger.log('Session Token:', this.session.sessionToken)
					this.logger.log('Ingest point:', this.session.ingestPoint)
				}
			}

			// Capture initial page navigation
			this.captureNavigation({
				type: 'SetPageLocation',
				timestamp: Date.now(),
				url: window.location.href,
				referrer: document.referrer || '',
				navigationStart: Date.now(),
				documentTitle: document.title || '',
			})

			// Set up network and console monitoring
			this.setupNetworkMonitoring()
			this.setupConsoleMonitoring()
			this.setupUserActionMonitoring()
			this.setupNavigationMonitoring()

			// Start batch processing only for API mode
			if (!this.useExtensionStorage) {
				this.startBatchProcessing()
			}
		} catch (error) {
			console.warn('BugBasher: OpenReplay failed to initialize:', error)
			// Continue with basic recording functionality
		}
	}

	private generateSessionId(): string {
		return `bb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
	}

	private setupNetworkMonitoring(): void {
		// Intercept fetch requests
		window.fetch = async (
			input: RequestInfo | URL,
			init?: RequestInit,
		): Promise<Response> => {
			const startTime = Date.now()
			const url =
				typeof input === 'string'
					? input
					: input instanceof URL
						? input.href
						: input.url
			const method = init?.method || 'GET'

			this.logger.log('Intercepted fetch request:', {
				url,
				method,
				hasBody: !!init?.body,
				bodyType: init?.body ? typeof init.body : 'none',
				shouldCapture: this.shouldCapturePayload(url),
			})

			// Capture request data before making the request
			let requestBody: string | undefined
			let requestHeaders: Record<string, string> = {}

			// Capture request body if we should capture payloads
			if (this.shouldCapturePayload(url)) {
				requestBody = await this.getRequestBodySafe(init)
				this.logger.log('Captured request body:', {
					url,
					bodyLength: requestBody ? requestBody.length : 0,
					bodyPreview: requestBody ? requestBody.substring(0, 100) : 'none',
				})
			}

			// Capture request headers
			if (init?.headers) {
				if (init.headers instanceof Headers) {
					init.headers.forEach((value, key) => {
						if (!this.isSensitiveHeader(key)) {
							requestHeaders[key] = value
						}
					})
				} else if (Array.isArray(init.headers)) {
					init.headers.forEach(([key, value]) => {
						if (!this.isSensitiveHeader(key)) {
							requestHeaders[key] = value
						}
					})
				} else {
					Object.entries(init.headers).forEach(([key, value]) => {
						if (!this.isSensitiveHeader(key) && value) {
							requestHeaders[key] = value
						}
					})
				}
			}

			// Add default headers that browsers typically send
			if (!requestHeaders['accept'] && !requestHeaders['Accept']) {
				requestHeaders['Accept'] = '*/*'
			}
			if (!requestHeaders['user-agent'] && !requestHeaders['User-Agent']) {
				requestHeaders['User-Agent'] = navigator.userAgent
			}

			try {
				// Call original fetch with exact same parameters to preserve CORS behavior
				const response = await this.originalFetch(input, init)
				const endTime = Date.now()

				if (this.debug) {
					console.log('BugBasher: Fetch response received:', {
						url,
						status: response.status,
						contentType: response.headers.get('content-type'),
						shouldCapture: this.shouldCapturePayload(url),
					})
				}

				// Capture response data asynchronously to not interfere with response handling
				setTimeout(async () => {
					try {
						let responseBody: string | undefined

						// Only try to read response body if we should capture it and response is available
						if (this.shouldCapturePayload(url) && response.ok) {
							try {
								responseBody = await this.getResponseBodySafe(response.clone())
								if (this.debug) {
									console.log('BugBasher: Captured response body:', {
										url,
										bodyLength: responseBody ? responseBody.length : 0,
										bodyPreview: responseBody
											? responseBody.substring(0, 100)
											: 'none',
									})
								}
							} catch {
								responseBody = '[Response body unavailable]'
							}
						} else if (!response.ok) {
							// For error responses, try to capture the error body
							try {
								responseBody = await this.getResponseBodySafe(response.clone())
							} catch {
								responseBody = `[HTTP ${response.status} ${response.statusText}]`
							}
						}

						// Capture response headers
						const responseHeaders: Record<string, string> = {}
						response.headers.forEach((value, key) => {
							if (!this.isSensitiveHeader(key)) {
								responseHeaders[key] = value
							}
						})

						if (this.debug) {
							console.log('BugBasher: About to capture network request:', {
								url,
								method,
								status: response.status,
								hasRequestBody: !!requestBody,
								hasResponseBody: !!responseBody,
								requestBodyLength: requestBody ? requestBody.length : 0,
								responseBodyLength: responseBody ? responseBody.length : 0,
							})
						}

						this.captureNetworkRequest({
							method,
							url,
							status: response.status,
							timestamp: startTime,
							duration: endTime - startTime,
							request: requestBody,
							response: responseBody,
							requestHeaders,
							responseHeaders,
						})
					} catch (error) {
						// Silently fail capture to not interfere with the original request
						if (this.debug) {
							console.warn(
								'BugBasher: Failed to capture network request:',
								error,
							)
						}
					}
				}, 0)

				return response
			} catch (error) {
				const endTime = Date.now()

				if (this.debug) {
					console.log('BugBasher: Fetch request failed:', {
						url,
						error: error instanceof Error ? error.message : 'Unknown error',
					})
				}

				// Capture failed request (async to not interfere with error propagation)
				setTimeout(async () => {
					try {
						this.captureNetworkRequest({
							method,
							url,
							status: 0,
							timestamp: startTime,
							duration: endTime - startTime,
							request: requestBody,
							response:
								error instanceof Error ? error.message : 'Network error',
							requestHeaders,
							responseHeaders: {},
						})
					} catch {
						// Silently fail
					}
				}, 0)

				throw error
			}
		}

		// Intercept XMLHttpRequest
		const originalXHROpen = XMLHttpRequest.prototype.open
		const originalXHRSend = XMLHttpRequest.prototype.send
		const originalXHRSetRequestHeader =
			XMLHttpRequest.prototype.setRequestHeader

		XMLHttpRequest.prototype.open = function (
			method: string,
			url: string | URL,
			async?: boolean,
			username?: string | null,
			password?: string | null,
		) {
			;(this as any)._bugbasher_method = method
			;(this as any)._bugbasher_url = typeof url === 'string' ? url : url.href
			;(this as any)._bugbasher_startTime = Date.now()
			;(this as any)._bugbasher_requestHeaders = {}
			return originalXHROpen.call(
				this,
				method,
				url,
				async ?? true,
				username,
				password,
			)
		}

		XMLHttpRequest.prototype.setRequestHeader = function (
			name: string,
			value: string,
		) {
			const headers = (this as any)._bugbasher_requestHeaders || {}
			if (!self.isSensitiveHeader(name)) {
				headers[name] = value
				;(this as any)._bugbasher_requestHeaders = headers
			}
			return originalXHRSetRequestHeader.call(this, name, value)
		}

		const self = this
		XMLHttpRequest.prototype.send = function (
			body?: Document | XMLHttpRequestBodyInit | null,
		) {
			const xhr = this
			const startTime = (this as any)._bugbasher_startTime || Date.now()
			const url = (xhr as any)._bugbasher_url

			// Capture request body
			let requestBody: string | undefined
			if (body && self.shouldCapturePayload(url)) {
				if (typeof body === 'string') {
					requestBody = body
				} else if (body instanceof FormData) {
					const formEntries: string[] = []
					body.forEach((value, key) => {
						if (value instanceof File) {
							formEntries.push(
								`${key}: [File: ${value.name}, size: ${value.size}]`,
							)
						} else {
							formEntries.push(`${key}: ${value}`)
						}
					})
					requestBody = formEntries.join('\n')
				} else if (body instanceof URLSearchParams) {
					requestBody = body.toString()
				} else if (body instanceof ArrayBuffer) {
					requestBody = `[ArrayBuffer: ${body.byteLength} bytes]`
				} else if (body instanceof Blob) {
					requestBody = `[Blob: ${body.size} bytes, type: ${body.type}]`
				} else {
					requestBody = String(body)
				}
			}

			this.addEventListener('loadend', () => {
				const endTime = Date.now()

				if (url && this.readyState === 4) {
					const integration = (window as any).bugbasherOpenReplay
					if (integration) {
						// Capture async to not interfere with the XHR completion
						setTimeout(() => {
							try {
								// Capture response headers
								const responseHeaders: Record<string, string> = {}
								const responseHeadersString = xhr.getAllResponseHeaders()
								if (responseHeadersString) {
									responseHeadersString.split('\r\n').forEach((line) => {
										const [key, value] = line.split(': ')
										if (key && value && !self.isSensitiveHeader(key)) {
											responseHeaders[key.toLowerCase()] = value
										}
									})
								}

								// Capture response body
								let responseBody: string | undefined
								if (self.shouldCapturePayload(url)) {
									if (
										this.responseType === '' ||
										this.responseType === 'text'
									) {
										responseBody = this.responseText
									} else if (this.responseType === 'json') {
										responseBody = JSON.stringify(this.response)
									} else {
										responseBody = `[${this.responseType} response]`
									}
								}

								integration.captureNetworkRequest({
									method: (xhr as any)._bugbasher_method || 'GET',
									url,
									status: this.status,
									timestamp: startTime,
									duration: endTime - startTime,
									request: requestBody,
									response: responseBody,
									requestHeaders: (xhr as any)._bugbasher_requestHeaders || {},
									responseHeaders,
								})
							} catch {
								// Silently fail
							}
						}, 0)
					}
				}
			})

			return originalXHRSend.call(this, body)
		}

		// Intercept WebSocket connections
		this.setupWebSocketMonitoring()

		// Monitor resource loading (images, fonts, scripts, etc.)
		this.setupResourceMonitoring()

		// Store reference for XHR capture
		;(window as any).bugbasherOpenReplay = this
	}

	private setupWebSocketMonitoring(): void {
		const originalWebSocket = window.WebSocket
		const self = this

		window.WebSocket = class extends originalWebSocket {
			private _bugbasher_url: string
			private _bugbasher_startTime: number

			constructor(url: string | URL, protocols?: string | string[]) {
				super(url, protocols)
				this._bugbasher_url = typeof url === 'string' ? url : url.href
				this._bugbasher_startTime = Date.now()

				// Capture WebSocket connection
				this.addEventListener('open', () => {
					self.captureWebSocketEvent({
						type: 'WebSocket',
						url: this._bugbasher_url,
						event: 'open',
						timestamp: Date.now(),
						duration: Date.now() - this._bugbasher_startTime,
					})
				})

				this.addEventListener('close', (event) => {
					self.captureWebSocketEvent({
						type: 'WebSocket',
						url: this._bugbasher_url,
						event: 'close',
						timestamp: Date.now(),
						code: event.code,
						reason: event.reason,
					})
				})

				this.addEventListener('error', () => {
					self.captureWebSocketEvent({
						type: 'WebSocket',
						url: this._bugbasher_url,
						event: 'error',
						timestamp: Date.now(),
					})
				})

				// Intercept message sending
				const originalSend = this.send
				this.send = function (
					data: string | ArrayBufferLike | Blob | ArrayBufferView,
				) {
					self.captureWebSocketMessage({
						type: 'WebSocket',
						url: this._bugbasher_url,
						direction: 'outgoing',
						timestamp: Date.now(),
						data: self.serializeWebSocketData(data),
					})
					return originalSend.call(this, data)
				}

				// Intercept message receiving
				this.addEventListener('message', (event) => {
					self.captureWebSocketMessage({
						type: 'WebSocket',
						url: this._bugbasher_url,
						direction: 'incoming',
						timestamp: Date.now(),
						data: self.serializeWebSocketData(event.data),
					})
				})
			}
		}
	}

	private setupResourceMonitoring(): void {
		// Monitor resource loading via Performance Observer
		if ('PerformanceObserver' in window) {
			try {
				const observer = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (entry.entryType === 'resource') {
							const resourceEntry = entry as PerformanceResourceTiming
							this.captureResourceTiming({
								type: 'ResourceTiming',
								name: resourceEntry.name,
								initiatorType: resourceEntry.initiatorType,
								startTime: resourceEntry.startTime,
								duration: resourceEntry.duration,
								transferSize: resourceEntry.transferSize,
								encodedBodySize: resourceEntry.encodedBodySize,
								decodedBodySize: resourceEntry.decodedBodySize,
								timestamp: Date.now(),
							})
						}
					}
				})

				observer.observe({ entryTypes: ['resource'] })

				// Store observer reference for cleanup
				;(this as any)._performanceObserver = observer
			} catch (error) {
				if (this.debug) {
					console.warn('BugBasher: Performance Observer not supported:', error)
				}
			}
		}

		// Also monitor image loading specifically
		this.setupImageMonitoring()
	}

	private setupImageMonitoring(): void {
		// Monitor dynamically created images
		const originalImage = window.Image
		const self = this

		window.Image = class extends originalImage {
			constructor(width?: number, height?: number) {
				super(width, height)

				const startTime = Date.now()

				this.addEventListener('load', () => {
					self.captureResourceLoad({
						type: 'Image',
						url: this.src,
						status: 'loaded',
						timestamp: startTime,
						duration: Date.now() - startTime,
						width: this.naturalWidth,
						height: this.naturalHeight,
					})
				})

				this.addEventListener('error', () => {
					self.captureResourceLoad({
						type: 'Image',
						url: this.src,
						status: 'error',
						timestamp: startTime,
						duration: Date.now() - startTime,
					})
				})
			}
		}
	}

	private setupConsoleMonitoring(): void {
		const captureConsole = (level: string, originalMethod: Function) => {
			return (...args: any[]) => {
				// Call original method first
				originalMethod.apply(console, args)

				// Capture for OpenReplay
				this.captureConsoleMessage({
					level,
					message: args
						.map((arg) =>
							typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
						)
						.join(' '),
					timestamp: Date.now(),
				})
			}
		}

		console.log = captureConsole('log', this.originalConsole.log)
		console.warn = captureConsole('warn', this.originalConsole.warn)
		console.error = captureConsole('error', this.originalConsole.error)
		console.info = captureConsole('info', this.originalConsole.info)
		console.debug = captureConsole('debug', this.originalConsole.debug)
	}

	private setupUserActionMonitoring(): void {
		// Track mouse clicks with enhanced detection
		document.addEventListener(
			'click',
			(event) => {
				const target = event.target as Element
				const actionData = this.analyzeClickTarget(target, event)

				this.captureUserAction({
					type: 'MouseClick',
					timestamp: Date.now(),
					elementId: this.getElementId(target),
					selector: this.getElementSelector(target),
					label: actionData.label,
					x: event.clientX,
					y: event.clientY,
					value: actionData.value,
				})
			},
			true,
		)

		// Track input changes with debouncing
		let inputTimeout: number | null = null
		let lastInputElement: HTMLElement | null = null

		document.addEventListener(
			'input',
			(event) => {
				const target = event.target as HTMLInputElement
				if (
					target &&
					(target.tagName === 'INPUT' ||
						target.tagName === 'TEXTAREA' ||
						target.tagName === 'SELECT')
				) {
					// Clear previous timeout
					if (inputTimeout) {
						clearTimeout(inputTimeout)
					}

					// Store the current element
					lastInputElement = target

					// Set a timeout to capture the final value after user stops typing
					inputTimeout = window.setTimeout(() => {
						if (lastInputElement) {
							this.captureUserAction({
								type: 'SetInputValue',
								timestamp: Date.now(),
								elementId: this.getElementId(lastInputElement),
								selector: this.getElementSelector(lastInputElement),
								label: this.getElementLabel(lastInputElement),
								x: 0,
								y: 0,
								value: this.getInputValue(lastInputElement as HTMLInputElement),
							})
							lastInputElement = null
						}
					}, 500) // Wait 500ms after user stops typing
				}
			},
			true,
		)

		// Track select changes immediately (no debouncing needed)
		document.addEventListener(
			'change',
			(event) => {
				const target = event.target as HTMLSelectElement
				if (target && target.tagName === 'SELECT') {
					this.captureUserAction({
						type: 'SetInputValue',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: this.getElementLabel(target),
						x: 0,
						y: 0,
						value: this.getSelectValue(target),
					})
				}
			},
			true,
		)

		// Track form submissions
		document.addEventListener(
			'submit',
			(event) => {
				const target = event.target as HTMLFormElement
				if (target && target.tagName === 'FORM') {
					this.captureUserAction({
						type: 'FormSubmit',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: this.getElementLabel(target),
						x: 0,
						y: 0,
						value: '',
					})
				}
			},
			true,
		)

		// Track viewport scrolling with debouncing
		let scrollTimeout: number | null = null
		let lastScrollY = window.scrollY

		document.addEventListener(
			'scroll',
			() => {
				if (scrollTimeout) {
					clearTimeout(scrollTimeout)
				}

				scrollTimeout = window.setTimeout(() => {
					const currentScrollY = window.scrollY
					// Only capture if scroll position changed significantly
					if (Math.abs(currentScrollY - lastScrollY) > 50) {
						this.captureUserAction({
							type: 'SetViewportScroll',
							timestamp: Date.now(),
							elementId: 0,
							selector: 'window',
							label: 'Viewport Scroll',
							x: window.scrollX,
							y: currentScrollY,
							value: '',
						})
						lastScrollY = currentScrollY
					}
				}, 200) // Debounce scroll events
			},
			true,
		)

		// Track text selection
		document.addEventListener('selectionchange', () => {
			const selection = window.getSelection()
			if (selection && selection.toString().length > 0) {
				this.captureUserAction({
					type: 'SelectionChange',
					timestamp: Date.now(),
					elementId: 0,
					selector: 'document',
					label: 'Text Selection',
					x: 0,
					y: 0,
					value: selection.toString().substring(0, 100), // Limit selection text
				})
			}
		})

		// Track focus changes
		document.addEventListener(
			'focusin',
			(event) => {
				const target = event.target as Element
				if (target && target.tagName) {
					this.captureUserAction({
						type: 'SetNodeFocus',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: this.getElementLabel(target),
						x: 0,
						y: 0,
						value: '',
					})
				}
			},
			true,
		)

		// Track key presses (for important keys only)
		document.addEventListener(
			'keydown',
			(event) => {
				// Only capture important keys (Enter, Escape, Tab, etc.)
				const importantKeys = ['Enter', 'Escape', 'Tab', 'Backspace', 'Delete']
				if (importantKeys.includes(event.key)) {
					this.captureUserAction({
						type: 'KeyPress',
						timestamp: Date.now(),
						elementId: this.getElementId(event.target as Element),
						selector: this.getElementSelector(event.target as Element),
						label: `Key: ${event.key}`,
						x: 0,
						y: 0,
						value: event.key,
					})
				}
			},
			true,
		)

		// Track page visibility changes
		document.addEventListener('visibilitychange', () => {
			this.captureUserAction({
				type: 'SetPageVisibility',
				timestamp: Date.now(),
				elementId: 0,
				selector: 'document',
				label: `Page ${document.hidden ? 'Hidden' : 'Visible'}`,
				x: 0,
				y: 0,
				value: document.hidden ? 'hidden' : 'visible',
			})
		})

		// Track modal/dialog interactions
		this.setupModalTracking()

		// Track custom dropdown interactions (Radix UI, Base UI, etc.)
		this.setupCustomDropdownTracking()

		// Track tab/accordion interactions
		this.setupTabAccordionTracking()

		// Track drag and drop interactions
		this.setupDragDropTracking()

		// Track right-click context menu
		this.setupContextMenuTracking()

		// Track file upload interactions
		this.setupFileUploadTracking()
	}

	private getElementId(element: Element | null): number {
		if (!element) return 0

		// Try to get a unique identifier for the element
		if (element.id) {
			return this.hashString(element.id)
		}

		// Use a combination of tag name, class, and position
		const tagName = element.tagName.toLowerCase()
		const className = element.className || ''
		const position = Array.from(element.parentNode?.children || []).indexOf(
			element,
		)

		return this.hashString(`${tagName}-${className}-${position}`)
	}

	private getElementSelector(element: Element | null): string {
		if (!element) return ''

		try {
			// Build a human-readable selector
			const parts: string[] = []
			let current: Element | null = element

			while (current && current !== document.body && parts.length < 3) {
				let selector = current.tagName.toLowerCase()

				if (current.id) {
					// Use ID if available (most specific)
					selector += `#${current.id}`
					parts.unshift(selector)
					break // ID is unique, we can stop here
				}

				// Try to use meaningful class names
				if (current.className) {
					const meaningfulClasses = this.getMeaningfulClasses(current.className)
					if (meaningfulClasses.length > 0) {
						selector += `.${meaningfulClasses.slice(0, 2).join('.')}`
					}
				}

				// Add context for form elements
				if (
					selector === 'input' ||
					selector === 'textarea' ||
					selector === 'select'
				) {
					const input = current as HTMLInputElement
					if (input.type && input.type !== 'text') {
						selector += `[type="${input.type}"]`
					}
					if (input.name) {
						selector += `[name="${input.name}"]`
					}
				}

				// Add context for buttons
				if (selector === 'button') {
					const button = current as HTMLButtonElement
					if (button.type && button.type !== 'button') {
						selector += `[type="${button.type}"]`
					}
				}

				// Add context for links
				if (selector === 'a') {
					const link = current as HTMLAnchorElement
					if (link.href && link.href.includes('#')) {
						const hash = link.href.split('#')[1]
						if (hash) selector += `[href*="#${hash}"]`
					}
				}

				parts.unshift(selector)
				current = current.parentElement
			}

			return parts.join(' > ').substring(0, 150) // Limit selector length
		} catch (error) {
			return element.tagName?.toLowerCase() || 'element'
		}
	}

	private getMeaningfulClasses(className: string): string[] {
		const classes = className.split(' ').filter((c) => c.trim())

		// Filter out utility classes and keep meaningful ones
		return classes.filter((cls) => {
			const lower = cls.toLowerCase()

			// Skip utility classes (common CSS framework patterns)
			if (
				lower.match(
					/^(w-|h-|p-|m-|text-|bg-|border-|flex|grid|hidden|block|inline)/,
				)
			) {
				return false
			}

			// Skip test-related classes
			if (lower.includes('test') || lower.includes('spec')) {
				return false
			}

			// Skip very short or very long classes
			if (cls.length < 3 || cls.length > 20) {
				return false
			}

			// Keep meaningful semantic classes
			return (
				lower.includes('btn') ||
				lower.includes('button') ||
				lower.includes('form') ||
				lower.includes('input') ||
				lower.includes('nav') ||
				lower.includes('menu') ||
				lower.includes('header') ||
				lower.includes('footer') ||
				lower.includes('content') ||
				lower.includes('main') ||
				lower.includes('sidebar') ||
				lower.includes('modal') ||
				lower.includes('card') ||
				lower.includes('item') ||
				lower.includes('link') ||
				lower.includes('field') ||
				/^[a-z][a-z0-9-_]*[a-z0-9]$/i.test(cls) // Well-formed class names
			)
		})
	}

	private getElementLabel(element: Element | null): string {
		if (!element) return ''

		try {
			// Try different ways to get a meaningful label
			const htmlElement = element as HTMLElement

			// For form elements, try label association
			if (
				htmlElement.tagName === 'INPUT' ||
				htmlElement.tagName === 'TEXTAREA' ||
				htmlElement.tagName === 'SELECT'
			) {
				const input = htmlElement as HTMLInputElement

				// Try associated label
				if (input.labels && input.labels.length > 0) {
					const labelText = input.labels[0]!.textContent?.trim()
					if (labelText) return labelText.substring(0, 50)
				}

				// Try placeholder
				if (input.placeholder) {
					return input.placeholder.substring(0, 50)
				}

				// Try name attribute (make it more readable)
				if (input.name) {
					return this.humanizeFieldName(input.name)
				}

				// Try aria-label
				if (input.getAttribute('aria-label')) {
					return input.getAttribute('aria-label')!.substring(0, 50)
				}

				// Try to infer from input type
				if (input.type) {
					return this.getInputTypeLabel(input.type)
				}
			}

			// For buttons, use text content or value
			if (htmlElement.tagName === 'BUTTON') {
				const text = htmlElement.textContent?.trim()
				if (text && text.length > 0) return text.substring(0, 50)

				const value = (htmlElement as HTMLButtonElement).value
				if (value) return value.substring(0, 50)

				// Try type-specific labels
				const type = (htmlElement as HTMLButtonElement).type
				if (type === 'submit') return 'Submit Button'
				if (type === 'reset') return 'Reset Button'

				return 'Button'
			}

			// For input buttons (type="button", "submit", etc.)
			if (
				htmlElement.tagName === 'INPUT' &&
				(htmlElement as HTMLInputElement).type
			) {
				const input = htmlElement as HTMLInputElement
				const type = input.type.toLowerCase()

				if (['button', 'submit', 'reset'].includes(type)) {
					// Use value attribute for input buttons
					if (input.value) return input.value.substring(0, 50)

					// Fallback to type-specific labels
					if (type === 'submit') return 'Submit Button'
					if (type === 'reset') return 'Reset Button'
					return 'Button'
				}
			}

			// For links, use text content or href
			if (htmlElement.tagName === 'A') {
				const text = htmlElement.textContent?.trim()
				if (text) return text.substring(0, 50)

				const href = (htmlElement as HTMLAnchorElement).href
				if (href) {
					try {
						const url = new URL(href)
						return url.pathname.split('/').pop() || 'link'
					} catch {
						return 'link'
					}
				}
			}

			// For images, use alt text or src filename
			if (htmlElement.tagName === 'IMG') {
				const img = htmlElement as HTMLImageElement
				if (img.alt) return img.alt.substring(0, 50)

				if (img.src) {
					try {
						const url = new URL(img.src)
						const filename = url.pathname.split('/').pop()
						if (filename) return filename.substring(0, 50)
					} catch {
						// ignore
					}
				}
				return 'image'
			}

			// Try aria-label
			if (htmlElement.getAttribute('aria-label')) {
				return htmlElement.getAttribute('aria-label')!.substring(0, 50)
			}

			// Try title attribute
			if (htmlElement.title) {
				return htmlElement.title.substring(0, 50)
			}

			// Try data attributes that might contain labels
			const dataLabel =
				htmlElement.getAttribute('data-label') ||
				htmlElement.getAttribute('data-title') ||
				htmlElement.getAttribute('data-name')
			if (dataLabel) {
				return dataLabel.substring(0, 50)
			}

			// For elements with meaningful text content
			const text = htmlElement.textContent?.trim()
			if (text && text.length > 0 && text.length < 100) {
				return text.substring(0, 50)
			}

			// Try to get a meaningful description from class names
			if (htmlElement.className) {
				const meaningfulClass = this.extractMeaningfulClassName(
					htmlElement.className,
				)
				if (meaningfulClass) {
					return meaningfulClass
				}
			}

			// Fallback to tag name with some context
			return this.getTagDescription(htmlElement.tagName.toLowerCase())
		} catch (error) {
			return element.tagName?.toLowerCase() || 'element'
		}
	}

	private humanizeFieldName(name: string): string {
		// Convert camelCase and snake_case to readable format
		return name
			.replace(/([A-Z])/g, ' $1') // camelCase
			.replace(/_/g, ' ') // snake_case
			.replace(/-/g, ' ') // kebab-case
			.toLowerCase()
			.replace(/\b\w/g, (l) => l.toUpperCase()) // capitalize first letter of each word
			.trim()
			.substring(0, 50)
	}

	private getInputTypeLabel(type: string): string {
		const typeLabels: Record<string, string> = {
			text: 'Text Field',
			email: 'Email Field',
			password: 'Password Field',
			tel: 'Phone Field',
			url: 'URL Field',
			search: 'Search Field',
			number: 'Number Field',
			date: 'Date Field',
			time: 'Time Field',
			'datetime-local': 'Date & Time Field',
			month: 'Month Field',
			week: 'Week Field',
			color: 'Color Picker',
			range: 'Slider',
			file: 'File Upload',
			checkbox: 'Checkbox',
			radio: 'Radio Button',
			submit: 'Submit Button',
			button: 'Button',
			reset: 'Reset Button',
		}

		return typeLabels[type] || 'Input Field'
	}

	private extractMeaningfulClassName(className: string): string | null {
		const classes = className.split(' ').filter((c) => c.trim())

		// Look for meaningful class names
		const meaningfulClasses = classes.filter((cls) => {
			const lower = cls.toLowerCase()
			return (
				(lower.includes('btn') ||
					lower.includes('button') ||
					lower.includes('link') ||
					lower.includes('nav') ||
					lower.includes('menu') ||
					lower.includes('form') ||
					lower.includes('input') ||
					lower.includes('field') ||
					lower.includes('search') ||
					lower.includes('submit') ||
					lower.includes('login') ||
					lower.includes('signup') ||
					lower.includes('contact') ||
					lower.includes('header') ||
					lower.includes('footer') ||
					lower.includes('sidebar')) &&
				!lower.includes('test') &&
				cls.length > 2
			)
		})

		if (meaningfulClasses.length > 0) {
			return this.humanizeFieldName(meaningfulClasses[0]!)
		}

		return null
	}

	private analyzeClickTarget(
		element: Element,
		event: MouseEvent,
	): { label: string; value: string } {
		const htmlElement = element as HTMLElement

		if (this.debug) {
			console.log('BugBasher: Analyzing click target:', {
				element: htmlElement,
				tagName: htmlElement.tagName,
				className: htmlElement.className,
				attributes: Array.from(htmlElement.attributes).map(
					(attr) => `${attr.name}="${attr.value}"`,
				),
				textContent: htmlElement.textContent?.trim(),
				uiConfig: this.uiDetectionConfig,
			})
		}

		// Check for modal/dialog triggers
		if (this.uiDetectionConfig.modal?.isTrigger?.(htmlElement)) {
			const modalConfig = this.uiDetectionConfig.modal
			const result = {
				label: `Opened ${modalConfig.getType?.(htmlElement) || 'modal'}`,
				value: modalConfig.getIdentifier(htmlElement),
			}
			if (this.debug) console.log('BugBasher: Detected modal trigger:', result)
			return result
		}

		// Check for tab triggers
		if (this.uiDetectionConfig.tab?.isComponent(htmlElement)) {
			const tabConfig = this.uiDetectionConfig.tab
			const result = {
				label: `Switched to "${tabConfig.getLabel(htmlElement)}" tab`,
				value: tabConfig.getIdentifier(htmlElement),
			}
			if (this.debug) console.log('BugBasher: Detected tab component:', result)
			return result
		}

		// Check for accordion triggers
		if (this.uiDetectionConfig.accordion?.isComponent(htmlElement)) {
			const accordionConfig = this.uiDetectionConfig.accordion
			const state = accordionConfig.getState?.(htmlElement)
			const isExpanded = state === 'expanded'
			const result = {
				label: `${isExpanded ? 'Collapsed' : 'Expanded'} "${accordionConfig.getLabel(htmlElement)}"`,
				value: accordionConfig.getIdentifier(htmlElement),
			}
			if (this.debug)
				console.log('BugBasher: Detected accordion component:', result)
			return result
		}

		// Check for custom dropdown triggers
		if (this.uiDetectionConfig.dropdown?.isComponent(htmlElement)) {
			const dropdownConfig = this.uiDetectionConfig.dropdown
			const result = {
				label: `Opened "${dropdownConfig.getLabel(htmlElement)}" dropdown`,
				value: dropdownConfig.getIdentifier(htmlElement),
			}
			if (this.debug)
				console.log('BugBasher: Detected dropdown component:', result)
			return result
		}

		// Check custom detectors
		if (this.uiDetectionConfig.custom) {
			for (const detector of this.uiDetectionConfig.custom) {
				if (detector.isComponent(htmlElement)) {
					const action = detector.isTrigger?.(htmlElement)
						? 'Triggered'
						: 'Clicked'
					const result = {
						label: `${action} ${detector.name}: "${detector.getLabel(htmlElement)}"`,
						value: detector.getIdentifier(htmlElement),
					}
					if (this.debug)
						console.log(
							'BugBasher: Detected custom component:',
							detector.name,
							result,
						)
					return result
				}
			}
		}

		// Check for navigation links
		if (htmlElement.tagName === 'A') {
			const href = (htmlElement as HTMLAnchorElement).href
			if (href && href !== window.location.href) {
				const result = {
					label: `Clicked "${this.getElementLabel(htmlElement)}" link`,
					value: href,
				}
				if (this.debug)
					console.log('BugBasher: Detected navigation link:', result)
				return result
			}
		}

		// Default click handling
		const result = {
			label: this.getElementLabel(htmlElement),
			value: '',
		}
		if (this.debug)
			console.log('BugBasher: Using default click handling:', result)
		return result
	}

	private setupModalTracking(): void {
		// Track modal open/close using MutationObserver
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === 'attributes' &&
					mutation.attributeName === 'data-state'
				) {
					const target = mutation.target as HTMLElement
					if (this.uiDetectionConfig.modal?.isComponent(target)) {
						const modalConfig = this.uiDetectionConfig.modal
						const isOpen = target.getAttribute('data-state') === 'open'
						this.captureUserAction({
							type: isOpen ? 'ModalOpen' : 'ModalClose',
							timestamp: Date.now(),
							elementId: this.getElementId(target),
							selector: this.getElementSelector(target),
							label: `${isOpen ? 'Opened' : 'Closed'} ${modalConfig.getType?.(target) || 'modal'}`,
							x: 0,
							y: 0,
							value: modalConfig.getIdentifier(target),
						})
					}
				}

				// Track elements being added/removed (for dynamic modals)
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === Node.ELEMENT_NODE) {
							const element = node as HTMLElement
							if (
								this.uiDetectionConfig.modal?.isComponent(element) ||
								element.querySelector('[role="dialog"], [role="alertdialog"]')
							) {
								const modalConfig = this.uiDetectionConfig.modal
								this.captureUserAction({
									type: 'ModalOpen',
									timestamp: Date.now(),
									elementId: this.getElementId(element),
									selector: this.getElementSelector(element),
									label: `Opened ${modalConfig?.getType?.(element) || 'modal'}`,
									x: 0,
									y: 0,
									value: modalConfig?.getIdentifier(element) || 'modal',
								})
							}
						}
					})
				}
			})
		})

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-state', 'aria-hidden', 'open'],
		})
	}

	private setupCustomDropdownTracking(): void {
		// Track custom dropdown interactions using configurable patterns
		document.addEventListener(
			'click',
			(event) => {
				const target = event.target as HTMLElement

				// Check for dropdown trigger using configurable detector
				if (
					this.uiDetectionConfig.dropdown?.isComponent(target) ||
					target.closest('[data-radix-select-trigger]')
				) {
					const dropdownConfig = this.uiDetectionConfig.dropdown
					this.captureUserAction({
						type: 'CustomDropdownOpen',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: `Opened "${dropdownConfig?.getLabel(target) || 'dropdown'}" dropdown`,
						x: event.clientX,
						y: event.clientY,
						value: dropdownConfig?.getIdentifier(target) || 'dropdown',
					})
				}

				// Check for dropdown option selection
				if (
					target.getAttribute('data-radix-select-item') !== null ||
					target.closest('[data-radix-select-item]') ||
					target.getAttribute('role') === 'option'
				) {
					const optionText = target.textContent?.trim() || ''
					const dropdown =
						target.closest('[data-radix-select-content]') ||
						target.closest('[role="listbox"]') ||
						target.closest('.dropdown-content')

					this.captureUserAction({
						type: 'CustomDropdownSelect',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: `Selected "${optionText}" from dropdown`,
						x: event.clientX,
						y: event.clientY,
						value: optionText,
					})
				}
			},
			true,
		)
	}

	private setupTabAccordionTracking(): void {
		// Track tab and accordion interactions using configurable detectors
		document.addEventListener(
			'click',
			(event) => {
				const target = event.target as HTMLElement

				// Tab tracking
				if (
					this.uiDetectionConfig.tab?.isComponent(target) ||
					target.closest('[role="tab"]') ||
					target.getAttribute('data-tabs-trigger') !== null
				) {
					const tabConfig = this.uiDetectionConfig.tab
					const tabLabel =
						tabConfig?.getLabel(target) || target.textContent?.trim() || 'tab'
					this.captureUserAction({
						type: 'TabSwitch',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: `Switched to "${tabLabel}" tab`,
						x: event.clientX,
						y: event.clientY,
						value: tabLabel,
					})
				}

				// Accordion tracking
				if (
					this.uiDetectionConfig.accordion?.isComponent(target) ||
					target.getAttribute('data-accordion-trigger') !== null ||
					target.closest('[data-accordion-trigger]') ||
					(target.getAttribute('role') === 'button' &&
						target.getAttribute('aria-expanded') !== null)
				) {
					const accordionConfig = this.uiDetectionConfig.accordion
					const state = accordionConfig?.getState?.(target)
					const isExpanded =
						state === 'expanded' ||
						target.getAttribute('aria-expanded') === 'true'
					const accordionLabel =
						accordionConfig?.getLabel(target) ||
						target.textContent?.trim() ||
						'accordion item'
					this.captureUserAction({
						type: 'AccordionToggle',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: `${isExpanded ? 'Collapsed' : 'Expanded'} "${accordionLabel}"`,
						x: event.clientX,
						y: event.clientY,
						value: accordionLabel,
					})
				}
			},
			true,
		)
	}

	private setupDragDropTracking(): void {
		let dragStartElement: Element | null = null

		document.addEventListener(
			'dragstart',
			(event) => {
				dragStartElement = event.target as Element
				this.captureUserAction({
					type: 'DragStart',
					timestamp: Date.now(),
					elementId: this.getElementId(dragStartElement),
					selector: this.getElementSelector(dragStartElement),
					label: `Started dragging "${this.getElementLabel(dragStartElement)}"`,
					x: event.clientX,
					y: event.clientY,
					value: this.getElementLabel(dragStartElement),
				})
			},
			true,
		)

		document.addEventListener(
			'drop',
			(event) => {
				const dropTarget = event.target as Element
				if (dragStartElement) {
					this.captureUserAction({
						type: 'DragDrop',
						timestamp: Date.now(),
						elementId: this.getElementId(dropTarget),
						selector: this.getElementSelector(dropTarget),
						label: `Dropped "${this.getElementLabel(dragStartElement)}" onto "${this.getElementLabel(dropTarget)}"`,
						x: event.clientX,
						y: event.clientY,
						value: `${this.getElementLabel(dragStartElement)} → ${this.getElementLabel(dropTarget)}`,
					})
					dragStartElement = null
				}
			},
			true,
		)
	}

	private setupContextMenuTracking(): void {
		document.addEventListener(
			'contextmenu',
			(event) => {
				const target = event.target as Element
				this.captureUserAction({
					type: 'ContextMenu',
					timestamp: Date.now(),
					elementId: this.getElementId(target),
					selector: this.getElementSelector(target),
					label: `Right-clicked on "${this.getElementLabel(target)}"`,
					x: event.clientX,
					y: event.clientY,
					value: this.getElementLabel(target),
				})
			},
			true,
		)
	}

	private setupFileUploadTracking(): void {
		document.addEventListener(
			'change',
			(event) => {
				const target = event.target as HTMLInputElement
				if (target.type === 'file' && target.files && target.files.length > 0) {
					const fileNames = Array.from(target.files)
						.map((f) => f.name)
						.join(', ')
					this.captureUserAction({
						type: 'FileUpload',
						timestamp: Date.now(),
						elementId: this.getElementId(target),
						selector: this.getElementSelector(target),
						label: `Uploaded ${target.files.length} file(s): ${fileNames}`,
						x: 0,
						y: 0,
						value: fileNames,
					})
				}
			},
			true,
		)
	}

	private shouldMaskInput(element: HTMLInputElement): boolean {
		// Mask password fields and other sensitive inputs
		const sensitiveTypes = ['password', 'email', 'tel', 'ssn', 'credit-card']
		const sensitiveNames = [
			'password',
			'pass',
			'pwd',
			'email',
			'phone',
			'ssn',
			'social',
			'credit',
			'card',
		]

		if (sensitiveTypes.includes(element.type)) {
			return true
		}

		const name = (element.name || '').toLowerCase()
		const id = (element.id || '').toLowerCase()
		const className = (element.className || '').toLowerCase()

		return sensitiveNames.some(
			(sensitive) =>
				name.includes(sensitive) ||
				id.includes(sensitive) ||
				className.includes(sensitive),
		)
	}

	private getInputValue(element: HTMLInputElement): string {
		if (this.shouldMaskInput(element)) {
			return '***'
		}
		return element.value || ''
	}

	private getSelectValue(element: HTMLSelectElement): string {
		const selectedOption = element.options[element.selectedIndex]
		if (selectedOption) {
			// Return the display text, not the value
			return selectedOption.textContent?.trim() || selectedOption.value || ''
		}
		return element.value || ''
	}

	private hashString(str: string): number {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32-bit integer
		}
		return Math.abs(hash)
	}

	private shouldCapturePayload(url: string): boolean {
		// Don't capture payloads for our own API endpoints
		if (url.includes('/api/openreplay/')) return false

		// Don't capture large files or media
		if (
			url.match(/\.(jpg|jpeg|png|gif|svg|mp4|mp3|pdf|zip|woff2?|ttf|otf|eot)$/i)
		)
			return false

		// Don't capture analytics/tracking requests
		if (
			url.includes('google-analytics.com') ||
			url.includes('googletagmanager.com') ||
			url.includes('facebook.com/tr') ||
			url.includes('doubleclick.net') ||
			url.includes('googlesyndication.com')
		)
			return false

		// Capture API calls, GraphQL, and other significant requests
		if (
			url.includes('/api/') ||
			url.includes('/graphql') ||
			url.includes('.json') ||
			url.includes('/auth/')
		)
			return true

		// Capture testing endpoints (httpbin, jsonplaceholder, etc.)
		if (
			url.includes('httpbin.org') ||
			url.includes('jsonplaceholder.typicode.com') ||
			url.includes('reqres.in')
		)
			return true

		// For other requests, capture if they're likely to be important
		const shouldCapture = url.includes(window.location.origin)

		if (this.debug) {
			console.log('BugBasher: shouldCapturePayload decision:', {
				url,
				shouldCapture,
				origin: window.location.origin,
				isHttpbin: url.includes('httpbin.org'),
			})
		}

		return shouldCapture
	}

	private async getRequestBodySafe(
		init?: RequestInit,
	): Promise<string | undefined> {
		try {
			if (!init?.body) {
				if (this.debug) {
					console.log('BugBasher: getRequestBodySafe - no body in init')
				}
				return undefined
			}

			if (this.debug) {
				console.log(
					'BugBasher: getRequestBodySafe - processing body type:',
					typeof init.body,
					init.body?.constructor?.name,
				)
			}

			return await this.getRequestBody(init)
		} catch (error) {
			if (this.debug) {
				console.log('BugBasher: getRequestBodySafe - error:', error)
			}
			return undefined
		}
	}

	private async getRequestBody(
		init?: RequestInit,
	): Promise<string | undefined> {
		if (!init?.body) {
			if (this.debug) {
				console.log('BugBasher: getRequestBody - no body in init')
			}
			return undefined
		}

		try {
			if (this.debug) {
				console.log(
					'BugBasher: getRequestBody - body type:',
					typeof init.body,
					init.body?.constructor?.name,
				)
			}

			if (typeof init.body === 'string') {
				if (this.debug) {
					console.log(
						'BugBasher: getRequestBody - string body:',
						init.body.substring(0, 200),
					)
				}
				return init.body
			}
			if (init.body instanceof FormData) {
				// Convert FormData to a readable format
				const formEntries: string[] = []
				init.body.forEach((value, key) => {
					if (value instanceof File) {
						formEntries.push(
							`${key}: [File: ${value.name}, size: ${value.size}]`,
						)
					} else {
						formEntries.push(`${key}: ${value}`)
					}
				})
				const result = `FormData:\n${formEntries.join('\n')}`
				if (this.debug) {
					console.log('BugBasher: getRequestBody - FormData result:', result)
				}
				return result
			}
			if (init.body instanceof URLSearchParams) {
				const result = init.body.toString()
				if (this.debug) {
					console.log(
						'BugBasher: getRequestBody - URLSearchParams result:',
						result,
					)
				}
				return result
			}
			if (init.body instanceof ArrayBuffer) {
				const result = `[ArrayBuffer: ${init.body.byteLength} bytes]`
				if (this.debug) {
					console.log('BugBasher: getRequestBody - ArrayBuffer result:', result)
				}
				return result
			}
			if (init.body instanceof Blob) {
				// Try to read blob as text if it's small enough and text-based
				if (init.body.size < 10000) {
					try {
						const text = await init.body.text()
						if (this.debug) {
							console.log(
								'BugBasher: getRequestBody - Blob text result:',
								text.substring(0, 200),
							)
						}
						return text
					} catch {
						const result = `[Blob: ${init.body.size} bytes, type: ${init.body.type}]`
						if (this.debug) {
							console.log(
								'BugBasher: getRequestBody - Blob fallback result:',
								result,
							)
						}
						return result
					}
				}
				const result = `[Blob: ${init.body.size} bytes, type: ${init.body.type}]`
				if (this.debug) {
					console.log('BugBasher: getRequestBody - large Blob result:', result)
				}
				return result
			}
			// Handle ReadableStream and other types
			const result = '[Binary Data]'
			if (this.debug) {
				console.log('BugBasher: getRequestBody - binary data result:', result)
			}
			return result
		} catch (error) {
			if (this.debug) {
				console.log('BugBasher: getRequestBody - error:', error)
			}
			return undefined
		}
	}

	private async getResponseBodySafe(
		response: Response,
	): Promise<string | undefined> {
		try {
			if (this.debug) {
				console.log('BugBasher: getResponseBodySafe - processing response:', {
					status: response.status,
					contentType: response.headers.get('content-type'),
					bodyUsed: response.bodyUsed,
				})
			}

			return await this.getResponseBody(response)
		} catch (error) {
			if (this.debug) {
				console.log('BugBasher: getResponseBodySafe - error:', error)
			}
			return undefined
		}
	}

	private async getResponseBody(
		response: Response,
	): Promise<string | undefined> {
		try {
			const contentType = response.headers.get('content-type') || ''

			if (this.debug) {
				console.log(
					'BugBasher: getResponseBody - content-type:',
					contentType,
					'status:',
					response.status,
				)
			}

			// Only try to read text-based responses
			if (
				contentType.includes('application/json') ||
				contentType.includes('text/') ||
				contentType.includes('application/xml') ||
				contentType.includes('application/javascript') ||
				contentType.includes('application/x-www-form-urlencoded')
			) {
				// Clone the response to avoid consuming the original body
				const clonedResponse = response.clone()
				const text = await clonedResponse.text()

				if (this.debug) {
					console.log(
						'BugBasher: getResponseBody - text result length:',
						text.length,
						'preview:',
						text.substring(0, 200),
					)
				}

				// Limit response size to prevent memory issues
				if (text.length > 50000) {
					return text.substring(0, 50000) + '...[truncated]'
				}
				return text
			}

			// For binary content types, just show metadata
			const contentLength = response.headers.get('content-length')
			const result = `[${contentType || 'Unknown content type'}: ${contentLength || 'unknown size'} bytes]`

			if (this.debug) {
				console.log('BugBasher: getResponseBody - binary result:', result)
			}

			return result
		} catch (error) {
			const result = `[Error reading response: ${error instanceof Error ? error.message : 'Unknown error'}]`

			if (this.debug) {
				console.log('BugBasher: getResponseBody - error result:', result, error)
			}

			return result
		}
	}

	private captureNetworkRequest(request: NetworkRequest): void {
		if (!this.isActive) return

		// Format request and response data as JSON strings that the viewer expects
		const requestData = {
			headers: request.requestHeaders || {},
			body: request.request || '',
		}

		const responseData = {
			headers: request.responseHeaders || {},
			body: request.response || '',
		}

		if (this.debug) {
			console.log('BugBasher: Capturing network request:', {
				method: request.method,
				url: request.url,
				status: request.status,
				hasRequestHeaders: !!request.requestHeaders,
				hasResponseHeaders: !!request.responseHeaders,
				requestHeadersCount: request.requestHeaders
					? Object.keys(request.requestHeaders).length
					: 0,
				responseHeadersCount: request.responseHeaders
					? Object.keys(request.responseHeaders).length
					: 0,
				requestHeaders: request.requestHeaders,
				responseHeaders: request.responseHeaders,
				hasRequestBody: !!request.request,
				hasResponseBody: !!request.response,
				requestBodyLength: request.request ? request.request.length : 0,
				responseBodyLength: request.response ? request.response.length : 0,
				requestBodyPreview: request.request
					? request.request.substring(0, 100) +
						(request.request.length > 100 ? '...' : '')
					: 'none',
				responseBodyPreview: request.response
					? request.response.substring(0, 100) +
						(request.response.length > 100 ? '...' : '')
					: 'none',
				formattedRequestData: requestData,
				formattedResponseData: responseData,
				useExtensionStorage: this.useExtensionStorage,
			})
		}

		// Use extension storage if available
		if (this.useExtensionStorage && this.extensionSessionId) {
			extensionBridge.appendNetworkRequest(this.extensionSessionId, {
				method: request.method,
				url: request.url,
				status: request.status,
				request: request.request,
				response: request.response,
				requestHeaders: request.requestHeaders,
				responseHeaders: request.responseHeaders,
				timestamp: request.timestamp,
				duration: request.duration,
			})
			return
		}

		this.messageQueue.push({
			type: 'NetworkRequest',
			timestamp: request.timestamp,
			data: {
				type: 'Fetch',
				method: request.method,
				url: request.url,
				status: request.status,
				request: JSON.stringify(requestData),
				response: JSON.stringify(responseData),
				requestHeaders: request.requestHeaders, // Keep for backward compatibility
				responseHeaders: request.responseHeaders, // Keep for backward compatibility
				timestamp: request.timestamp,
				duration: request.duration,
			},
		})
	}

	private isSensitiveHeader(headerName: string): boolean {
		const sensitiveHeaders = [
			'authorization',
			'cookie',
			'set-cookie',
			'x-api-key',
			'x-auth-token',
			'x-access-token',
			'x-csrf-token',
			'x-xsrf-token',
			'proxy-authorization',
			'www-authenticate',
			'proxy-authenticate',
		]

		return sensitiveHeaders.includes(headerName.toLowerCase())
	}

	private captureConsoleMessage(message: ConsoleMessage): void {
		if (!this.isActive) return

		// Use extension storage if available
		if (this.useExtensionStorage && this.extensionSessionId) {
			extensionBridge.appendConsoleMessage(this.extensionSessionId, {
				level: message.level,
				message: message.message,
				timestamp: message.timestamp,
			})
			return
		}

		this.messageQueue.push({
			type: 'ConsoleLog',
			timestamp: message.timestamp,
			data: {
				type: 'ConsoleLog',
				level: message.level,
				value: message.message,
				timestamp: message.timestamp,
			},
		})
	}

	private captureUserAction(action: UserAction): void {
		if (!this.isActive) return

		// Use extension storage if available
		if (this.useExtensionStorage && this.extensionSessionId) {
			extensionBridge.appendUserAction(this.extensionSessionId, {
				type: action.type,
				timestamp: action.timestamp,
				elementId: action.elementId,
				selector: action.selector,
				label: action.label,
				x: action.x,
				y: action.y,
				value: action.value,
			})
			return
		}

		this.messageQueue.push({
			type: 'UserAction',
			timestamp: action.timestamp,
			data: {
				type: action.type,
				timestamp: action.timestamp,
				elementId: action.elementId,
				selector: action.selector,
				label: action.label,
				x: action.x,
				y: action.y,
				value: action.value,
			},
		})
	}

	private captureNavigation(navigation: NavigationEvent): void {
		if (!this.isActive) return

		// Use extension storage if available
		if (this.useExtensionStorage && this.extensionSessionId) {
			extensionBridge.appendNavigationEvent(this.extensionSessionId, {
				type: navigation.type,
				timestamp: navigation.timestamp,
				url: navigation.url,
				referrer: navigation.referrer,
				navigationStart: navigation.navigationStart,
				documentTitle: navigation.documentTitle,
			})
			return
		}

		this.messageQueue.push({
			type: 'Navigation',
			timestamp: navigation.timestamp,
			data: {
				type: navigation.type,
				timestamp: navigation.timestamp,
				url: navigation.url,
				referrer: navigation.referrer,
				navigationStart: navigation.navigationStart,
				documentTitle: navigation.documentTitle,
			},
		})
	}

	private setupNavigationMonitoring(): void {
		const self = this

		// Monitor hash changes
		window.addEventListener('hashchange', () => {
			self.captureNavigation({
				type: 'SetPageLocation',
				timestamp: Date.now(),
				url: window.location.href,
				referrer: document.referrer || '',
				navigationStart: Date.now(),
				documentTitle: document.title || '',
			})
		})

		// Monitor popstate (back/forward navigation)
		window.addEventListener('popstate', () => {
			self.captureNavigation({
				type: 'SetPageLocation',
				timestamp: Date.now(),
				url: window.location.href,
				referrer: document.referrer || '',
				navigationStart: Date.now(),
				documentTitle: document.title || '',
			})
		})

		// Monitor pushState/replaceState (SPA navigation)
		const originalPushState = history.pushState
		const originalReplaceState = history.replaceState

		history.pushState = function (...args) {
			originalPushState.apply(history, args)
			setTimeout(() => {
				if (self.isActive) {
					self.captureNavigation({
						type: 'SetPageLocation',
						timestamp: Date.now(),
						url: window.location.href,
						referrer: document.referrer || '',
						navigationStart: Date.now(),
						documentTitle: document.title || '',
					})
				}
			}, 0)
		}

		history.replaceState = function (...args) {
			originalReplaceState.apply(history, args)
			setTimeout(() => {
				if (self.isActive) {
					self.captureNavigation({
						type: 'SetPageLocation',
						timestamp: Date.now(),
						url: window.location.href,
						referrer: document.referrer || '',
						navigationStart: Date.now(),
						documentTitle: document.title || '',
					})
				}
			}, 0)
		}
	}

	private captureWebSocketEvent(event: WebSocketEvent): void {
		if (!this.isActive) return

		this.messageQueue.push({
			type: 'WSChannel',
			timestamp: event.timestamp,
			data: {
				type: 'WSChannel',
				channelType: 'websocket',
				channelName: event.url,
				data: `WebSocket ${event.event}${event.code ? ` (${event.code})` : ''}${event.reason ? `: ${event.reason}` : ''}`,
				timestamp: event.timestamp,
				direction: 'system',
				messageType: event.event,
			},
		})
	}

	private captureWebSocketMessage(message: WebSocketMessage): void {
		if (!this.isActive) return

		this.messageQueue.push({
			type: 'WSChannel',
			timestamp: message.timestamp,
			data: {
				type: 'WSChannel',
				channelType: 'websocket',
				channelName: message.url,
				data: message.data,
				timestamp: message.timestamp,
				direction: message.direction,
				messageType: 'message',
			},
		})
	}

	private captureResourceTiming(resource: ResourceTiming): void {
		if (!this.isActive) return

		// Only capture significant resources (not tiny tracking pixels, etc.)
		if (
			resource.transferSize < 100 &&
			!this.isSignificantResource(resource.name)
		) {
			return
		}

		this.messageQueue.push({
			type: 'ResourceTiming',
			timestamp: resource.timestamp,
			data: {
				type: 'ResourceTiming',
				name: resource.name,
				initiatorType: resource.initiatorType,
				startTime: resource.startTime,
				duration: resource.duration,
				transferSize: resource.transferSize,
				encodedBodySize: resource.encodedBodySize,
				decodedBodySize: resource.decodedBodySize,
				timestamp: resource.timestamp,
			},
		})
	}

	private captureResourceLoad(resource: ResourceLoad): void {
		if (!this.isActive) return

		this.messageQueue.push({
			type: 'ResourceLoad',
			timestamp: resource.timestamp,
			data: {
				type: 'ResourceLoad',
				url: resource.url,
				status: resource.status,
				timestamp: resource.timestamp,
				duration: resource.duration,
				width: resource.width,
				height: resource.height,
			},
		})
	}

	private serializeWebSocketData(data: any): string {
		try {
			if (typeof data === 'string') {
				return data.length > 1000 ? data.substring(0, 1000) + '...' : data
			}
			if (data instanceof ArrayBuffer) {
				return `[ArrayBuffer: ${data.byteLength} bytes]`
			}
			if (data instanceof Blob) {
				return `[Blob: ${data.size} bytes, type: ${data.type}]`
			}
			return String(data)
		} catch {
			return '[Unserializable Data]'
		}
	}

	private isSignificantResource(url: string): boolean {
		// Consider fonts, stylesheets, scripts, and main images as significant
		return (
			/\.(css|js|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp)$/i.test(url) ||
			url.includes('/api/') ||
			url.includes('/graphql')
		)
	}

	private startBatchProcessing(): void {
		this.batchTimer = window.setInterval(() => {
			this.flushMessages()
		}, 5000) // Send batch every 5 seconds
	}

	private async flushMessages(): Promise<void> {
		if (!this.session || this.messageQueue.length === 0) return

		const messages = [...this.messageQueue]
		this.messageQueue = []

		if (this.debug) {
			console.log('BugBasher: Sending messages to server:', messages.length)
			console.log(
				'BugBasher: Message types:',
				messages.map((m) => m.type),
			)

			// Log network request details for debugging
			const networkMessages = messages.filter(
				(m) => m.type === 'NetworkRequest',
			)
			if (networkMessages.length > 0) {
				console.log(
					'BugBasher: Network requests being sent:',
					networkMessages.map((m) => ({
						method: m.data.method,
						url: m.data.url,
						status: m.data.status,
						hasRequestHeaders: !!m.data.requestHeaders,
						hasResponseHeaders: !!m.data.responseHeaders,
						requestHeaderCount: m.data.requestHeaders
							? Object.keys(m.data.requestHeaders).length
							: 0,
						responseHeaderCount: m.data.responseHeaders
							? Object.keys(m.data.responseHeaders).length
							: 0,
					})),
				)
			}
		}

		try {
			// Send as JSON instead of binary since we're not implementing the full binary protocol
			const response = await fetch(this.session.ingestPoint, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.session.sessionToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(messages),
			})

			if (!response.ok) {
				if (this.debug) {
					console.warn('BugBasher: Failed to send messages:', response.status)
					const responseText = await response.text()
					console.warn('BugBasher: Server response:', responseText)
				}
			} else if (this.debug) {
				console.log('BugBasher: Messages sent successfully')
			}
		} catch (error) {
			if (this.debug) {
				console.warn('BugBasher: Error sending messages:', error)
			}
			// Re-queue messages for retry
			this.messageQueue.unshift(...messages)
		}
	}

	private createBinaryMessages(messages: any[]): Uint8Array {
		// This method is no longer used since we're sending JSON
		// Keeping it for potential future binary implementation
		const jsonData = JSON.stringify(messages)
		return new TextEncoder().encode(jsonData)
	}

	getSessionToken(): string | null {
		return this.session?.sessionToken ?? null
	}

	getSessionId(): string | null {
		if (this.useExtensionStorage) {
			return this.extensionSessionId
		}
		return this.session?.sessionID ?? null
	}

	isUsingExtensionStorage(): boolean {
		return this.useExtensionStorage
	}

	async getSessionLogs(): Promise<
		import('./extension-bridge.js').SessionLogData | null
	> {
		if (!this.useExtensionStorage || !this.extensionSessionId) {
			return null
		}
		const result = await extensionBridge.getSessionLogs(this.extensionSessionId)
		if (result.ok) {
			return result.payload
		}
		return null
	}

	getSessionURL(): string | null {
		if (!this.session) return null
		// Construct session URL - adjust based on your frontend routing
		return `${this.apiOrigin}/sessions/${this.session.sessionID}`
	}

	setUser(userId: string, metadata?: Record<string, any>): void {
		this.userId = userId
		if (metadata) {
			this.metadata = { ...this.metadata, ...metadata }
		}

		// Send user identification message
		if (this.isActive) {
			this.messageQueue.push({
				type: 'UserID',
				timestamp: Date.now(),
				data: {
					type: 'UserID',
					userId,
					timestamp: Date.now(),
				},
			})

			if (metadata) {
				Object.entries(metadata).forEach(([key, value]) => {
					this.messageQueue.push({
						type: 'Metadata',
						timestamp: Date.now(),
						data: {
							type: 'Metadata',
							key,
							value: String(value),
							timestamp: Date.now(),
						},
					})
				})
			}
		}
	}

	trackEvent(name: string, payload?: Record<string, any>): void {
		if (!this.isActive) return

		this.messageQueue.push({
			type: 'CustomEvent',
			timestamp: Date.now(),
			data: {
				type: 'CustomEvent',
				name,
				payload: payload ? JSON.stringify(payload) : '',
				timestamp: Date.now(),
			},
		})
	}

	isInitialized(): boolean {
		return this.session !== null && this.isActive
	}

	stop(): void {
		if (this.isActive) {
			this.isActive = false

			// Flush remaining messages
			this.flushMessages()

			// Clear batch timer
			if (this.batchTimer) {
				clearInterval(this.batchTimer)
				this.batchTimer = null
			}

			// Restore original functions
			window.fetch = this.originalFetch
			console.log = this.originalConsole.log
			console.warn = this.originalConsole.warn
			console.error = this.originalConsole.error
			console.info = this.originalConsole.info
			console.debug = this.originalConsole.debug

			// Clean up Performance Observer
			const observer = (this as any)._performanceObserver
			if (observer) {
				observer.disconnect()
				delete (this as any)._performanceObserver
			}

			// Note: We don't restore WebSocket and Image constructors as they might be in use
			// They will be garbage collected when the page unloads

			// Clean up global reference
			delete (window as any).bugbasherOpenReplay

			this.session = null

			if (this.debug) {
				console.log('BugBasher: OpenReplay integration stopped')
			}
		}
	}

	// Helper methods for UI pattern detection
	private getTagDescription(tagName: string): string {
		const tagDescriptions: Record<string, string> = {
			button: 'Button',
			a: 'Link',
			input: 'Input Field',
			textarea: 'Text Area',
			select: 'Dropdown',
			img: 'Image',
			div: 'Page Element',
			span: 'Text Element',
			p: 'Paragraph',
			h1: 'Heading',
			h2: 'Heading',
			h3: 'Heading',
			h4: 'Heading',
			h5: 'Heading',
			h6: 'Heading',
			nav: 'Navigation',
			header: 'Header',
			footer: 'Footer',
			main: 'Main Content',
			section: 'Section',
			article: 'Article',
			aside: 'Sidebar',
			form: 'Form',
			table: 'Table',
			ul: 'List',
			ol: 'List',
			li: 'List Item',
		}

		return tagDescriptions[tagName] || 'Element'
	}
}
