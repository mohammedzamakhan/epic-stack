import crypto from 'node:crypto'
import { prisma } from '@repo/database'
import jwt from 'jsonwebtoken'

export interface OpenReplaySession {
	sessionId: string
	sessionHash: string
	projectKey: string
	userUUID?: string
	metadata?: Record<string, any>
	startTime: number
}

export interface OpenReplayMessage {
	type: string
	timestamp: number
	data: any
}

export interface ProcessedSessionData {
	sessionId: string
	consoleLogs: ConsoleLogMessage[]
	networkRequests: NetworkRequestMessage[]
	userActions: UserActionMessage[]
	navigation: NavigationMessage[]
}

export interface ConsoleLogMessage {
	type: 'ConsoleLog'
	timestamp: number
	level: string
	value: string
}

export interface NetworkRequestMessage {
	type: 'Fetch' | 'NetworkRequest'
	timestamp: number
	method?: string
	url?: string
	request?: string
	response?: string
	requestHeaders?: Record<string, string>
	responseHeaders?: Record<string, string>
	status?: number
	duration?: number
}

export interface UserActionMessage {
	type: 'MouseClick' | 'InputChange' | 'SetNodeScroll' | 'SetViewportScroll'
	timestamp: number
	elementId?: number
	selector?: string
	value?: string
	x?: number
	y?: number
}

export interface NavigationMessage {
	type: 'SetPageLocation'
	timestamp: number
	url: string
	referrer?: string
	documentTitle?: string
}

/**
 * Create a new OpenReplay session
 */
export function createOpenReplaySession(
	projectKey: string,
	userUUID?: string,
	metadata?: Record<string, any>,
): OpenReplaySession {
	const sessionId = crypto.randomUUID() // Generate UUID for OpenReplay session
	const sessionHash = generateSessionHash(sessionId)

	return {
		sessionId,
		sessionHash,
		projectKey,
		userUUID,
		metadata,
		startTime: Date.now(),
	}
}

/**
 * Generate JWT token for OpenReplay session using HS256 algorithm
 */
export function generateSessionToken(session: OpenReplaySession): string {
	const jwtSecret = process.env.SESSION_SECRET
	if (!jwtSecret) {
		throw new Error('SESSION_SECRET environment variable is not set')
	}

	const tokenPayload = {
		sessionId: session.sessionId,
		sessionHash: session.sessionHash,
		projectKey: session.projectKey,
		userUUID: session.userUUID,
		timestamp: session.startTime,
	}

	return jwt.sign(tokenPayload, jwtSecret, {
		algorithm: 'HS256', // Explicitly use HS256 as required
		expiresIn: '24h',
		issuer: 'bugbasher-openreplay',
	})
}

/**
 * Verify and decode OpenReplay session token using HS256 algorithm
 */
export function verifySessionToken(token: string): OpenReplaySession {
	const jwtSecret = process.env.SESSION_SECRET
	if (!jwtSecret) {
		throw new Error('SESSION_SECRET environment variable is not set')
	}

	try {
		const decoded = jwt.verify(token, jwtSecret, {
			algorithms: ['HS256'], // Explicitly verify HS256 algorithm
		}) as any
		return {
			sessionId: decoded.sessionId,
			sessionHash: decoded.sessionHash,
			projectKey: decoded.projectKey,
			userUUID: decoded.userUUID,
			metadata: decoded.metadata,
			startTime: decoded.timestamp,
		}
	} catch {
		throw new Error('Invalid session token')
	}
}

/**
 * Generate a session hash for session stitching
 */
function generateSessionHash(sessionId: string): string {
	return crypto
		.createHash('sha256')
		.update(sessionId + Date.now())
		.digest('hex')
		.substring(0, 16)
}

/**
 * Get OpenReplay session data by session ID
 */
