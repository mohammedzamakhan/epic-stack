import { promisify } from 'node:util'
import * as zlib from 'node:zlib'
import { type ActionFunctionArgs } from 'react-router'
import {
	verifySessionToken,
	storeOpenReplaySessionData,
	createOrUpdateOpenReplaySession,
	type OpenReplayMessage,
} from '#app/utils/openreplay.server.ts'

const gunzip = promisify(zlib.gunzip)

// OpenReplay message schemas and names (from working Next.js implementation)
const MESSAGE_SCHEMAS = {
	0: ['u'], // Timestamp
	4: ['s', 's', 'u'], // SetPageLocationDeprecated
	5: ['u', 'u'], // SetViewportSize
	6: ['i', 'i'], // SetViewportScroll
	7: [], // CreateDocument
	8: ['u', 'u', 'u', 's', 'b'], // CreateElementNode
	9: ['u', 'u', 'u'], // CreateTextNode
	10: ['u', 'u', 'u'], // MoveNode
	11: ['u'], // RemoveNode
	12: ['u', 's', 's'], // SetNodeAttribute
	13: ['u', 's'], // RemoveNodeAttribute
	14: ['u', 's'], // SetNodeData
	16: ['u', 'i', 'i'], // SetNodeScroll
	17: ['u', 's'], // SetInputTarget
	18: ['u', 's', 'i'], // SetInputValue
	19: ['u', 'b'], // SetInputChecked
	20: ['u', 'u'], // MouseMove
	21: ['s', 's', 's', 's', 's', 'u', 'u', 'u'], // NetworkRequestDeprecated
	22: ['s', 's'], // ConsoleLog
	23: ['u', 'u', 'u', 'u', 'u', 'u', 'u', 'u', 'u'], // PageLoadTiming
	24: ['u', 'u', 'u'], // PageRenderTiming
	27: ['s', 's'], // CustomEvent
	28: ['s'], // UserID
	29: ['s'], // UserAnonymousID
	30: ['s', 's'], // Metadata
	34: ['u', 's'], // StringDictGlobal
	35: ['u', 'u', 'u'], // SetNodeAttributeDictGlobal
	36: ['u', 's'], // NodeAnimationResult
	37: ['u', 's', 'u'], // CSSInsertRule
	38: ['u', 'u'], // CSSDeleteRule
	39: ['s', 's', 's', 's', 'u', 'u', 'u'], // Fetch
	40: ['s', 'u', 's', 's'], // Profiler
	41: ['s', 's'], // OTable
	42: ['s'], // StateAction
	43: ['s', 's'], // StringDict
	44: ['s', 's', 'u'], // ReduxDeprecated
	45: ['s', 's'], // Vuex
	46: ['s', 's'], // MobX
	47: ['s', 's', 'u'], // NgRx
	48: ['s', 's', 's', 's', 'i'], // GraphQLDeprecated
	49: ['i', 'i', 'u', 'u'], // PerformanceTrack
	50: ['u', 's'], // StringDictDeprecated
	51: ['u', 'u', 'u'], // SetNodeAttributeDictDeprecated
	52: ['u', 's', 's'], // SetNodeAttributeDict
	53: ['u', 'u', 'u', 'u', 'u', 'u', 's', 's'], // ResourceTimingDeprecatedDeprecated
	54: ['u', 's'], // ConnectionInformation
	55: ['b'], // SetPageVisibility
	57: ['u', 's', 's', 's'], // LoadFontFace
	58: ['i'], // SetNodeFocus
	59: ['u', 'u', 'u', 'u', 's', 's', 's'], // LongTask
	60: ['u', 's', 's', 's'], // SetNodeAttributeURLBased
	61: ['u', 's', 's'], // SetCSSDataURLBased
	63: ['s', 's'], // TechnicalInfo
	64: ['s', 's'], // CustomIssue
	65: ['u', 'u'], // SetNodeSlot
	67: ['u', 's', 'u', 's'], // CSSInsertRuleURLBased
	68: ['u', 'u', 's', 's', 'u', 'u'], // MouseClick
	69: ['u', 'u', 's', 's'], // MouseClickDeprecated
	70: ['u', 'u'], // CreateIFrameDocument
	71: ['u', 's', 's'], // AdoptedSSReplaceURLBased
	73: ['u', 's', 'u', 's'], // AdoptedSSInsertRuleURLBased
	75: ['u', 'u'], // AdoptedSSDeleteRule
	76: ['u', 'u'], // AdoptedSSAddOwner
	77: ['u', 'u'], // AdoptedSSRemoveOwner
	78: ['s', 's', 's', 's'], // JSException
	79: ['s', 's'], // Zustand
	81: ['u', 'u', 'u', 'i', 's'], // BatchMetadata
	82: ['u', 'u'], // PartitionedMessage
	83: ['s', 's', 's', 's', 's', 'u', 'u', 'u', 'u'], // NetworkRequest
	84: ['s', 's', 's', 'u', 's', 's'], // WSChannel
	85: [
		'u',
		'u',
		'u',
		'u',
		'u',
		'u',
		's',
		's',
		'u',
		'b',
		'u',
		'u',
		'u',
		'u',
		'u',
		'u',
		'u',
	], // ResourceTiming
	87: ['s', 'i', 'i'], // Incident
	89: ['s', 'i', 'i', 'i', 'i', 's'], // LongAnimationTask
	112: ['u', 's', 'b', 's', 'i', 'i'], // InputChange
	113: ['u', 'u', 's'], // SelectionChange
	114: ['u'], // MouseThrashing
	115: ['u'], // UnbindNodes
	116: ['u', 'u', 'u', 'u', 'u', 'u', 's', 's', 'u', 'b'], // ResourceTimingDeprecated
	117: ['s'], // TabChange
	118: ['s'], // TabData
	119: ['s', 'u'], // CanvasNode
	120: ['i'], // TagTrigger
	121: ['s', 's', 'u', 'u'], // Redux
	122: ['s', 's', 'u', 's'], // SetPageLocation
	123: ['s', 's', 's', 's', 'u'], // GraphQL
	124: ['s', 's'], // WebVitals
} as const

