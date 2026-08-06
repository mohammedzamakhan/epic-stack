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

const recordingStorage = new Map<string, unknown>()
const sessionLogs = new Map<string, SessionLogData>()

const SESSION_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

function scheduleExpiry(
	sessionId: string,
	storage: Map<string, unknown>,
): void {
	setTimeout(() => {
		if (storage.has(sessionId)) {
			storage.delete(sessionId)
			console.log('[RecordingStorage] Expired session data:', sessionId)
		}
	}, SESSION_EXPIRY_MS)
}

export function storeRecordingData(sessionId: string, data: unknown): void {
	recordingStorage.set(sessionId, data)
	scheduleExpiry(sessionId, recordingStorage)
}

export function getRecordingData(sessionId: string): unknown | null {
	return recordingStorage.get(sessionId) || null
}

export function initSessionLogs(
	sessionId: string,
	projectId: string,
	url: string,
	userAgent: string,
	startTime: number,
): void {
	const logData: SessionLogData = {
		sessionId,
		projectId,
		url,
		userAgent,
		startTime,
		networkRequests: [],
		consoleMessages: [],
		userActions: [],
		navigationEvents: [],
	}
	sessionLogs.set(sessionId, logData)
	scheduleExpiry(sessionId, sessionLogs as Map<string, unknown>)
	console.log('[RecordingStorage] Initialized session logs:', sessionId)
}

export function appendNetworkRequest(
	sessionId: string,
	data: NetworkRequestData,
): boolean {
	const logs = sessionLogs.get(sessionId)
	if (!logs) {
		console.warn(
			'[RecordingStorage] Session not found for network request:',
			sessionId,
		)
		return false
	}
	logs.networkRequests.push(data)
	return true
}

export function appendConsoleMessage(
	sessionId: string,
	data: ConsoleMessageData,
): boolean {
	const logs = sessionLogs.get(sessionId)
	if (!logs) {
		console.warn(
			'[RecordingStorage] Session not found for console message:',
			sessionId,
		)
		return false
	}
	logs.consoleMessages.push(data)
	return true
}

export function appendUserAction(
	sessionId: string,
	data: UserActionData,
): boolean {
	const logs = sessionLogs.get(sessionId)
	if (!logs) {
		console.warn(
			'[RecordingStorage] Session not found for user action:',
			sessionId,
		)
		return false
	}
	logs.userActions.push(data)
	return true
}

export function appendNavigationEvent(
	sessionId: string,
	data: NavigationEventData,
): boolean {
	const logs = sessionLogs.get(sessionId)
	if (!logs) {
		console.warn(
			'[RecordingStorage] Session not found for navigation event:',
			sessionId,
		)
		return false
	}
	logs.navigationEvents.push(data)
	return true
}

export function getSessionLogs(sessionId: string): SessionLogData | null {
	return sessionLogs.get(sessionId) || null
}

export function clearSessionLogs(sessionId: string): void {
	sessionLogs.delete(sessionId)
	console.log('[RecordingStorage] Cleared session logs:', sessionId)
}
