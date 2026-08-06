// Core types for BugBasher embedded script

export interface UIComponentDetector {
	name: string
	isComponent: (element: HTMLElement) => boolean
	isTrigger?: (element: HTMLElement) => boolean
	getLabel: (element: HTMLElement) => string
	getIdentifier: (element: HTMLElement) => string
	getType?: (element: HTMLElement) => string
	getState?: (element: HTMLElement) => string
}

export interface UIDetectionConfig {
	modal?: UIComponentDetector
	dropdown?: UIComponentDetector
	tab?: UIComponentDetector
	accordion?: UIComponentDetector
	button?: UIComponentDetector
	form?: UIComponentDetector
	custom?: UIComponentDetector[]
}

export interface BugBasherConfig {
	projectId: string
	apiOrigin?: string
	debug?: boolean
	uiDetection?: UIDetectionConfig
}

export interface SessionData {
	// Identifiers
	sessionId: string
	openReplaySessionId: string
	openReplaySessionHash: string

	// Recording data
	videoData: string | null // Base64 encoded video (or null for comments-only)
	duration: number // Recording duration in seconds

	// Comments
	comments: Comment[]

	// Metadata
	url: string
	projectId: string
	userAgent: string
	recordingStartTime: number // Unix timestamp
	source: 'toolbar' | 'recorder'
}

export interface Comment {
	// Element information
	element: {
		selector: string
		tagName: string
		text: string // Element text content (truncated)
	}

	// Comment data
	message: string
	screenshot: string // Base64 encoded PNG

	// Position
	position: {
		x: number
		y: number
	}

	// Timing
	timestamp: number // Unix timestamp
	relativeTime: number // Seconds from recording start
	url: string
}

export interface BugBasherAPI {
	// Toolbar control
	showToolbar(projectId: string): Promise<void>
	hideToolbar(): Promise<void>

	// Recording control
	startRecording(): Promise<void>
	stopRecording(): Promise<SessionData>
	getIsRecording(): boolean

	// User identification
	setUser(userId: string, metadata?: Record<string, any>): Promise<void>

	// Custom tracking
	trackEvent(name: string, payload: Record<string, any>): Promise<void>
	reportIssue(title: string, payload: Record<string, any>): Promise<void>

	// OpenReplay integration
	getSessionToken(): string | null
	getSessionURL(): string | null
}

// Message types for cross-tab communication
export type BroadcastMessage =
	| {
			type: 'SCREEN_SHARING_STARTED'
			projectId: string
			source: 'recorder' | 'toolbar'
	  }
	| { type: 'SCREEN_SHARING_STOPPED' }
	| { type: 'RECORDING_STARTED'; startTime: number; sessionId: string }
	| { type: 'RECORDING_STOPPED' }

export type WatcherMessage =
	| { type: 'SCREEN_SHARING_ACTIVE'; projectId: string }
	| { type: 'SCREEN_SHARING_STOPPED' }
	| { type: 'RECORDING_STARTED'; startTime: number; sessionId: string }
	| { type: 'RECORDING_STOPPED' }
	| {
			type: 'RECORDING_DATA'
			videoBlob: string
			duration: number
			sessionId: string
	  }
	| { type: 'RECORDING_ERROR'; error: string }
	| { type: 'RECORDING_STATUS'; isRecording: boolean; duration: number }

// Messages from script to watcher iframe
export type ScriptToWatcherMessage =
	| { type: 'START_RECORDING'; projectId: string; sessionId: string }
	| { type: 'STOP_RECORDING' }
	| { type: 'GET_RECORDING_STATUS' }

export type ParentMessage =
	| { type: 'SCREEN_SHARING_ACTIVE'; projectId: string }
	| { type: 'SCREEN_SHARING_STOPPED' }
	| { type: 'RECORDING_STARTED'; startTime: number }
	| { type: 'RECORDING_STOPPED' }

export interface ToolbarState {
	isVisible: boolean
	isRecording: boolean
	isCommenting: boolean
	projectId: string | null
}

// OpenReplay Tracker types (simplified)
export interface OpenReplayTracker {
	start(): Promise<void>
	stop(): void
	getSessionToken(): string | null
	getSessionID(): string | null
	getSessionURL(): string | null
	setUserID(userId: string): void
	setMetadata(key: string, value: any): void
	event(name: string, payload?: Record<string, any>): void
}

// Internal state interfaces
export interface RecordingState {
	isRecording: boolean
	isCommenting: boolean
	recordingStartTime: number | null
	mediaRecorder: MediaRecorder | null
	videoChunks: Blob[]
	comments: Comment[]
	screenStream: MediaStream | null
}

export interface ToolbarState {
	isVisible: boolean
	isRecording: boolean
	isCommenting: boolean
	position: { x: number; y: number }
	isDragging: boolean
}

declare global {
	interface Window {
		BugBasher: BugBasherAPI
	}
}