const MESSAGE_NAMES = {
	0: 'Timestamp',
	4: 'SetPageLocationDeprecated',
	5: 'SetViewportSize',
	6: 'SetViewportScroll',
	7: 'CreateDocument',
	8: 'CreateElementNode',
	9: 'CreateTextNode',
	10: 'MoveNode',
	11: 'RemoveNode',
	12: 'SetNodeAttribute',
	13: 'RemoveNodeAttribute',
	14: 'SetNodeData',
	16: 'SetNodeScroll',
	17: 'SetInputTarget',
	18: 'SetInputValue',
	19: 'SetInputChecked',
	20: 'MouseMove',
	21: 'NetworkRequestDeprecated',
	22: 'ConsoleLog',
	23: 'PageLoadTiming',
	24: 'PageRenderTiming',
	27: 'CustomEvent',
	28: 'UserID',
	29: 'UserAnonymousID',
	30: 'Metadata',
	34: 'StringDictGlobal',
	35: 'SetNodeAttributeDictGlobal',
	36: 'NodeAnimationResult',
	37: 'CSSInsertRule',
	38: 'CSSDeleteRule',
	39: 'Fetch',
	40: 'Profiler',
	41: 'OTable',
	42: 'StateAction',
	43: 'StringDict',
	44: 'ReduxDeprecated',
	45: 'Vuex',
	46: 'MobX',
	47: 'NgRx',
	48: 'GraphQLDeprecated',
	49: 'PerformanceTrack',
	50: 'StringDictDeprecated',
	51: 'SetNodeAttributeDictDeprecated',
	52: 'SetNodeAttributeDict',
	53: 'ResourceTimingDeprecatedDeprecated',
	54: 'ConnectionInformation',
	55: 'SetPageVisibility',
	57: 'LoadFontFace',
	58: 'SetNodeFocus',
	59: 'LongTask',
	60: 'SetNodeAttributeURLBased',
	61: 'SetCSSDataURLBased',
	63: 'TechnicalInfo',
	64: 'CustomIssue',
	65: 'SetNodeSlot',
	67: 'CSSInsertRuleURLBased',
	68: 'MouseClick',
	69: 'MouseClickDeprecated',
	70: 'CreateIFrameDocument',
	71: 'AdoptedSSReplaceURLBased',
	73: 'AdoptedSSInsertRuleURLBased',
	75: 'AdoptedSSDeleteRule',
	76: 'AdoptedSSAddOwner',
	77: 'AdoptedSSRemoveOwner',
	78: 'JSException',
	79: 'Zustand',
	81: 'BatchMetadata',
	82: 'PartitionedMessage',
	83: 'NetworkRequest',
	84: 'WSChannel',
	85: 'ResourceTiming',
	87: 'Incident',
	89: 'LongAnimationTask',
	112: 'InputChange',
	113: 'SelectionChange',
	114: 'MouseThrashing',
	115: 'UnbindNodes',
	116: 'ResourceTimingDeprecated',
	117: 'TabChange',
	118: 'TabData',
	119: 'CanvasNode',
	120: 'TagTrigger',
	121: 'Redux',
	122: 'SetPageLocation',
	123: 'GraphQL',
	124: 'WebVitals',
} as const