export async function getOpenReplaySessionData(
	sessionId: string,
): Promise<ProcessedSessionData | null> {
	try {
		const session = await prisma.openReplaySession.findUnique({
			where: { sessionId },
			include: {
				messages: {
					orderBy: { timestamp: 'asc' },
				},
			},
		})

		if (!session) {
			return null
		}

		// Process messages into categorized format
		const processedData: ProcessedSessionData = {
			sessionId,
			consoleLogs: [],
			networkRequests: [],
			userActions: [],
			navigation: [],
		}

		for (const message of session.messages) {
			const data = JSON.parse(message.data) as any
			const timestamp = Number(message.timestamp)

			switch (message.messageType) {
				case 'ConsoleLog':
					processedData.consoleLogs.push({
						type: 'ConsoleLog',
						timestamp,
						level: data.level as string,
						value: data.value as string,
					})
					break

				case 'Fetch':
				case 'NetworkRequest':
				case 'NetworkRequestDeprecated':
					processedData.networkRequests.push({
						type: message.messageType as 'Fetch' | 'NetworkRequest',
						timestamp,
						method: data.method as string,
						url: data.url as string,
						request: data.request as string,
						response: data.response as string,
						requestHeaders: data.requestHeaders as Record<string, string>,
						responseHeaders: data.responseHeaders as Record<string, string>,
						status: data.status as number,
						duration: data.duration as number,
					})
					break

				case 'MouseClick':
				case 'MouseClickDeprecated':
				case 'InputChange':
				case 'SetInputValue':
				case 'SetNodeScroll':
				case 'SetViewportScroll':
					processedData.userActions.push({
						type: message.messageType as UserActionMessage['type'],
						timestamp,
						elementId: data.elementId as number,
						selector: data.selector as string,
						value: data.value as string,
						x: data.x as number,
						y: data.y as number,
					})
					break

				case 'SetPageLocation':
				case 'SetPageLocationDeprecated':
					processedData.navigation.push({
						type: 'SetPageLocation',
						timestamp,
						url: data.url as string,
						referrer: data.referrer as string,
						documentTitle: data.documentTitle as string,
					})
					break
			}
		}

		return processedData
	} catch (ignoredError) {
		console.error('Error retrieving OpenReplay session data:', ignoredError)
		return null
	}
}

/**
 * Store OpenReplay session data
 */
export async function storeOpenReplaySessionData(
	sessionId: string,
	messages: OpenReplayMessage[],
): Promise<void> {
	try {
		// First, ensure the session exists
		await prisma.openReplaySession.upsert({
			where: { sessionId },
			update: {
				updatedAt: new Date(),
			},
			create: {
				sessionId,
				projectKey: 'default', // This should be passed from the session token
				startTime: new Date(),
				isActive: true,
			},
		})

		// Store messages in batch
		const messageData = messages.map((message) => ({
			sessionId,
			messageType: message.type,
			messageTypeId: getMessageTypeId(message.type),
			timestamp: BigInt(message.timestamp),
			data: JSON.stringify(message.data),
		}))

		if (messageData.length > 0) {
			await prisma.openReplayMessage.createMany({
				data: messageData,
			})
		}

		console.log(`Stored ${messages.length} messages for session ${sessionId}`)
	} catch (ignoredError) {
		console.error('Error storing OpenReplay session data:', ignoredError)
		throw ignoredError
	}
}

/**
 * Delete OpenReplay session data
 */
export async function deleteOpenReplaySessionData(
	sessionId: string,
): Promise<void> {
	try {
		// Delete messages first (due to foreign key constraint)
		await prisma.openReplayMessage.deleteMany({
			where: { sessionId },
		})

		// Delete the session
		await prisma.openReplaySession.delete({
			where: { sessionId },
		})

		console.log(`Deleted OpenReplay session data for: ${sessionId}`)
	} catch (ignoredError) {
		console.error('Error deleting OpenReplay session data:', ignoredError)
		throw ignoredError
	}
}

/**
 * Create or update OpenReplay session
 */
export async function createOrUpdateOpenReplaySession(
	sessionId: string,
	projectKey: string,
	userUUID?: string,
	metadata?: Record<string, any>,
): Promise<void> {
	try {
		await prisma.openReplaySession.upsert({
			where: { sessionId }, // Use the provided sessionId directly
			update: {
				userUUID,
				metadata: metadata ? JSON.stringify(metadata) : null,
				updatedAt: new Date(),
			},
			create: {
				sessionId, // Use the provided sessionId directly instead of generating UUID
				projectKey,
				userUUID,
				metadata: metadata ? JSON.stringify(metadata) : null,
				startTime: new Date(),
				isActive: true,
			},
		})
	} catch (ignoredError) {
		console.error('Error creating/updating OpenReplay session:', ignoredError)
		throw ignoredError
	}
}

