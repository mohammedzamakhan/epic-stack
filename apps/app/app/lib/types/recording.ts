export interface RecordingSessionData {
	metadata: {
		id: string
		url: string
		timestamp: string
		os: string
		browser: string
		windowSize: string
		country: string
		countryFlag: string
		batteryStatus?: string
		customMetadata?: Record<string, string>
	}
	consoleLogs: ConsoleLog[]
	networkRequests: NetworkRequest[]
	userActions: UserAction[]
	navigation: NavigationEvent[]
}

export interface ConsoleLog {
	type: 'ConsoleLog'
	timestamp: number
	level: string
	value: string
}

export interface NetworkRequest {
	type: 'NetworkRequest'
	requestType: string
	method: string
	url: string
	request: string
	response: string
	requestHeaders?: Record<string, string>
	responseHeaders?: Record<string, string>
	status: number
	timestamp: number
	duration: number
	transferredBodySize: number
	requestBody?: string
	responseBody?: string
}

export interface UserAction {
	type:
		| 'SetViewportScroll'
		| 'SelectionChange'
		| 'SetInputValue'
		| 'InputChange'
		| 'MouseClick'
		| 'FormSubmit'
		| 'SetNodeFocus'
		| 'KeyPress'
		| 'SetPageVisibility'
		| 'ModalOpen'
		| 'ModalClose'
		| 'CustomDropdownOpen'
		| 'CustomDropdownSelect'
		| 'TabSwitch'
		| 'AccordionToggle'
		| 'DragStart'
		| 'DragDrop'
		| 'ContextMenu'
		| 'FileUpload'
	timestamp: number
	elementId?: number
	value?: string
	mask?: number
	selectionStart?: number
	selectionEnd?: number
	selection?: string
	x?: number
	y?: number
	hesitationTime?: number
	label?: string
	selector?: string
	normalizedX?: number
	normalizedY?: number
	valueMasked?: boolean
	inputDuration?: number
}

export interface NavigationEvent {
	type: 'SetPageLocation'
	timestamp: number
	url: string
	referrer: string
	navigationStart: number
	documentTitle: string
}

export interface Comment {
	id: string
	userId: string
	content: string
	timestampMs: number | null
	icon: 'bug' | 'lightbulb' | 'code' | 'warning' | null
	likes: number
	createdAt: string
	parentId: string | null
	replies?: Comment[]
	collapsed?: boolean
}