interface DecodedMessage {
	type: number
	name: string
	fields: any[]
}

interface FilteredMessages {
	consoleLogs: any[]
	networkRequests: any[]
	userActions: any[]
	navigation: any[]
}

/**
 * OpenReplay data ingestion endpoint
 * POST /api/openreplay/v1/web/i
 *
 * This endpoint receives binary message data from the OpenReplay SDK,
 * decodes it using the proper OpenReplay binary protocol, filters for
 * relevant messages, and stores the processed data.
 */
export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	try {
		// Verify JWT token from Authorization header
		const authHeader = request.headers.get('Authorization')
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return new Response('Unauthorized', { status: 401 })
		}

		const token = authHeader.substring(7)

		let sessionData: any
		try {
			sessionData = verifySessionToken(token)
		} catch {
			return new Response('Invalid token', { status: 401 })
		}

		// Get binary data from request body
		const arrayBuffer = await request.arrayBuffer()
		let data = Buffer.from(arrayBuffer)

		// Handle gzip compression
		const contentEncoding = request.headers.get('content-encoding')
		if (contentEncoding && contentEncoding.toLowerCase() === 'gzip') {
			data = await gunzip(data)
		}

		console.log('[openreplay] Batch processing...', {
			origin: request.headers.get('origin') || null,
			method: 'POST',
			enc: contentEncoding || null,
			dataSize: data.length,
			contentType: request.headers.get('content-type'),
		})

		let messages: any[]
		let filteredMessages: FilteredMessages

		// Try to decode as binary first, fallback to JSON
		const contentType = request.headers.get('content-type') || ''
		if (contentType.includes('application/json')) {
			// Handle JSON data from our lightweight client
			try {
				const jsonData = JSON.parse(data.toString('utf8'))
				messages = Array.isArray(jsonData) ? jsonData : [jsonData]
				console.log('[openreplay] Processing JSON messages:', messages.length)

				// Convert JSON messages to the expected format
				filteredMessages = processJsonMessages(messages)
			} catch (error) {
				console.error('[openreplay] Failed to parse JSON messages:', error)
				return new Response(JSON.stringify({ error: 'Invalid JSON data' }), {
					status: 400,
					headers: buildCorsHeaders(request),
				})
			}
		} else {
			// Handle binary OpenReplay protocol
			try {
				messages = decode(data)
				console.log('[openreplay] Processing binary messages:', messages.length)
				filteredMessages = filterMessages(messages)
			} catch (error) {
				console.error('[openreplay] Failed to decode binary messages:', error)
				return new Response(JSON.stringify({ error: 'Invalid binary data' }), {
					status: 400,
					headers: buildCorsHeaders(request),
				})
			}
		}

		// Ensure the session exists in the database
		await createOrUpdateOpenReplaySession(
			sessionData.sessionId,
			sessionData.projectKey,
			sessionData.userUUID,
			sessionData.metadata,
		)

		// Convert to the format expected by storeOpenReplaySessionData
		const openReplayMessages: OpenReplayMessage[] = [
			...filteredMessages.consoleLogs.map((msg) => ({
				type: msg.type,
				timestamp: msg.timestamp,
				data: msg,
			})),
			...filteredMessages.networkRequests.map((msg) => ({
				type: msg.type,
				timestamp: msg.timestamp,
				data: msg,
			})),
			...filteredMessages.userActions.map((msg) => ({
				type: msg.type,
				timestamp: msg.timestamp,
				data: msg,
			})),
			...filteredMessages.navigation.map((msg) => ({
				type: msg.type,
				timestamp: msg.timestamp,
				data: msg,
			})),
		]

		await storeOpenReplaySessionData(sessionData.sessionId, openReplayMessages)

		console.log(
			`[openreplay] Processed ${openReplayMessages.length} relevant messages`,
		)
		if (filteredMessages.networkRequests.length > 0) {
			console.log(
				`[openreplay] Network requests captured: ${filteredMessages.networkRequests.length}`,
			)
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: buildCorsHeaders(request),
		})
	} catch (error) {
		console.error('[openreplay] Batch processing error:', error)
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: buildCorsHeaders(request),
		})
	}
}