/**
 * Map message type names to numeric IDs for efficient storage
 */
function getMessageTypeId(messageType: string): number {
	const typeMap: Record<string, number> = {
		Timestamp: 0,
		SetPageLocationDeprecated: 4,
		SetViewportSize: 5,
		SetViewportScroll: 6,
		CreateDocument: 7,
		CreateElementNode: 8,
		CreateTextNode: 9,
		MoveNode: 10,
		RemoveNode: 11,
		SetNodeAttribute: 12,
		RemoveNodeAttribute: 13,
		SetNodeData: 14,
		SetNodeScroll: 16,
		SetInputTarget: 17,
		SetInputValue: 18,
		SetInputChecked: 19,
		MouseMove: 20,
		NetworkRequestDeprecated: 21,
		ConsoleLog: 22,
		PageLoadTiming: 23,
		PageRenderTiming: 24,
		CustomEvent: 27,
		UserID: 28,
		UserAnonymousID: 29,
		Metadata: 30,
		StringDictGlobal: 34,
		SetNodeAttributeDictGlobal: 35,
		NodeAnimationResult: 36,
		CSSInsertRule: 37,
		CSSDeleteRule: 38,
		Fetch: 39,
		Profiler: 40,
		OTable: 41,
		StateAction: 42,
		StringDict: 43,
		ReduxDeprecated: 44,
		Vuex: 45,
		MobX: 46,
		NgRx: 47,
		GraphQLDeprecated: 48,
		PerformanceTrack: 49,
		StringDictDeprecated: 50,
		SetNodeAttributeDictDeprecated: 51,
		SetNodeAttributeDict: 52,
		ResourceTimingDeprecatedDeprecated: 53,
		ConnectionInformation: 54,
		SetPageVisibility: 55,
		LoadFontFace: 57,
		SetNodeFocus: 58,
		LongTask: 59,
		SetNodeAttributeURLBased: 60,
		SetCSSDataURLBased: 61,
		TechnicalInfo: 63,
		CustomIssue: 64,
		SetNodeSlot: 65,
		CSSInsertRuleURLBased: 67,
		MouseClick: 68,
		MouseClickDeprecated: 69,
		CreateIFrameDocument: 70,
		AdoptedSSReplaceURLBased: 71,
		AdoptedSSInsertRuleURLBased: 73,
		AdoptedSSDeleteRule: 75,
		AdoptedSSAddOwner: 76,
		AdoptedSSRemoveOwner: 77,
		JSException: 78,
		Zustand: 79,
		BatchMetadata: 81,
		PartitionedMessage: 82,
		NetworkRequest: 83,
		WSChannel: 84,
		ResourceTiming: 85,
		Incident: 87,
		LongAnimationTask: 89,
		InputChange: 112,
		SelectionChange: 113,
		MouseThrashing: 114,
		UnbindNodes: 115,
		ResourceTimingDeprecated: 116,
		TabChange: 117,
		TabData: 118,
		CanvasNode: 119,
		TagTrigger: 120,
		Redux: 121,
		SetPageLocation: 122,
		GraphQL: 123,
		WebVitals: 124,
	}

	return typeMap[messageType] || -1
}

/**
 * Validate project key
 * This would typically check against a database of valid project keys
 */
export function validateProjectKey(projectKey: string): boolean {
	// TODO: Implement proper project key validation
	// For now, just check that it's not empty
	return Boolean(projectKey && projectKey.length > 0)
}

/**
 * Get OpenReplay configuration for a project
 */
export function getOpenReplayConfig(projectKey: string) {
	// TODO: Implement project-specific configuration
	return {
		projectKey,
		privacySettings: {
			obscureTextEmails: true,
			obscureTextNumbers: false,
			ignoreHeaders: ['cookie', 'set-cookie', 'authorization'],
		},
		networkCapture: {
			failuresOnly: false,
			capturePayload: true,
		},
		consoleCapture: {
			methods: ['log', 'warn', 'error', 'info', 'debug'],
			throttling: 30, // messages per second
		},
	}
}