/**
 * Handle preflight OPTIONS requests for CORS
 */
export async function loader({ request }: { request: Request }) {
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: buildCorsHeaders(request),
		})
	}

	if (request.method === 'HEAD') {
		return new Response(null, {
			status: 204,
			headers: buildCorsHeaders(request),
		})
	}

	// Some SDKs may probe with GET; respond 204 to satisfy CORS checks
	if (request.method === 'GET') {
		return new Response(null, {
			status: 204,
			headers: buildCorsHeaders(request),
		})
	}

	return new Response('Method not allowed', { status: 405 })
}

/**
 * Build CORS headers for OpenReplay SDK compatibility
 */
function buildCorsHeaders(request: Request): Headers {
	const headers = new Headers()
	const origin = request.headers.get('origin')

	if (origin) {
		headers.set('Access-Control-Allow-Origin', origin)
		headers.set('Access-Control-Allow-Credentials', 'true')
		headers.append('Vary', 'Origin')
	} else {
		headers.set('Access-Control-Allow-Origin', '*')
	}

	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, HEAD')
	headers.set(
		'Access-Control-Allow-Headers',
		request.headers.get('access-control-request-headers') ||
			'content-type, content-encoding, authorization, accept, origin, referer, x-openreplay-token, x-openreplay-sessionid',
	)
	headers.set('Access-Control-Allow-Private-Network', 'true')
	headers.set('Access-Control-Expose-Headers', 'content-length, content-type')
	headers.set('Access-Control-Max-Age', '86400')
	headers.set('Cache-Control', 'no-store, max-age=0')

	return headers
}

/**
 * Decode OpenReplay binary messages using the proper protocol
 * This follows the exact OpenReplay binary format specification
 */
function decode(data: Uint8Array): DecodedMessage[] {
	const messages: DecodedMessage[] = []
	let offset = 0

	function readUint(): number {
		let result = 0
		let shift = 0
		let byte: number

		do {
			if (offset >= data.length) {
				throw new Error('Unexpected end of data while reading uint')
			}
			byte = data[offset++]!
			result |= (byte & 0x7f) << shift
			shift += 7
		} while (byte & 0x80)

		return result
	}

	function readInt(): number {
		const n = readUint()
		return (n >>> 1) ^ -(n & 1)
	}

	function readBoolean(): boolean {
		if (offset >= data.length) {
			throw new Error('Unexpected end of data while reading boolean')
		}
		return data[offset++]! !== 0
	}

	function readString(): string {
		const length = readUint()
		if (offset + length > data.length) {
			throw new Error('Unexpected end of data while reading string')
		}
		const bytes = data.subarray(offset, offset + length)
		offset += length
		return new TextDecoder().decode(bytes)
	}

	// Read 3-byte little-endian size
	function readSize(): number {
		if (offset + 3 > data.length) {
			throw new Error('Unexpected end of data while reading size')
		}
		const size =
			data[offset]! | (data[offset + 1]! << 8) | (data[offset + 2]! << 16)
		offset += 3
		return size
	}

	function readFields(schema: readonly string[]): any[] {
		const fields: any[] = []
		for (const fieldType of schema) {
			switch (fieldType) {
				case 'u':
					fields.push(readUint())
					break
				case 'i':
					fields.push(readInt())
					break
				case 's':
					fields.push(readString())
					break
				case 'b':
					fields.push(readBoolean())
					break
			}
		}
		return fields
	}

	let isFirstMessage = true

	while (offset < data.length) {
		const startOffset = offset
		try {
			const messageType = readUint()
			const schema =
				MESSAGE_SCHEMAS[messageType as keyof typeof MESSAGE_SCHEMAS]

			if (!schema) {
				console.error(
					`Unknown message type: ${messageType} at offset ${startOffset}. Stopping decode.`,
				)
				break
			}

			const message: DecodedMessage = {
				type: messageType,
				name: MESSAGE_NAMES[messageType as keyof typeof MESSAGE_NAMES],
				fields: [],
			}

			if (isFirstMessage) {
				// First message (BatchMetadata) has NO size prefix
				if (messageType !== 81) {
					console.warn(
						`Expected BatchMetadata (81) as first message, got ${messageType}`,
					)
				}
				message.fields = readFields(schema)
				isFirstMessage = false
			} else {
				// All other messages have a 3-byte size prefix AFTER the type
				const size = readSize()
				const expectedEnd = offset + size
				message.fields = readFields(schema)

				// Verify we read exactly the right amount
				if (offset !== expectedEnd) {
					console.warn(
						`Size mismatch for ${message.name}: expected to end at ${expectedEnd}, actually at ${offset}`,
					)
					offset = expectedEnd // Correct the offset
				}
			}

			messages.push(message)
		} catch (e) {
			console.error(
				`Decode error at offset ${startOffset}:`,
				(e as Error).message,
			)
			break
		}
	}

	return messages
}

/**
 * Process JSON messages from our lightweight client
 */
function processJsonMessages(messages: any[]): FilteredMessages {
	const filtered: FilteredMessages = {
		consoleLogs: [],
		networkRequests: [],
		userActions: [],
		navigation: [],
	}

	for (const msg of messages) {
		if (!msg.type || !msg.data) continue

		switch (msg.type) {
			case 'ConsoleLog':
				filtered.consoleLogs.push({
					type: msg.data.type || 'ConsoleLog',
					timestamp: msg.timestamp || msg.data.timestamp || Date.now(),
					level: msg.data.level || 'log',
					value: msg.data.value || msg.data.message || '',
				})
				break

			case 'NetworkRequest':
				let requestHeaders: Record<string, string> = {}
				let responseHeaders: Record<string, string> = {}
				let requestBody = ''
				let responseBody = ''

				// Parse request data if it's a JSON string
				if (msg.data.request) {
					try {
						const requestData = JSON.parse(msg.data.request)
						requestHeaders = requestData.headers || {}
						requestBody = requestData.body || ''
					} catch {
						// If parsing fails, treat as plain string
						requestBody = msg.data.request
					}
				}

				// Parse response data if it's a JSON string
				if (msg.data.response) {
					try {
						const responseData = JSON.parse(msg.data.response)
						responseHeaders = responseData.headers || {}
						responseBody = responseData.body || ''
					} catch {
						// If parsing fails, treat as plain string
						responseBody = msg.data.response
					}
				}

				// Also check for headers passed as separate properties (backward compatibility)
				if (
					msg.data.requestHeaders &&
					Object.keys(msg.data.requestHeaders).length > 0
				) {
					requestHeaders = { ...requestHeaders, ...msg.data.requestHeaders }
				}
				if (
					msg.data.responseHeaders &&
					Object.keys(msg.data.responseHeaders).length > 0
				) {
					responseHeaders = { ...responseHeaders, ...msg.data.responseHeaders }
				}

				const networkRequest = {
					type: msg.data.type || 'NetworkRequest',
					timestamp: msg.timestamp || msg.data.timestamp || Date.now(),
					method: msg.data.method || 'GET',
					url: msg.data.url || '',
					status: msg.data.status || 0,
					request: msg.data.request, // Keep original JSON string for viewer
					response: msg.data.response, // Keep original JSON string for viewer
					requestHeaders,
					responseHeaders,
					duration: msg.data.duration || 0,
				}

				console.log('[openreplay] Processing NetworkRequest:', {
					url: networkRequest.url,
					method: networkRequest.method,
					status: networkRequest.status,
					hasRequestHeaders:
						!!requestHeaders && Object.keys(requestHeaders).length > 0,
					hasResponseHeaders:
						!!responseHeaders && Object.keys(responseHeaders).length > 0,
					requestHeadersCount: Object.keys(requestHeaders).length,
					responseHeadersCount: Object.keys(responseHeaders).length,
					requestHeaders: requestHeaders,
					responseHeaders: responseHeaders,
					hasRequestBody: !!requestBody,
					hasResponseBody: !!responseBody,
					requestBodyPreview: requestBody
						? requestBody.substring(0, 100) +
							(requestBody.length > 100 ? '...' : '')
						: 'none',
					responseBodyPreview: responseBody
						? responseBody.substring(0, 100) +
							(responseBody.length > 100 ? '...' : '')
						: 'none',
				})

				filtered.networkRequests.push(networkRequest)
				break

			case 'WSChannel':
				filtered.networkRequests.push({
					type: 'WSChannel',
					timestamp: msg.timestamp || msg.data.timestamp || Date.now(),
					channelType: msg.data.channelType || 'websocket',
					channelName: msg.data.channelName || msg.data.url || '',
					data: msg.data.data || '',
					direction: msg.data.direction || 'unknown',
					messageType: msg.data.messageType || 'message',
				})
				break

			case 'ResourceTiming':
				// Handle resource timing data
				break

			case 'ResourceLoad':
				// Handle resource load data
				break

			case 'UserID':
			case 'Metadata':
			case 'CustomEvent':
				// Handle user identification and custom events
				break

			case 'Navigation':
				filtered.navigation.push({
					type: msg.data.type || 'SetPageLocation',
					timestamp: msg.timestamp || msg.data.timestamp || Date.now(),
					url: msg.data.url || '',
					referrer: msg.data.referrer || '',
					navigationStart:
						msg.data.navigationStart || msg.timestamp || Date.now(),
					documentTitle: msg.data.documentTitle || '',
				})
				break

			case 'UserAction':
				filtered.userActions.push({
					type: msg.data.type || 'UserAction',
					timestamp: msg.timestamp || msg.data.timestamp || Date.now(),
					elementId: msg.data.elementId || 0,
					selector: msg.data.selector || '',
					label: msg.data.label || '',
					x: msg.data.x || 0,
					y: msg.data.y || 0,
					value: msg.data.value || '',
				})
				break

			default:
				if (
					msg.type.includes('Mouse') ||
					msg.type.includes('Input') ||
					msg.type.includes('Click') ||
					msg.type.includes('Modal') ||
					msg.type.includes('Dropdown') ||
					msg.type.includes('Tab') ||
					msg.type.includes('Accordion') ||
					msg.type.includes('Drag') ||
					msg.type.includes('Context') ||
					msg.type.includes('File')
				) {
					filtered.userActions.push({
						type: msg.type,
						timestamp: msg.timestamp || msg.data.timestamp || Date.now(),
						...msg.data,
					})
				} else if (
					msg.type.includes('PageLocation') ||
					msg.type.includes('Navigation')
				) {
					filtered.navigation.push({
						type: msg.type,
						timestamp: msg.timestamp || msg.data.timestamp || Date.now(),
						...msg.data,
					})
				}
				break
		}
	}

	return filtered
}

/**
 * Filter messages to extract relevant data for bug reporting
 */
function filterMessages(messages: DecodedMessage[]): FilteredMessages {
	// Message types we care about
	const CONSOLE_LOGS = [22] // ConsoleLog
	const NETWORK_REQUESTS = [
		21, // NetworkRequestDeprecated
		39, // Fetch
		83, // NetworkRequest
		84, // WSChannel (WebSocket)
	]
	const USER_ACTIONS = [
		68, // MouseClick
		69, // MouseClickDeprecated
		18, // SetInputValue
		19, // SetInputChecked
		112, // InputChange
		16, // SetNodeScroll
		6, // SetViewportScroll
	]
	const NAVIGATION = [
		4, // SetPageLocationDeprecated
		122, // SetPageLocation
	]

	const RELEVANT_TYPES = new Set([
		...CONSOLE_LOGS,
		...NETWORK_REQUESTS,
		...USER_ACTIONS,
		...NAVIGATION,
	])

	const filtered: FilteredMessages = {
		consoleLogs: [],
		networkRequests: [],
		userActions: [],
		navigation: [],
	}

	// Track the current timestamp from Timestamp messages
	let currentTimestamp = 0

	for (const msg of messages) {
		// Update timestamp when we see a Timestamp message (type 0)
		if (msg.type === 0) {
			currentTimestamp = msg.fields[0]
			continue
		}

		// Also capture timestamp from BatchMetadata (type 81) as initial value
		if (msg.type === 81) {
			// BatchMetadata: [version, pageNo, firstIndex, timestamp, location]
			currentTimestamp = msg.fields[3]
			continue
		}

		if (!RELEVANT_TYPES.has(msg.type)) continue

		if (CONSOLE_LOGS.includes(msg.type)) {
			// ConsoleLog: [level, value]
			filtered.consoleLogs.push({
				type: msg.name,
				timestamp: currentTimestamp,
				level: msg.fields[0],
				value: msg.fields[1],
			})
		} else if (NETWORK_REQUESTS.includes(msg.type)) {
			if (msg.type === 21) {
				// NetworkRequestDeprecated: [type, method, url, request, response, status, timestamp, duration]
				filtered.networkRequests.push({
					type: msg.name,
					requestType: msg.fields[0],
					method: msg.fields[1],
					url: msg.fields[2],
					request: msg.fields[3],
					response: msg.fields[4],
					status: msg.fields[5],
					timestamp: msg.fields[6], // Has its own timestamp
					duration: msg.fields[7],
				})
			} else if (msg.type === 39) {
				// Fetch: [method, url, request, response, status, timestamp, duration]
				filtered.networkRequests.push({
					type: msg.name,
					method: msg.fields[0],
					url: msg.fields[1],
					request: msg.fields[2],
					response: msg.fields[3],
					status: msg.fields[4],
					timestamp: msg.fields[5], // Has its own timestamp
					duration: msg.fields[6],
				})
			} else if (msg.type === 83) {
				// NetworkRequest: [type, method, url, request, response, status, timestamp, duration, transferredBodySize]
				filtered.networkRequests.push({
					type: msg.name,
					requestType: msg.fields[0],
					method: msg.fields[1],
					url: msg.fields[2],
					request: msg.fields[3],
					response: msg.fields[4],
					status: msg.fields[5],
					timestamp: msg.fields[6], // Has its own timestamp
					duration: msg.fields[7],
					transferredBodySize: msg.fields[8],
				})
			} else if (msg.type === 84) {
				// WSChannel: [chType, channelName, data, timestamp, dir, messageType]
				filtered.networkRequests.push({
					type: msg.name,
					channelType: msg.fields[0],
					channelName: msg.fields[1],
					data: msg.fields[2],
					timestamp: msg.fields[3], // Has its own timestamp
					direction: msg.fields[4],
					messageType: msg.fields[5],
				})
			}
		} else if (USER_ACTIONS.includes(msg.type)) {
			if (msg.type === 68) {
				// MouseClick: [id, hesitationTime, label, selector, normalizedX, normalizedY]
				filtered.userActions.push({
					type: msg.name,
					timestamp: currentTimestamp,
					elementId: msg.fields[0],
					hesitationTime: msg.fields[1],
					label: msg.fields[2],
					selector: msg.fields[3],
					normalizedX: msg.fields[4],
					normalizedY: msg.fields[5],
				})
			} else if (msg.type === 69) {
				// MouseClickDeprecated: [id, hesitationTime, label, selector]
				filtered.userActions.push({
					type: msg.name,
					timestamp: currentTimestamp,
					elementId: msg.fields[0],
					hesitationTime: msg.fields[1],
					label: msg.fields[2],
					selector: msg.fields[3],
				})
			} else if (msg.type === 18) {
				// SetInputValue: [id, value, mask]
				filtered.userActions.push({
					type: msg.name,
					timestamp: currentTimestamp,
					elementId: msg.fields[0],
					value: msg.fields[1],
					mask: msg.fields[2],
				})
			} else if (msg.type === 19) {
				// SetInputChecked: [id, checked]
				filtered.userActions.push({
					type: msg.name,
					timestamp: currentTimestamp,
					elementId: msg.fields[0],
					checked: msg.fields[1],
				})
			} else if (msg.type === 112) {
				// InputChange: [id, value, valueMasked, label, hesitationTime, inputDuration]
				filtered.userActions.push({
					type: msg.name,
					timestamp: currentTimestamp,
					elementId: msg.fields[0],
					value: msg.fields[1],
					valueMasked: msg.fields[2],
					label: msg.fields[3],
					hesitationTime: msg.fields[4],
					inputDuration: msg.fields[5],
				})
			} else if (msg.type === 16) {
				// SetNodeScroll: [id, x, y]
				filtered.userActions.push({
					type: msg.name,
					timestamp: currentTimestamp,
					elementId: msg.fields[0],
					x: msg.fields[1],
					y: msg.fields[2],
				})
			} else if (msg.type === 6) {
				// SetViewportScroll: [x, y]
				filtered.userActions.push({
					type: msg.name,
					timestamp: currentTimestamp,
					x: msg.fields[0],
					y: msg.fields[1],
				})
			}
		} else if (NAVIGATION.includes(msg.type)) {
			if (msg.type === 4) {
				// SetPageLocationDeprecated: [url, referrer, navigationStart]
				filtered.navigation.push({
					type: msg.name,
					timestamp: currentTimestamp,
					url: msg.fields[0],
					referrer: msg.fields[1],
					navigationStart: msg.fields[2],
				})
			} else if (msg.type === 122) {
				// SetPageLocation: [url, referrer, navigationStart, documentTitle]
				filtered.navigation.push({
					type: msg.name,
					timestamp: currentTimestamp,
					url: msg.fields[0],
					referrer: msg.fields[1],
					navigationStart: msg.fields[2],
					documentTitle: msg.fields[3],
				})
			}
		}
	}

	return filtered
}
