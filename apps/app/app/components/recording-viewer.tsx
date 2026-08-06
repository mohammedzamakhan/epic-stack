'use client'

import { cn } from '@repo/ui'
import { Avatar, AvatarFallback } from '@repo/ui/avatar'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	DevToolsTabs as Tabs,
	DevToolsTabsContent as TabsContent,
	DevToolsTabsList as TabsList,
	DevToolsTabsTrigger as TabsTrigger,
} from '@repo/ui/devtools-tabs'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from '@repo/ui/resizable'
import { ScrollArea, ScrollBar } from '@repo/ui/scroll-area'
import { Textarea } from '@repo/ui/textarea'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from '@repo/ui/tooltip'
import { ShimmeringText } from '@repo/ui/shimmering-text'
import {
	Lock,
	AlertCircle,
	AlertTriangle,
	Info,
	Circle,
	ChevronRight,
	ChevronDown,
	MousePointer2,
	Navigation,
	PanelRight,
	PanelBottom,
	Type,
	TextCursorInput,
	ArrowUpDown,
	Sparkles,
	Monitor,
	Reply,
	Heart,
	Bug,
	Lightbulb,
	Code,
	Clock,
	Copy,
	Check,
	Battery,
	MapPin,
	Link,
	Calendar,
	Globe,
	X,
	Send,
	Share2,
	User,
	Settings,
	LogOut,
} from 'lucide-react'
import { useState, useMemo, useRef, useEffect, ReactNode } from 'react'

import {
	type RecordingSessionData,
	type UserAction,
	type Comment,
	type ConsoleLog,
	type NetworkRequest,
} from '../lib/types/recording'
import TiptapEditor from './tiptap-editor'
import NotificationBell from './ui/notification-bell'
import { VideoPlayer } from './video-player'
import { Icon } from '@repo/ui/icon'
import { motion } from 'motion/react'

interface RecordingViewerProps {
	data: RecordingSessionData
	title?: string
	description?: string
	videoUrl?: string
	children?: ReactNode
}

// Helper to compute markers from recording data
const getMarkers = (
	data: RecordingSessionData,
	comments: Comment[],
): Array<{
	time: number
	type: 'console' | 'network' | 'comment'
	message: string
	originalIndex: number
}> => {
	if (!data) return []

	const baseTimestamp =
		data.navigation?.[0]?.navigationStart ||
		data.navigation?.[0]?.timestamp ||
		0
	const markers: Array<{
		time: number
		type: 'console' | 'network' | 'comment'
		message: string
		originalIndex: number
	}> = []

	// Get console errors
	if (data.consoleLogs && Array.isArray(data.consoleLogs)) {
		data.consoleLogs
			.filter((log: ConsoleLog) => log.level === 'error')
			.forEach((log: ConsoleLog) => {
				const relativeTimeMs = log.timestamp - baseTimestamp
				markers.push({
					time: relativeTimeMs / 1000, // convert to seconds
					type: 'console',
					message: log.value,
					originalIndex: data.consoleLogs.indexOf(log),
				})
			})
	}

	// Get network errors (status >= 400)
	if (data.networkRequests && Array.isArray(data.networkRequests)) {
		data.networkRequests
			.filter((req: NetworkRequest) => req.status >= 400)
			.forEach((req: NetworkRequest) => {
				const relativeTimeMs = req.timestamp - baseTimestamp
				markers.push({
					time: relativeTimeMs / 1000, // convert to seconds
					type: 'network',
					message: `${req.method} ${req.url.split('/').pop()} - ${req.status}`,
					originalIndex: data.networkRequests.indexOf(req),
				})
			})
	}

	// Get comment markers
	if (comments && Array.isArray(comments)) {
		comments.forEach((comment: Comment, index: number) => {
			if (comment.timestampMs !== null) {
				markers.push({
					time: comment.timestampMs / 1000,
					type: 'comment',
					message: comment.content,
					originalIndex: index,
					icon: comment.icon || undefined,
				} as any)
			}
		})
	}

	return markers.sort((a, b) => a.time - b.time)
}

const commentIconMap = {
	bug: Bug,
	lightbulb: Lightbulb,
	code: Code,
	warning: AlertTriangle,
}

const commentIconColors = {
	bug: 'text-red-600 dark:text-red-500',
	lightbulb: 'text-yellow-600 dark:text-yellow-400',
	code: 'text-blue-600 dark:text-blue-400',
	warning: 'text-orange-600 dark:text-orange-400',
}

const mockComments: Comment[] = [
	{
		id: '1',
		userId: 'user-1',
		content:
			'The PUT endpoint is returning a 500 error. This needs to be fixed before release.',
		timestampMs: 3500,
		icon: 'bug',
		likes: 2,
		createdAt: new Date(Date.now() - 3600000).toISOString(),
		parentId: null,
		replies: [
			{
				id: '2',
				userId: 'user-2',
				content:
					'I can reproduce this. The error handler seems to be misconfigured.',
				timestampMs: null,
				icon: null,
				likes: 1,
				createdAt: new Date(Date.now() - 1800000).toISOString(),
				parentId: '1',
			},
		],
	},
	{
		id: '3',
		userId: 'user-3',
		content:
			'Consider adding input validation on the form fields before submitting.',
		timestampMs: 1500,
		icon: 'lightbulb',
		likes: 0,
		createdAt: new Date(Date.now() - 7200000).toISOString(),
		parentId: null,
	},
]

export function RecordingViewer({
	data,
	videoUrl,
	children,
}: RecordingViewerProps) {
	const [dockPosition, setDockPosition] = useState<'right' | 'bottom'>('right')
	const [consoleFilter, setConsoleFilter] = useState<string>('all')
	const [networkFilter, setNetworkFilter] = useState<string>('all')
	const [selectedNetworkLog, setSelectedNetworkLog] = useState<number | null>(
		null,
	)
	const [networkDetailTab, setNetworkDetailTab] = useState<
		'headers' | 'payload' | 'response'
	>('headers')
	const [collapsedSections, setCollapsedSections] = useState<
		Record<string, boolean>
	>({})
	const [ignoredIsPlaying, setIgnoredIsPlaying] = useState(false)

	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [isAIStreaming, setIsAIStreaming] = useState(false)
	const titleRef = useRef<HTMLHeadingElement>(null)

	const [comments, setComments] = useState<Comment[]>(mockComments)
	const [newComment, setNewComment] = useState('')
	const [selectedCommentIcon, setSelectedCommentIcon] = useState<
		'bug' | 'lightbulb' | 'code' | 'warning' | null
	>(null)
	const [addCommentTimestamp, setAddCommentTimestamp] = useState(false)
	const [replyingTo, setReplyingTo] = useState<string | null>(null)
	const [replyContent, setReplyContent] = useState('')
	const [copiedField, setCopiedField] = useState<string | null>(null)

	const [isChatOpen, setIsChatOpen] = useState(false)
	const [chatMessages, setChatMessages] = useState<
		{ role: 'user' | 'assistant'; content: string }[]
	>([
		{
			role: 'assistant',
			content:
				"Hi! I'm here to help you understand this bug report better. You can ask me about the network errors, console logs, user actions, or any other details from this recording.",
		},
	])
	const [chatInput, setChatInput] = useState('')
	const [isChatLoading, setIsChatLoading] = useState(false)
	const chatMessagesRef = useRef<HTMLDivElement>(null)

	const [showDevTools, setShowDevTools] = useState(true)
	const [activeTab, setActiveTab] = useState('info')

	const markers = useMemo(() => getMarkers(data, comments), [data, comments])

	const phrases = [
		'Agent is thinking...',
		'Processing your request...',
		'Analyzing the logs...',
		'Generating response...',
		'Almost there...',
	]

	const [currentIndex, setCurrentIndex] = useState(0)
	useEffect(() => {
		if (!isAIStreaming) {
			setCurrentIndex(0)
			return
		}
		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % phrases.length)
		}, 3000)
		return () => clearInterval(interval)
	}, [isAIStreaming])

	const handleAIFill = async () => {
		if (isAIStreaming) return

		setIsAIStreaming(true)
		setTitle('')
		setDescription('')

		const mockTitle =
			'PUT API endpoint consistently fails with 500 error while GET and POST succeed'
		const mockDescription = `During an API test session on the preview environment, the PUT endpoint (/api/test-put) consistently returns a 500 Internal Server Error, while the GET (/api/test-get) and POST (/api/test-post) endpoints work as expected.

**Steps to Reproduce:**
1. Open the app at: https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/
2. Enter any values in the Name and Email fields (e.g., a, a).
3. Click Test GET → request succeeds and returns user data.
4. Click Test POST → request succeeds and echoes back submitted data.
5. Click Test PUT → request fails.

**Expected Result:** The PUT request should successfully process the payload and return a success response similar to GET and POST.

**Actual Result:** PUT request returns HTTP 500
Console error: PUT request failed: This endpoint always fails
Server response explicitly indicates failure:
{
   "success": false,
   "message": "PUT request failed",
   "error": "This endpoint always fails",
   "attemptedData": { "name": "a", "email": "a" }
}

**Additional Context:**
- Environment: Preview
- OS: macOS (arm) 15.6.1
- Browser: Chrome 140.0.7339.133
- App Version: 2.1.0
- Session Type: Debug
- Network logs confirm GET and POST return 200, PUT returns 500.
- Issue appears deterministic (not flaky).

**Impact:** This blocks testing or usage of update functionality relying on the PUT API and may indicate incomplete or intentionally stubbed backend logic.`

		// Stream title character by character
		for (let i = 0; i <= mockTitle.length; i++) {
			await new Promise((resolve) => setTimeout(resolve, 30))
			setTitle(mockTitle.slice(0, i))
		}

		// Small pause between title and description
		await new Promise((resolve) => setTimeout(resolve, 200))

		// Stream description character by character
		for (let i = 0; i <= mockDescription.length; i++) {
			await new Promise((resolve) => setTimeout(resolve, 15))
			setDescription(mockDescription.slice(0, i))
		}

		setIsAIStreaming(false)
	}

	const handleSendMessage = async () => {
		if (!chatInput.trim() || isChatLoading) return

		const userMessage = chatInput.trim()
		setChatInput('')
		setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }])
		setIsChatLoading(true)

		// Simulate AI thinking delay
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Mock responses based on keywords
		let response = ''
		const lowerMessage = userMessage.toLowerCase()

		if (lowerMessage.includes('error') || lowerMessage.includes('500')) {
			response = `Based on the recording, I found ${networkErrorCount} network error(s). The main issue is a **500 Internal Server Error** on the PUT request to \`/api/test-put\`. This occurred at timestamp 0:12 in the recording. The request was sending user data with Content-Type: application/json, but the server failed to process it. This could indicate a backend validation issue or database connection problem.`
		} else if (
			lowerMessage.includes('network') ||
			lowerMessage.includes('request')
		) {
			response = `The recording captured **${data.networkRequests.length} network requests**. Here's a breakdown:\n\n- **Successful (2xx):** ${data.networkRequests.filter((r: NetworkRequest) => r.status >= 200 && r.status < 300).length} requests\n- **Client Errors (4xx):** ${data.networkRequests.filter((r: NetworkRequest) => r.status >= 400 && r.status < 500).length} requests\n- **Server Errors (5xx):** ${data.networkRequests.filter((r: NetworkRequest) => r.status >= 500).length} requests\n\nThe slowest request took ${Math.max(...data.networkRequests.map((r: NetworkRequest) => r.duration))}ms.`
		} else if (
			lowerMessage.includes('console') ||
			lowerMessage.includes('log')
		) {
			response = `The console shows **${data.consoleLogs.length} log entries**:\n\n- **Errors:** ${data.consoleLogs.filter((l: ConsoleLog) => l.level === 'error').length}\n- **Warnings:** ${data.consoleLogs.filter((l: ConsoleLog) => l.level === 'warn').length}\n- **Info:** ${data.consoleLogs.filter((l: ConsoleLog) => l.level === 'log' || l.level === 'info').length}\n\nThe error messages are related to the failed API request.`
		} else if (
			lowerMessage.includes('action') ||
			lowerMessage.includes('click') ||
			lowerMessage.includes('user')
		) {
			response = `The user performed **${data.userActions.length} actions** during this recording:\n\n- **Clicks:** ${data.userActions.filter((a: UserAction) => a.type === 'MouseClick').length}\n- **Input changes:** ${data.userActions.filter((a: UserAction) => a.type === 'SetInputValue').length}\n- **Scrolls:** ${data.userActions.filter((a: UserAction) => a.type === 'SetViewportScroll').length}\n\nThe user was interacting with a form before the error occurred.`
		} else if (
			lowerMessage.includes('reproduce') ||
			lowerMessage.includes('steps')
		) {
			response = `Based on the recording, here are the **reproduction steps**:\n\n1. Navigate to the application URL\n2. Fill in the form fields (name and email)\n3. Click the Submit button\n4. Observe the 500 error in the network tab\n\nThe error seems to occur consistently when submitting the form with the captured data.`
		} else {
			response = `I can help you analyze this bug report. Here's what I found:\n\n- **${data.networkRequests.length}** network requests (${networkErrorCount} errors)\n- **${data.consoleLogs.length}** console logs\n- **${data.userActions.length}** user actions\n\nTry asking me about specific areas like "What caused the error?" or "Show me the network requests".`
		}

		setChatMessages((prev) => [
			...prev,
			{ role: 'assistant', content: response },
		])
		setIsChatLoading(false)
	}

	const handleTitleChange = () => {
		if (titleRef.current) {
			setTitle(titleRef.current.textContent || '')
		}
	}

	const handleDescriptionChange = (newContent: string) => {
		if (!isAIStreaming) {
			setDescription(newContent)
		}
	}

	useEffect(() => {
		if (isAIStreaming && titleRef.current) {
			titleRef.current.textContent = title
		}
	}, [title, isAIStreaming])

	// Scroll to bottom of chat when new messages arrive
	useEffect(() => {
		if (chatMessagesRef.current) {
			chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
		}
	}, [chatMessages])

	// Base timestamp for relative time calculations
	const baseTimestamp = useMemo(() => {
		return (
			data.navigation?.[0]?.navigationStart ||
			data.navigation?.[0]?.timestamp ||
			data.consoleLogs?.[0]?.timestamp ||
			0
		)
	}, [data])

	// Format relative time from base timestamp
	const formatRelativeTime = (timestamp: number): string => {
		const relativeMs = timestamp - baseTimestamp
		const seconds = Math.floor(relativeMs / 1000)
		const mins = Math.floor(seconds / 60)
		const secs = Math.abs(seconds % 60)
		if (seconds < 0) return '0:00'
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// Format bytes
	const formatBytes = (bytes: number | null): string => {
		if (bytes === null || bytes === undefined) return '-'
		if (bytes === 0) return '0 B'
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	// Get status color
	const getStatusColor = (status: number): string => {
		if (status >= 200 && status < 300)
			return 'text-green-600 dark:text-green-400'
		if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400'
		if (status >= 400 && status < 500)
			return 'text-orange-600 dark:text-orange-400'
		if (status >= 500) return 'text-red-600 dark:text-red-400'
		return 'text-muted-foreground'
	}

	// Get console log icon
	const getLogIcon = (level: string) => {
		switch (level) {
			case 'error':
				return (
					<AlertCircle className="text-destructive h-3 w-3 dark:text-red-400" />
				)
			case 'warn':
				return (
					<AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
				)
			case 'info':
				return <Info className="text-primary h-3 w-3" />
			default:
				return <Circle className="text-muted-foreground h-2 w-2" />
		}
	}

	// Get user action icon
	const getActionIcon = (type: string) => {
		switch (type) {
			case 'MouseClick':
				return <MousePointer2 className="h-3.5 w-3.5 text-blue-500" />
			case 'SetInputValue':
			case 'InputChange':
				return <TextCursorInput className="h-3.5 w-3.5 text-green-500" />
			case 'SetViewportScroll':
				return <ArrowUpDown className="h-3.5 w-3.5 text-purple-500" />
			case 'SelectionChange':
				return <Type className="h-3.5 w-3.5 text-orange-500" />
			case 'FormSubmit':
				return <Send className="h-3.5 w-3.5 text-indigo-500" />
			case 'SetNodeFocus':
				return <Circle className="h-3.5 w-3.5 text-cyan-500" />
			case 'KeyPress':
				return <Type className="h-3.5 w-3.5 text-yellow-500" />
			case 'SetPageVisibility':
				return <Monitor className="h-3.5 w-3.5 text-gray-500" />
			case 'ModalOpen':
			case 'ModalClose':
				return <PanelRight className="h-3.5 w-3.5 text-pink-500" />
			case 'CustomDropdownOpen':
			case 'CustomDropdownSelect':
				return <ChevronDown className="h-3.5 w-3.5 text-teal-500" />
			case 'TabSwitch':
				return <Navigation className="h-3.5 w-3.5 text-violet-500" />
			case 'AccordionToggle':
				return <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
			case 'DragStart':
			case 'DragDrop':
				return <MousePointer2 className="h-3.5 w-3.5 text-rose-500" />
			case 'ContextMenu':
				return <MousePointer2 className="h-3.5 w-3.5 text-slate-500" />
			case 'FileUpload':
				return <Type className="h-3.5 w-3.5 text-emerald-500" />
			default:
				return <Navigation className="text-muted-foreground h-3.5 w-3.5" />
		}
	}

	// Format user action description
	const formatUserAction = (action: UserAction): string => {
		switch (action.type) {
			case 'MouseClick':
				return formatClickAction(action)
			case 'SetInputValue':
			case 'InputChange':
				return formatInputAction(action)
			case 'SetViewportScroll':
				return formatScrollAction(action)
			case 'SelectionChange':
				return `Selected text: "${(action.selection || action.value || '').substring(0, 30)}${(action.selection || action.value || '').length > 30 ? '...' : ''}"`
			case 'FormSubmit':
				return `Submitted ${getFormDescription(action)}`
			case 'SetNodeFocus':
				return `Focused on ${getElementDescription(action)}`
			case 'KeyPress':
				return `Pressed ${getKeyDescription(action.value || action.label || 'key')}`
			case 'SetPageVisibility':
				return `${action.value === 'hidden' ? 'Left' : 'Returned to'} the page`
			case 'ModalOpen':
				return action.label || 'Opened modal'
			case 'ModalClose':
				return action.label || 'Closed modal'
			case 'CustomDropdownOpen':
				return action.label || 'Opened dropdown'
			case 'CustomDropdownSelect':
				return action.label || `Selected "${action.value}" from dropdown`
			case 'TabSwitch':
				return action.label || `Switched to "${action.value}" tab`
			case 'AccordionToggle':
				return action.label || `Toggled "${action.value}" accordion`
			case 'DragStart':
				return action.label || `Started dragging "${action.value}"`
			case 'DragDrop':
				return action.label || `Dropped item`
			case 'ContextMenu':
				return action.label || 'Right-clicked'
			case 'FileUpload':
				return action.label || `Uploaded file(s): ${action.value}`
			default:
				return action.type
		}
	}

	// Helper function to format click actions in a user-friendly way
	const formatClickAction = (action: UserAction): string => {
		const label = action.label || ''
		const selector = action.selector || ''

		// If we have a meaningful label, use it
		if (label && label !== 'element' && !label.includes('nth-of-type')) {
			return `Clicked "${label}"`
		}

		// Try to extract meaningful information from selector
		if (selector) {
			// Handle buttons
			if (selector.includes('button')) {
				if (label) return `Clicked "${label}" button`
				return 'Clicked a button'
			}

			// Handle links
			if (selector.includes('a[') || selector.includes('link')) {
				if (label) return `Clicked "${label}" link`
				return 'Clicked a link'
			}

			// Handle form inputs
			if (selector.includes('input')) {
				const inputType = extractInputType(selector)
				if (inputType === 'submit') return 'Clicked submit button'
				if (inputType === 'checkbox') return 'Clicked checkbox'
				if (inputType === 'radio') return 'Clicked radio button'
				return `Clicked ${inputType || 'input'} field`
			}

			// Handle select dropdowns
			if (selector.includes('select')) {
				return 'Clicked dropdown menu'
			}

			// Handle textareas
			if (selector.includes('textarea')) {
				return 'Clicked text area'
			}

			// Handle images
			if (selector.includes('img')) {
				return 'Clicked image'
			}

			// Handle divs and other containers
			if (selector.includes('div')) {
				return 'Clicked on page element'
			}
		}

		return 'Clicked on page'
	}

	// Helper function to format input actions
	const formatInputAction = (action: UserAction): string => {
		const value = action.value || ''
		const label = action.label || ''
		const selector = action.selector || ''

		// Determine field type
		let fieldType = 'field'
		if (selector.includes('select')) {
			// For dropdowns, show the selected option
			return `Selected "${value}" in ${label || 'dropdown'}`
		} else if (selector.includes('input')) {
			const inputType = extractInputType(selector)
			if (inputType === 'email') fieldType = 'email field'
			else if (inputType === 'password') fieldType = 'password field'
			else if (inputType === 'text') fieldType = 'text field'
			else if (inputType === 'number') fieldType = 'number field'
			else if (inputType === 'tel') fieldType = 'phone field'
			else if (inputType === 'url') fieldType = 'URL field'
			else fieldType = 'input field'
		} else if (selector.includes('textarea')) {
			fieldType = 'text area'
		}

		// Use label if available and meaningful
		if (label && label !== 'element' && !label.includes('nth-of-type')) {
			if (value.length > 20) {
				return `Typed in "${label}"`
			}
			return `Typed "${value}" in "${label}"`
		}

		// Fallback to generic description
		if (value.length > 20) {
			return `Typed in ${fieldType}`
		}

		// Mask sensitive values
		if (fieldType === 'password field') {
			return `Entered password in ${fieldType}`
		}

		return `Typed "${value}" in ${fieldType}`
	}

	// Helper function to format scroll actions
	const formatScrollAction = (action: UserAction): string => {
		const x = action.x || 0
		const y = action.y || 0

		if (y === 0 && x === 0) {
			return 'Scrolled to top of page'
		}

		if (y > 0) {
			return `Scrolled down the page`
		}

		if (y < 0) {
			return `Scrolled up the page`
		}

		if (x > 0) {
			return `Scrolled right on page`
		}

		if (x < 0) {
			return `Scrolled left on page`
		}

		return 'Scrolled on page'
	}

	// Helper function to get form description
	const getFormDescription = (action: UserAction): string => {
		const label = action.label || ''
		const selector = action.selector || ''

		if (label && label !== 'form' && !label.includes('nth-of-type')) {
			return `"${label}" form`
		}

		if (selector.includes('login')) return 'login form'
		if (selector.includes('signup') || selector.includes('register'))
			return 'signup form'
		if (selector.includes('contact')) return 'contact form'
		if (selector.includes('search')) return 'search form'

		return 'form'
	}

	// Helper function to get element description
	const getElementDescription = (action: UserAction): string => {
		const label = action.label || ''
		const selector = action.selector || ''

		if (label && label !== 'element' && !label.includes('nth-of-type')) {
			return `"${label}"`
		}

		if (selector.includes('input')) {
			const inputType = extractInputType(selector)
			return `${inputType || 'input'} field`
		}

		if (selector.includes('textarea')) return 'text area'
		if (selector.includes('select')) return 'dropdown menu'
		if (selector.includes('button')) return 'button'

		return 'page element'
	}

	// Helper function to get key description
	const getKeyDescription = (key: string): string => {
		switch (key.toLowerCase()) {
			case 'enter':
				return 'Enter key'
			case 'escape':
				return 'Escape key'
			case 'tab':
				return 'Tab key'
			case 'backspace':
				return 'Backspace key'
			case 'delete':
				return 'Delete key'
			case 'arrowup':
				return 'Up arrow key'
			case 'arrowdown':
				return 'Down arrow key'
			case 'arrowleft':
				return 'Left arrow key'
			case 'arrowright':
				return 'Right arrow key'
			case 'space':
				return 'Space bar'
			default:
				return `"${key}" key`
		}
	}

	// Helper function to extract input type from selector
	const extractInputType = (selector: string): string | null => {
		const typeMatch = selector.match(/input\[type="([^"]+)"\]/)
		if (typeMatch && typeMatch[1]) return typeMatch[1]

		// Check for common input patterns
		if (selector.includes('email')) return 'email'
		if (selector.includes('password')) return 'password'
		if (selector.includes('search')) return 'search'
		if (selector.includes('tel') || selector.includes('phone')) return 'phone'
		if (selector.includes('url')) return 'url'
		if (selector.includes('number')) return 'number'

		return 'text'
	}

	// Toggle section collapse
	const toggleSection = (sectionId: string) => {
		setCollapsedSections((prev) => ({
			...prev,
			[sectionId]: !prev[sectionId],
		}))
	}

	// Filter console logs and user actions
	const filteredConsoleItems = useMemo(() => {
		// Combine logs and actions into a single array with a common shape
		const logs = data.consoleLogs || []
		const actions = data.userActions || []

		const logItems = logs.map((log: ConsoleLog) => ({
			...log,
			itemType: 'log' as const,
		}))
		const actionItems = actions.map((action: UserAction) => ({
			...action,
			itemType: 'action' as const,
		}))

		let items: ((typeof logItems)[number] | (typeof actionItems)[number])[] = []

		if (consoleFilter === 'all') {
			items = [...logItems, ...actionItems]
		} else if (consoleFilter === 'actions') {
			items = actionItems
		} else if (consoleFilter === 'logs') {
			items = logItems
		} else if (consoleFilter === 'errors') {
			items = logItems.filter((log) => log.level === 'error')
		} else if (consoleFilter === 'warnings') {
			items = logItems.filter((log) => log.level === 'warn')
		} else if (consoleFilter === 'info') {
			items = logItems.filter((log) => log.level === 'info')
		}

		// Sort by timestamp
		return items.sort((a, b) => a.timestamp - b.timestamp)
	}, [data.consoleLogs, data.userActions, consoleFilter])

	// Filter network requests
	const filteredNetworkRequests = useMemo(() => {
		const requests = data.networkRequests || []
		if (networkFilter === 'all') return requests
		if (networkFilter === 'errors')
			return requests.filter((req: NetworkRequest) => req.status >= 400)
		if (networkFilter === 'fetch')
			return requests.filter(
				(req: NetworkRequest) =>
					req.requestType === 'fetch' || req.requestType === 'xhr',
			)
		return requests.filter(
			(req: NetworkRequest) => req.method === networkFilter.toUpperCase(),
		)
	}, [data.networkRequests, networkFilter])

	// Auto-select the first network request if none is selected and requests exist
	useEffect(() => {
		if (selectedNetworkLog === null && filteredNetworkRequests.length > 0) {
			setSelectedNetworkLog(0)
		}
	}, [selectedNetworkLog, filteredNetworkRequests.length])

	// Get URL path for display
	const getUrlPath = (url: string): string => {
		try {
			const urlObj = new URL(url)
			return urlObj.pathname + urlObj.search
		} catch {
			return url
		}
	}

	// Error counts for badges
	const ignoredErrorCount = (data.consoleLogs || []).filter(
		(log: ConsoleLog) => log.level === 'error',
	).length
	const networkErrorCount = (data.networkRequests || []).filter(
		(req: NetworkRequest) => req.status >= 400,
	).length

	const waterfallData = useMemo(() => {
		const requests = data.networkRequests || []
		if (requests.length === 0)
			return { minTimestamp: 0, maxTimestamp: 0, totalDuration: 1 }

		const timestamps = requests.map((req: NetworkRequest) => req.timestamp)
		const endTimes = requests.map(
			(req: NetworkRequest) => req.timestamp + req.duration,
		)

		const minTimestamp = Math.min(...timestamps)
		const maxTimestamp = Math.max(...endTimes)
		const totalDuration = maxTimestamp - minTimestamp || 1 // Avoid division by zero

		return { minTimestamp, maxTimestamp, totalDuration }
	}, [data.networkRequests])

	const getWaterfallStyle = (timestamp: number, duration: number) => {
		const startPercent =
			((timestamp - waterfallData.minTimestamp) / waterfallData.totalDuration) *
			100
		const widthPercent = Math.max(
			(duration / waterfallData.totalDuration) * 100,
			1,
		) // Minimum 1% width for visibility

		return {
			left: `${startPercent}%`,
			width: `${widthPercent}%`,
		}
	}

	const formatWaterfallTime = (ms: number) => {
		if (ms < 1000) return `${ms}ms`
		return `${(ms / 1000).toFixed(2)}s`
	}

	const parseRequestResponse = (
		jsonString: string,
		headers?: Record<string, string>,
	): { headers: Record<string, string>; body: string } => {
		try {
			const parsed = JSON.parse(jsonString) as {
				headers?: Record<string, string>
				body?: string
			}
			return {
				headers: headers || parsed.headers || {},
				body: parsed.body || '',
			}
		} catch {
			return { headers: headers || {}, body: jsonString }
		}
	}

	const parseJsonBody = (body: string): unknown => {
		try {
			return JSON.parse(body)
		} catch {
			return body
		}
	}

	// Recursive component for rendering collapsible JSON
	const CollapsibleJson = ({
		data,
		path = '',
	}: {
		data: unknown
		path?: string
	}) => {
		const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

		const toggleCollapse = (key: string) => {
			setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
		}

		if (data === null)
			return <span className="text-orange-600 dark:text-orange-400">null</span>
		if (typeof data === 'boolean')
			return (
				<span className="text-blue-600 dark:text-blue-400">
					{data.toString()}
				</span>
			)
		if (typeof data === 'number')
			return <span className="text-green-600 dark:text-green-400">{data}</span>
		if (typeof data === 'string')
			return <span className="text-red-600 dark:text-red-400">"{data}"</span>

		if (Array.isArray(data)) {
			if (data.length === 0)
				return <span className="text-muted-foreground">[]</span>
			const key = `${path}-array`
			const isCollapsed = collapsed[key]
			return (
				<span>
					<button
						onClick={() => toggleCollapse(key)}
						className="text-muted-foreground hover:text-foreground text-[10px]"
					>
						{isCollapsed ? '▶' : '▼'}
					</button>
					<span className="text-muted-foreground">{'['}</span>
					{isCollapsed ? (
						<span className="text-muted-foreground">...</span>
					) : (
						<div className="pl-4">
							{data.map((item, index) => (
								<div key={index}>
									<CollapsibleJson data={item} path={`${path}-${index}`} />
									{index < data.length - 1 && (
										<span className="text-muted-foreground">,</span>
									)}
								</div>
							))}
						</div>
					)}
					<span className="text-muted-foreground">]</span>
				</span>
			)
		}

		if (typeof data === 'object') {
			const entries = Object.entries(data as Record<string, unknown>)
			if (entries.length === 0)
				return <span className="text-muted-foreground">{'{}'}</span>
			const key = `${path}-object`
			const isCollapsed = collapsed[key]
			return (
				<span>
					<button
						onClick={() => toggleCollapse(key)}
						className="text-muted-foreground hover:text-foreground text-[10px]"
					>
						{isCollapsed ? '▶' : '▼'}
					</button>
					<span className="text-muted-foreground">{'{'}</span>
					{isCollapsed ? (
						<span className="text-muted-foreground">...</span>
					) : (
						<div className="pl-4">
							{entries.map(([k, v], index) => (
								<div key={k}>
									<span className="text-purple-600 dark:text-purple-400">
										"{k}"
									</span>
									<span className="text-muted-foreground">: </span>
									<CollapsibleJson data={v} path={`${path}-${k}`} />
									{index < entries.length - 1 && (
										<span className="text-muted-foreground">,</span>
									)}
								</div>
							))}
						</div>
					)}
					<span className="text-muted-foreground">{'}'}</span>
				</span>
			)
		}

		return <span>{String(data)}</span>
	}

	const copyToClipboard = (text: string, field: string) => {
		void navigator.clipboard.writeText(text)
		setCopiedField(field)
		setTimeout(() => setCopiedField(null), 2000)
	}

	const formatCommentTime = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		const diffHours = Math.floor(diffMs / 3600000)
		const diffDays = Math.floor(diffMs / 86400000)

		if (diffMins < 1) return 'now'
		if (diffMins < 60) return `${diffMins}m`
		if (diffHours < 24) return `${diffHours}h`
		if (diffDays < 7) return `${diffDays}d`
		return date.toLocaleDateString()
	}

	const formatVideoTimestamp = (ms: number) => {
		const seconds = Math.floor(ms / 1000)
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const handleAddComment = () => {
		if (!newComment.trim()) return

		const comment: Comment = {
			id: Date.now().toString(),
			userId: 'current-user',
			content: newComment,
			timestampMs: addCommentTimestamp ? currentTime * 1000 : null,
			icon: selectedCommentIcon,
			likes: 0,
			createdAt: new Date().toISOString(),
			parentId: null,
		}

		setComments([comment, ...comments])
		setNewComment('')
		setSelectedCommentIcon(null)
		setAddCommentTimestamp(false)
	}

	const handleReply = (parentId: string) => {
		if (!replyContent.trim()) return

		const reply: Comment = {
			id: Date.now().toString(),
			userId: 'current-user',
			content: replyContent,
			timestampMs: null,
			icon: null,
			likes: 0,
			createdAt: new Date().toISOString(),
			parentId,
		}

		setComments(
			comments.map((c) => {
				if (c.id === parentId) {
					return { ...c, replies: [...(c.replies || []), reply] }
				}
				return c
			}),
		)
		setReplyContent('')
		setReplyingTo(null)
	}

	const handleLike = (
		commentId: string,
		isReply = false,
		parentId?: string,
	) => {
		if (isReply && parentId) {
			setComments(
				comments.map((c) => {
					if (c.id === parentId) {
						return {
							...c,
							replies: c.replies?.map((r) =>
								r.id === commentId ? { ...r, likes: r.likes + 1 } : r,
							),
						}
					}
					return c
				}),
			)
		} else {
			setComments(
				comments.map((c) =>
					c.id === commentId ? { ...c, likes: c.likes + 1 } : c,
				),
			)
		}
	}

	const ignoredToggleCommentCollapse = (commentId: string) => {
		setComments(
			comments.map((c) =>
				c.id === commentId ? { ...c, collapsed: !c.collapsed } : c,
			),
		)
	}

	const ignoredTotalComments = comments.reduce(
		(acc, c) => acc + 1 + (c.replies?.length || 0),
		0,
	)

	// Dummy variable to simulate video time for timestamping comments
	const currentTime = 0.72 // e.g., 72% of the way through the video

	// Helper function to format size
	const formatSize = (bytes: number | null): string => {
		if (bytes === null || bytes === undefined) return '-'
		if (bytes === 0) return '0 B'
		const units = ['B', 'KB', 'MB', 'GB', 'TB']
		let i = 0
		let size = bytes
		while (size >= 1024 && i < units.length - 1) {
			size /= 1024
			i++
		}
		return `${size.toFixed(1)} ${units[i]}`
	}

	// Helper function to get waterfall bar color
	const getWaterfallColor = (status: number): string => {
		if (status >= 200 && status < 300) return 'bg-green-500/80'
		if (status >= 400) return 'bg-red-500/80'
		if (status >= 300) return 'bg-yellow-500/80'
		return 'bg-blue-500/80'
	}

	// Pre-parse request and response bodies for easier access
	const selectedNetworkLogData =
		selectedNetworkLog !== null
			? filteredNetworkRequests[selectedNetworkLog]
			: null
	const parsedRequest = selectedNetworkLogData
		? parseRequestResponse(
				selectedNetworkLogData.request || '',
				selectedNetworkLogData.requestHeaders,
			)
		: { headers: {}, body: '' }
	const parsedResponse = selectedNetworkLogData
		? parseRequestResponse(
				selectedNetworkLogData.response || '',
				selectedNetworkLogData.responseHeaders,
			)
		: { headers: {}, body: '' }
	const requestBody = selectedNetworkLogData
		? parseJsonBody(parsedRequest.body)
		: ''
	const responseBody = selectedNetworkLogData
		? parseJsonBody(parsedResponse.body)
		: ''

	// Debug logging for network request display
	if (selectedNetworkLogData) {
		console.log('Selected network request:', selectedNetworkLogData)
		console.log('Parsed request:', parsedRequest)
		console.log('Parsed response:', parsedResponse)
		console.log('Request body:', requestBody)
		console.log('Response body:', responseBody)
		console.log(
			'Should show request payload?',
			parsedRequest.body && parsedRequest.body !== '{}',
		)
		console.log(
			'Should show response body?',
			parsedResponse.body && parsedResponse.body !== '{}',
		)
		console.log('Current network detail tab:', networkDetailTab)
	}

	// Removed handlePlayPause as it's now managed by VideoPlayer
	// const togglePlayPause = () => {
	//   if (videoRef.current) {
	//     if (isPlaying) {
	//       videoRef.current.pause()
	//     } else {
	//       videoRef.current.play()
	//     }
	//     setIsPlaying(!isPlaying)
	//   }
	// }

	return (
		<TooltipProvider>
			<div className="bg-background flex h-screen flex-col">
				<header className="bg-card flex shrink-0 items-center justify-between border-b px-4 py-2">
					<div className="flex items-center gap-3">
						<h1 className="text-foreground text-lg font-semibold">
							Bug Report
						</h1>
					</div>

					<div className="flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant="outline"
										size="sm"
										className="gap-2 bg-transparent"
										onClick={() => setShowDevTools(!showDevTools)}
									>
										<Monitor className="h-4 w-4" />
									</Button>
								}
							></TooltipTrigger>
							<TooltipContent>
								{showDevTools ? 'Hide DevTools panel' : 'Show DevTools panel'}
							</TooltipContent>
						</Tooltip>

						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="outline"
										size="sm"
										className="gap-2 bg-transparent"
									>
										<Share2 className="h-4 w-4" />
										Share
									</Button>
								}
							></DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuItem
									onClick={() =>
										void navigator.clipboard.writeText(window.location.href)
									}
								>
									<Link className="mr-2 h-4 w-4" />
									Copy URL
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<Icon name="linear" />
									Linear
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Icon name="jira" />
									Jira
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Icon name="github" />
									GitHub
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Icon name="notion" />
									Notion
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Icon name="slack" />
									Slack
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Icon name="clickup" />
									ClickUp
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Icon name="asana" />
									Asana
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						{children}
						<NotificationBell />

						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										size="sm"
										className="h-8 w-8 rounded-full p-0"
									>
										<Avatar className="h-8 w-8">
											<AvatarFallback className="bg-primary text-primary-foreground">
												<User className="h-4 w-4" />
											</AvatarFallback>
										</Avatar>
									</Button>
								}
							></DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuItem>
									<User className="mr-2 h-4 w-4" />
									Profile
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Settings className="mr-2 h-4 w-4" />
									Settings
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="text-destructive focus:text-destructive">
									<LogOut className="mr-2 h-4 w-4" />
									Logout
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</header>

				{/* Main Content */}
				<ResizablePanelGroup
					direction={dockPosition === 'right' ? 'horizontal' : 'vertical'}
					className="flex-1"
				>
					{/* Left Panel - Video Player & Details */}
					<ResizablePanel
						defaultSize={dockPosition === 'right' ? 55 : 50}
						minSize={dockPosition === 'right' ? 35 : 30}
					>
						<ScrollArea className="mx-auto flex h-full max-w-[1280px] flex-col items-center justify-center overflow-hidden">
							<div className="flex h-full flex-col items-center justify-center">
								{/* URL Bar */}
								<div className="bg-card w-full border-b">
									<div className="flex items-center gap-2 px-4 py-2 text-sm">
										<Lock className="text-muted-foreground h-3 w-3" />
										<span className="text-muted-foreground truncate font-mono text-xs">
											{data.navigation?.[0]?.url || 'No URL captured'}
										</span>
									</div>
								</div>

								{/* Video Section with video.js */}
								<div className="bg-muted/30 relative max-h-[80vh] w-full">
									<VideoPlayer
										src={
											videoUrl ||
											'https://public-bucket-bbasher.t3.storage.dev/Screen%20Recording%202025-12-15%20at%204.00.17%E2%80%AFPM.mov'
										}
										onPlay={() => setIgnoredIsPlaying(true)}
										onPause={() => setIgnoredIsPlaying(false)}
										className="w-full"
										errorMarkers={markers}
										onMarkerClick={(marker) => {
											if (marker.class === 'console-error') {
												setActiveTab('console')
												setConsoleFilter('errors')
											} else if (marker.class === 'network-error') {
												setActiveTab('network')
												const requestIndex = filteredNetworkRequests.findIndex(
													(r) =>
														data.networkRequests.indexOf(r) ===
														marker.originalIndex,
												)
												if (requestIndex !== -1) {
													setSelectedNetworkLog(requestIndex)
												} else {
													setNetworkFilter('all')
													setSelectedNetworkLog(marker.originalIndex)
												}
											} else if (marker.class === 'comment-marker') {
												setActiveTab('comments')
											}
										}}
									/>
								</div>
							</div>
						</ScrollArea>
					</ResizablePanel>

					{showDevTools && (
						<>
							<ResizableHandle withHandle />

							{/* Right Panel - DevTools */}
							<ResizablePanel
								defaultSize={dockPosition === 'right' ? 45 : 50}
								minSize={25}
							>
								<div className="bg-card flex h-full flex-col border-l">
									{/* DevTools Tabs - Added Info and Comments tabs */}
									<Tabs
										value={activeTab}
										onValueChange={setActiveTab}
										className="flex min-h-0 flex-1 flex-col gap-0"
									>
										<div className="flex w-full shrink-0 items-center border-b bg-transparent">
											<ScrollArea className="min-w-0 flex-1">
												<TabsList className="h-auto w-auto justify-start rounded-none border-none bg-transparent p-0">
													<TabsTrigger
														value="info"
														className={
															"hover:text-foreground data-active:border-primary data-active:text-foreground inline-flex items-center justify-center gap-1.5 rounded-none border-b-0 border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
														}
													>
														Info
													</TabsTrigger>
													<TabsTrigger
														value="console"
														className={
															"hover:text-foreground data-active:border-primary data-active:text-foreground inline-flex items-center justify-center gap-1.5 rounded-none border-b-0 border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
														}
													>
														Console
													</TabsTrigger>
													<TabsTrigger
														value="network"
														className={
															"hover:text-foreground data-active:border-primary data-active:text-foreground inline-flex items-center justify-center gap-1.5 rounded-none border-b-0 border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
														}
													>
														Network
													</TabsTrigger>
													<TabsTrigger
														value="comments"
														className={
															"hover:text-foreground data-active:border-primary data-active:text-foreground inline-flex items-center justify-center gap-1.5 rounded-none border-b-0 border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
														}
													>
														Comments
													</TabsTrigger>
												</TabsList>
												<ScrollBar orientation="horizontal" />
											</ScrollArea>
											<div className="flex shrink-0 items-center gap-1 border-l px-2">
												<Tooltip>
													<TooltipTrigger
														render={
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0"
																onClick={() =>
																	setDockPosition(
																		dockPosition === 'right'
																			? 'bottom'
																			: 'right',
																	)
																}
															>
																{dockPosition === 'right' ? (
																	<PanelBottom className="h-3.5 w-3.5" />
																) : (
																	<PanelRight className="h-3.5 w-3.5" />
																)}
															</Button>
														}
													></TooltipTrigger>
													<TooltipContent side="bottom">
														{dockPosition === 'right'
															? 'Dock to bottom'
															: 'Dock to right'}
													</TooltipContent>
												</Tooltip>
												<Tooltip>
													<TooltipTrigger
														render={
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0"
																onClick={() => setShowDevTools(false)}
															>
																<X className="h-3.5 w-3.5" />
															</Button>
														}
													></TooltipTrigger>
													<TooltipContent side="bottom">
														Close DevTools
													</TooltipContent>
												</Tooltip>
											</div>
										</div>

										<TabsContent
											value="info"
											className="m-0 flex min-h-0 flex-1 flex-col"
										>
											<ScrollArea className="h-0 flex-1">
												<div className="space-y-4 p-4">
													{/* Recording Details */}
													<div className="mx-auto max-w-[1280px] border-b pb-4">
														<div className="space-y-3">
															<div className="space-y-2">
																<div className="flex items-start gap-2">
																	<h2
																		ref={titleRef}
																		contentEditable
																		suppressContentEditableWarning
																		onInput={handleTitleChange}
																		className={`text-foreground focus:ring-primary/50 -mx-1 flex-1 rounded px-1 text-xl font-semibold outline-none focus:ring-1 ${
																			!title && !isAIStreaming
																				? 'text-muted-foreground/50'
																				: ''
																		}`}
																		data-placeholder="Enter recording title..."
																		style={{
																			minHeight: '1.75rem',
																		}}
																	/>
																	{isAIStreaming ? (
																		<motion.div
																			key={currentIndex}
																			initial={{ opacity: 0, y: 10 }}
																			animate={{ opacity: 1, y: 0 }}
																			exit={{ opacity: 0, y: -10 }}
																			transition={{ duration: 0.3 }}
																		>
																			<ShimmeringText
																				className="text-xs"
																				text={phrases[currentIndex] as string}
																				duration={1.5}
																				startOnView={false}
																			/>
																		</motion.div>
																	) : (
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={handleAIFill}
																			disabled={isAIStreaming}
																			className="h-7 shrink-0 gap-1.5 bg-transparent text-xs"
																		>
																			<Sparkles
																				className={`h-3 w-3 ${isAIStreaming ? 'text-primary animate-pulse' : ''}`}
																			/>
																			Fill with AI
																		</Button>
																	)}
																</div>
																<div className="text-sm">
																	<TiptapEditor
																		content={description}
																		onChange={handleDescriptionChange}
																		placeholder="Enter description..."
																		editable={!isAIStreaming}
																		className="min-h-[1.25rem]"
																	/>
																</div>
															</div>

															{/* Show placeholder text when empty */}
															<style>{`
                    h2[contenteditable]:empty:before {
                      content: attr(data-placeholder);
                      color: hsl(var(--muted-foreground) / 0.4);
                    }
                    p[contenteditable]:empty:before {
                      content: attr(data-placeholder);
                      color: hsl(var(--muted-foreground) / 0.3);
                    }
                  `}</style>

															<div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
																<Badge variant="outline" className="font-mono">
																	{data.navigation?.[0]?.documentTitle || 'v0'}
																</Badge>
																<Badge variant="outline" className="font-mono">
																	{data.networkRequests?.length || 0} requests
																</Badge>
																<Badge variant="outline" className="font-mono">
																	{data.consoleLogs?.length || 0} logs
																</Badge>
																<Badge variant="outline" className="font-mono">
																	{data.userActions?.length || 0} actions
																</Badge>
															</div>
														</div>
													</div>
													{data.metadata && (
														<>
															{/* General Info */}
															<div className="space-y-3">
																<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
																	General
																</h3>

																<div className="space-y-2">
																	<div className="group flex items-start gap-3">
																		<Link className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
																		<div className="min-w-0 flex-1">
																			<div className="text-muted-foreground text-[10px] uppercase">
																				URL
																			</div>
																			<div className="font-mono text-xs break-all">
																				{data.metadata.url}
																			</div>
																		</div>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
																			onClick={() =>
																				copyToClipboard(
																					data.metadata!.url,
																					'url',
																				)
																			}
																		>
																			{copiedField === 'url' ? (
																				<Check className="h-3 w-3 text-green-500" />
																			) : (
																				<Copy className="h-3 w-3" />
																			)}
																		</Button>
																	</div>

																	<div className="group flex items-start gap-3">
																		<Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
																		<div className="min-w-0 flex-1">
																			<div className="text-muted-foreground text-[10px] uppercase">
																				Timestamp
																			</div>
																			<div className="text-xs">
																				{data.metadata.timestamp}
																			</div>
																		</div>
																		<Button
																			variant="ghost"
																			size="sm"
																			className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
																			onClick={() =>
																				copyToClipboard(
																					data.metadata!.timestamp,
																					'timestamp',
																				)
																			}
																		>
																			{copiedField === 'timestamp' ? (
																				<Check className="h-3 w-3 text-green-500" />
																			) : (
																				<Copy className="h-3 w-3" />
																			)}
																		</Button>
																	</div>
																</div>
															</div>

															{/* Environment */}
															<div className="space-y-3">
																<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
																	Environment
																</h3>

																<div className="space-y-2">
																	<div className="flex items-start gap-3">
																		<Monitor className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
																		<div className="min-w-0 flex-1">
																			<div className="text-muted-foreground text-[10px] uppercase">
																				OS
																			</div>
																			<div className="text-xs">
																				{data.metadata.os}
																			</div>
																		</div>
																	</div>

																	<div className="flex items-start gap-3">
																		<Globe className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
																		<div className="min-w-0 flex-1">
																			<div className="text-muted-foreground text-[10px] uppercase">
																				Browser
																			</div>
																			<div className="text-xs">
																				{data.metadata.browser}
																			</div>
																		</div>
																	</div>

																	<div className="flex items-start gap-3">
																		<PanelRight className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
																		<div className="min-w-0 flex-1">
																			<div className="text-muted-foreground text-[10px] uppercase">
																				Window Size
																			</div>
																			<div className="font-mono text-xs">
																				{data.metadata.windowSize}
																			</div>
																		</div>
																	</div>

																	<div className="flex items-start gap-3">
																		<MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
																		<div className="min-w-0 flex-1">
																			<div className="text-muted-foreground text-[10px] uppercase">
																				Country
																			</div>
																			<div className="text-xs">
																				{data.metadata.country}{' '}
																				{data.metadata.countryFlag}
																			</div>
																		</div>
																	</div>

																	{data.metadata.batteryStatus && (
																		<div className="flex items-start gap-3">
																			<Battery className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
																			<div className="min-w-0 flex-1">
																				<div className="text-muted-foreground text-[10px] uppercase">
																					Battery
																				</div>
																				<div className="text-xs text-orange-500">
																					{data.metadata.batteryStatus}
																				</div>
																			</div>
																		</div>
																	)}
																</div>
															</div>

															{/* Custom Metadata */}
															{data.metadata.customMetadata &&
																Object.keys(data.metadata.customMetadata)
																	.length > 0 && (
																	<div className="space-y-3">
																		<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
																			Your Metadata
																		</h3>

																		<div className="bg-muted/50 space-y-2 rounded border p-3">
																			{Object.entries(
																				data.metadata.customMetadata,
																			).map(([key, value]) => (
																				<div
																					key={key}
																					className="group flex items-start gap-2"
																				>
																					<div className="min-w-0 flex-1">
																						<span className="text-muted-foreground text-xs">
																							{key}
																						</span>
																						<span className="text-muted-foreground mx-1 text-xs">
																							:
																						</span>
																						<span className="text-primary font-mono text-xs">
																							&quot;{value}&quot;
																						</span>
																					</div>
																					<Button
																						variant="ghost"
																						size="sm"
																						className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100"
																						onClick={() =>
																							copyToClipboard(value, key)
																						}
																					>
																						{copiedField === key ? (
																							<Check className="h-3 w-3 text-green-500" />
																						) : (
																							<Copy className="h-3 w-3" />
																						)}
																					</Button>
																				</div>
																			))}
																		</div>
																	</div>
																)}

															{/* Recording ID */}
															<div className="space-y-3">
																<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
																	Recording ID
																</h3>
																<div className="group flex items-center gap-2">
																	<code className="text-muted-foreground bg-muted flex-1 truncate rounded px-2 py-1 font-mono text-[10px]">
																		{data.metadata.id}
																	</code>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-6 w-6 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
																		onClick={() =>
																			copyToClipboard(data.metadata!.id, 'id')
																		}
																	>
																		{copiedField === 'id' ? (
																			<Check className="h-3 w-3 text-green-500" />
																		) : (
																			<Copy className="h-3 w-3" />
																		)}
																	</Button>
																</div>
															</div>
														</>
													)}
												</div>
											</ScrollArea>
										</TabsContent>

										{/* Console Tab */}
										<TabsContent
											value="console"
											className="m-0 flex min-h-0 flex-1 flex-col"
										>
											{/* Console Filters */}
											<div className="bg-muted/30 flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
												{[
													'all',
													'actions',
													'logs',
													'errors',
													'warnings',
													'info',
												].map((filter) => (
													<Button
														key={filter}
														variant="ghost"
														size="sm"
														className={`h-6 px-2 text-xs ${
															consoleFilter === filter
																? 'bg-accent text-accent-foreground'
																: 'text-muted-foreground'
														}`}
														onClick={() => setConsoleFilter(filter)}
													>
														{filter.charAt(0).toUpperCase() + filter.slice(1)}
													</Button>
												))}
											</div>

											<ScrollArea className="min-h-0 flex-1 font-mono text-xs">
												{filteredConsoleItems.length > 0 ? (
													filteredConsoleItems.map((item, index) => {
														if (item.itemType === 'log') {
															// Render console log
															return (
																<div
																	key={`log-${index}`}
																	className={`hover:bg-accent/30 flex items-start gap-2 border-b px-3 py-1.5`}
																>
																	<div className="mt-0.5">
																		{getLogIcon(item.level)}
																	</div>
																	<div className="min-w-0 flex-1">
																		<span
																			className={`break-all ${
																				item.level === 'error'
																					? 'text-red-600 dark:text-red-400'
																					: item.level === 'warn'
																						? 'text-orange-600 dark:text-orange-400'
																						: 'text-foreground'
																			}`}
																		>
																			{item.value}
																		</span>
																	</div>
																	<span className="text-muted-foreground shrink-0 tabular-nums">
																		{formatRelativeTime(item.timestamp)}
																	</span>
																</div>
															)
														} else {
															// Render user action
															return (
																<div
																	key={`action-${index}`}
																	className="hover:bg-accent/30 flex items-start gap-2 border-b bg-blue-500/5 px-3 py-1.5"
																>
																	<div className="mt-0.5">
																		{getActionIcon(item.type)}
																	</div>
																	<div className="min-w-0 flex-1">
																		<span className="break-all text-blue-600 dark:text-blue-400">
																			{formatUserAction(item as UserAction)}
																		</span>
																		<span className="text-muted-foreground ml-2 text-[10px]">
																			{item.type}
																		</span>
																	</div>
																	<span className="text-muted-foreground shrink-0 tabular-nums">
																		{formatRelativeTime(item.timestamp)}
																	</span>
																</div>
															)
														}
													})
												) : (
													<div className="text-muted-foreground flex h-full items-center justify-center">
														No console logs
													</div>
												)}
											</ScrollArea>
										</TabsContent>

										{/* Network Tab */}
										<TabsContent
											value="network"
											className="m-0 flex min-h-0 flex-1 flex-col"
										>
											<ResizablePanelGroup
												direction="horizontal"
												className="min-h-0 flex-1"
											>
												<ResizablePanel
													defaultSize={55}
													minSize={5}
													maxSize={95}
												>
													<div className="flex h-full min-h-0 flex-col">
														{/* Network Filters */}
														<div className="bg-muted/30 flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
															{['all', 'fetch', 'errors'].map((filter) => (
																<Button
																	key={filter}
																	variant="ghost"
																	size="sm"
																	className={`h-6 px-2 text-xs ${
																		networkFilter === filter
																			? 'bg-accent text-accent-foreground'
																			: 'text-muted-foreground'
																	}`}
																	onClick={() => setNetworkFilter(filter)}
																>
																	{filter.charAt(0).toUpperCase() +
																		filter.slice(1)}
																</Button>
															))}
														</div>

														<ScrollArea className="min-h-0 w-full flex-1">
															<div className="w-full min-w-max overflow-auto">
																{/* Network Table Header */}
																<div className="text-muted-foreground bg-muted/20 flex items-center gap-2 border-b px-2 py-2 text-xs font-medium">
																	<div className="w-[38px] min-w-[38px]">
																		Time
																	</div>
																	<div className="w-[180px] min-w-[180px]">
																		Name
																	</div>
																	<div className="w-[50px] min-w-[50px]">
																		Status
																	</div>
																	<div className="w-[50px] min-w-[50px]">
																		Type
																	</div>
																	<div className="w-[50px] min-w-[50px]">
																		Duration
																	</div>
																	<div className="w-[60px] min-w-[60px] text-right">
																		Size
																	</div>
																	<div className="min-w-[120px] flex-1">
																		Waterfall
																	</div>
																</div>

																{/* Waterfall Scale */}
																<div className="text-muted-foreground bg-muted/10 flex items-center gap-2 border-b px-2 py-0.5 text-[10px]">
																	<div className="w-[38px] min-w-[38px]"></div>
																	<div className="w-[180px] min-w-[180px]"></div>
																	<div className="w-[50px] min-w-[50px]"></div>
																	<div className="w-[50px] min-w-[50px]"></div>
																	<div className="w-[50px] min-w-[50px]"></div>
																	<div className="w-[60px] min-w-[60px]"></div>
																	<div className="flex min-w-[120px] flex-1 justify-between px-1">
																		<span>0ms</span>
																		<span>
																			{formatWaterfallTime(
																				waterfallData.totalDuration / 2,
																			)}
																		</span>
																		<span>
																			{formatWaterfallTime(
																				waterfallData.totalDuration,
																			)}
																		</span>
																	</div>
																</div>

																{/* Network Logs */}
																{filteredNetworkRequests.length > 0 ? (
																	filteredNetworkRequests.map(
																		(log: NetworkRequest, index: number) => {
																			const urlPath = getUrlPath(log.url)
																			const isSelected =
																				selectedNetworkLog === index
																			const waterfallStyle = getWaterfallStyle(
																				log.timestamp,
																				log.duration,
																			)

																			return (
																				<div
																					key={index}
																					className={`flex cursor-pointer items-center gap-2 border-b px-2 py-1.5 text-xs transition-colors ${
																						isSelected
																							? 'bg-primary/10 border-l-primary border-l-2'
																							: 'hover:bg-accent/30'
																					}`}
																					onClick={() =>
																						setSelectedNetworkLog(index)
																					}
																				>
																					<div className="text-muted-foreground w-[38px] min-w-[38px] font-mono tabular-nums">
																						{formatRelativeTime(log.timestamp)}
																					</div>
																					<div
																						className={`flex w-[180px] min-w-[180px] items-center gap-1 truncate ${log.status >= 400 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
																					>
																						<span
																							className="truncate"
																							title={log.url}
																						>
																							{urlPath}
																						</span>
																					</div>
																					<div
																						className={`w-[50px] min-w-[50px] font-mono tabular-nums ${getStatusColor(log.status)}`}
																					>
																						{log.status}
																					</div>
																					<div className="text-muted-foreground w-[50px] min-w-[50px]">
																						{log.requestType}
																					</div>
																					<div className="text-muted-foreground w-[50px] min-w-[50px] font-mono tabular-nums">
																						{log.duration}ms
																					</div>
																					<div className="text-muted-foreground w-[60px] min-w-[60px] text-right font-mono tabular-nums">
																						{formatSize(
																							log.transferredBodySize,
																						)}
																					</div>
																					<div className="relative h-5 min-w-[120px] flex-1">
																						<div className="absolute inset-y-0 flex items-center">
																							<div
																								className="group relative h-3"
																								style={waterfallStyle}
																							>
																								<div
																									className={`h-full rounded-sm ${getWaterfallColor(log.status)}`}
																								></div>
																								<div className="bg-popover absolute bottom-full left-0 z-10 mb-1 hidden rounded border px-2 py-1 text-[10px] whitespace-nowrap shadow-md group-hover:block">
																									<div className="text-popover-foreground">
																										Start:{' '}
																										{formatWaterfallTime(
																											log.timestamp -
																												waterfallData.minTimestamp,
																										)}
																									</div>
																									<div className="text-popover-foreground">
																										Duration: {log.duration}ms
																									</div>
																								</div>
																							</div>
																						</div>
																					</div>
																				</div>
																			)
																		},
																	)
																) : (
																	<div className="text-muted-foreground px-4 py-8 text-center text-sm">
																		No network requests found
																	</div>
																)}
															</div>
														</ScrollArea>
													</div>
												</ResizablePanel>

												{/* Network Details Panel */}
												{selectedNetworkLog !== null &&
													filteredNetworkRequests[selectedNetworkLog] && (
														<>
															<ResizableHandle withHandle />
															<ResizablePanel
																defaultSize={45}
																minSize={30}
																maxSize={95}
															>
																<div className="bg-background flex h-full min-h-0 flex-col">
																	{/* Close button and Tab Bar */}
																	<div className="bg-muted/30 flex h-7 shrink-0 items-center border-b">
																		<button
																			onClick={() =>
																				setSelectedNetworkLog(null)
																			}
																			className="text-muted-foreground hover:text-foreground hover:bg-accent/50 border-r px-2 py-1 text-xs"
																		>
																			{'\u2715'}
																		</button>
																		<div className="flex overflow-x-auto">
																			<button
																				onClick={() =>
																					setNetworkDetailTab('headers')
																				}
																				className={`border-b-2 px-4 py-1 text-xs whitespace-nowrap transition-colors ${
																					networkDetailTab === 'headers'
																						? 'border-primary text-foreground bg-background'
																						: 'text-muted-foreground hover:text-foreground border-transparent'
																				}`}
																			>
																				Headers
																			</button>
																			<button
																				onClick={() =>
																					setNetworkDetailTab('payload')
																				}
																				className={`border-b-2 px-4 py-1 text-xs whitespace-nowrap transition-colors ${
																					networkDetailTab === 'payload'
																						? 'border-primary text-foreground bg-background'
																						: 'text-muted-foreground hover:text-foreground border-transparent'
																				}`}
																			>
																				Payload
																			</button>
																			<button
																				onClick={() =>
																					setNetworkDetailTab('response')
																				}
																				className={`border-b-2 px-4 py-1 text-xs whitespace-nowrap transition-colors ${
																					networkDetailTab === 'response'
																						? 'border-primary text-foreground bg-background'
																						: 'text-muted-foreground hover:text-foreground border-transparent'
																				}`}
																			>
																				Response
																			</button>
																		</div>
																	</div>

																	<ScrollArea className="min-h-0 flex-1 text-xs">
																		{/* Headers Tab - General, Request Headers, Response Headers */}
																		{networkDetailTab === 'headers' && (
																			<div className="p-0">
																				{/* General Section */}
																				<div className="border-b">
																					<button
																						onClick={() =>
																							toggleSection('general')
																						}
																						className="hover:bg-accent/30 text-foreground flex w-full items-center gap-1 px-3 py-2 text-left font-medium"
																					>
																						{collapsedSections['general'] ? (
																							<ChevronRight className="h-3 w-3" />
																						) : (
																							<ChevronDown className="h-3 w-3" />
																						)}
																						General
																					</button>
																					{!collapsedSections['general'] && (
																						<div className="space-y-1.5 px-6 pb-3 font-mono">
																							<div className="flex">
																								<span className="text-muted-foreground min-w-[140px]">
																									Request URL:
																								</span>
																								<span className="text-foreground break-all">
																									{selectedNetworkLogData?.url}
																								</span>
																							</div>
																							<div className="flex">
																								<span className="text-muted-foreground min-w-[140px]">
																									Request Method:
																								</span>
																								<span className="text-foreground">
																									{
																										selectedNetworkLogData?.method
																									}
																								</span>
																							</div>
																							<div className="flex items-center">
																								<span className="text-muted-foreground min-w-[140px]">
																									Status Code:
																								</span>
																								<span
																									className={`flex items-center gap-1.5 ${getStatusColor(selectedNetworkLogData?.status || 0)}`}
																								>
																									{selectedNetworkLogData?.status &&
																										selectedNetworkLogData.status >=
																											200 &&
																										selectedNetworkLogData.status <
																											300 && (
																											<span className="inline-block h-2 w-2 rounded-full bg-green-600 dark:bg-green-500"></span>
																										)}
																									{selectedNetworkLogData?.status &&
																										selectedNetworkLogData.status >=
																											400 && (
																											<span className="inline-block h-2 w-2 rounded-full bg-red-600 dark:bg-red-500"></span>
																										)}
																									{
																										selectedNetworkLogData?.status
																									}
																								</span>
																							</div>
																							<div className="flex">
																								<span className="text-muted-foreground min-w-[140px]">
																									Type:
																								</span>
																								<span className="text-foreground">
																									{
																										selectedNetworkLogData?.requestType
																									}
																								</span>
																							</div>
																							<div className="flex">
																								<span className="text-muted-foreground min-w-[140px]">
																									Duration:
																								</span>
																								<span className="text-foreground">
																									{
																										selectedNetworkLogData?.duration
																									}
																									ms
																								</span>
																							</div>
																							<div className="flex">
																								<span className="text-muted-foreground min-w-[140px]">
																									Size:
																								</span>
																								<span className="text-foreground">
																									{formatBytes(
																										selectedNetworkLogData?.transferredBodySize ||
																											null,
																									)}
																								</span>
																							</div>
																						</div>
																					)}
																				</div>

																				{/* Request Headers Section */}
																				<div className="border-b">
																					<button
																						onClick={() =>
																							toggleSection('requestHeaders')
																						}
																						className="hover:bg-accent/30 text-foreground flex w-full items-center gap-1 px-3 py-2 text-left font-medium"
																					>
																						{collapsedSections[
																							'requestHeaders'
																						] ? (
																							<ChevronRight className="h-3 w-3" />
																						) : (
																							<ChevronDown className="h-3 w-3" />
																						)}
																						Request Headers
																					</button>
																					{!collapsedSections[
																						'requestHeaders'
																					] && (
																						<div className="space-y-1 px-6 pb-3 font-mono">
																							{Object.keys(
																								parsedRequest.headers,
																							).length > 0 ? (
																								Object.entries(
																									parsedRequest.headers,
																								).map(([key, value]) => (
																									<div
																										key={key}
																										className="flex"
																									>
																										<span className="text-muted-foreground min-w-[140px]">
																											{key}:
																										</span>
																										<span className="text-foreground break-all">
																											{value}
																										</span>
																									</div>
																								))
																							) : (
																								<span className="text-muted-foreground italic">
																									No request headers
																								</span>
																							)}
																						</div>
																					)}
																				</div>

																				{/* Response Headers Section */}
																				<div className="border-b">
																					<button
																						onClick={() =>
																							toggleSection('responseHeaders')
																						}
																						className="hover:bg-accent/30 text-foreground flex w-full items-center gap-1 px-3 py-2 text-left font-medium"
																					>
																						{collapsedSections[
																							'responseHeaders'
																						] ? (
																							<ChevronRight className="h-3 w-3" />
																						) : (
																							<ChevronDown className="h-3 w-3" />
																						)}
																						Response Headers
																					</button>
																					{!collapsedSections[
																						'responseHeaders'
																					] && (
																						<div className="space-y-1 px-6 pb-3 font-mono">
																							{Object.keys(
																								parsedResponse.headers,
																							).length > 0 ? (
																								Object.entries(
																									parsedResponse.headers,
																								).map(([key, value]) => (
																									<div
																										key={key}
																										className="flex"
																									>
																										<span className="text-muted-foreground min-w-[140px]">
																											{key}:
																										</span>
																										<span className="text-foreground break-all">
																											{value}
																										</span>
																									</div>
																								))
																							) : (
																								<span className="text-muted-foreground italic">
																									No response headers
																								</span>
																							)}
																						</div>
																					)}
																				</div>
																			</div>
																		)}

																		{/* Payload Tab - Raw request body */}
																		{networkDetailTab === 'payload' && (
																			<div className="p-3">
																				<div className="mb-2 border-b pb-2">
																					<span className="text-muted-foreground font-medium">
																						Request Payload
																					</span>
																				</div>
																				{parsedRequest.body &&
																				parsedRequest.body !== '{}' ? (
																					<pre className="text-foreground bg-muted/30 rounded p-2 font-mono break-all whitespace-pre-wrap">
																						{typeof requestBody === 'string'
																							? requestBody
																							: JSON.stringify(
																									requestBody,
																									null,
																									2,
																								)}
																					</pre>
																				) : (
																					<span className="text-muted-foreground italic">
																						No request payload
																					</span>
																				)}
																			</div>
																		)}

																		{/* Response Tab - Response body with collapsible JSON */}
																		{networkDetailTab === 'response' && (
																			<div className="p-3">
																				<div className="mb-2 border-b pb-2">
																					<span className="text-muted-foreground font-medium">
																						Response Body
																					</span>
																				</div>
																				{parsedResponse.body &&
																				parsedResponse.body !== '{}' ? (
																					<div className="text-foreground bg-muted/30 rounded p-2 font-mono">
																						{typeof responseBody === 'object' &&
																						responseBody !== null ? (
																							<CollapsibleJson
																								data={responseBody}
																								path="response"
																							/>
																						) : (
																							<pre className="break-all whitespace-pre-wrap">
																								{String(responseBody)}
																							</pre>
																						)}
																					</div>
																				) : (
																					<span className="text-muted-foreground italic">
																						No response body
																					</span>
																				)}
																			</div>
																		)}
																	</ScrollArea>
																</div>
															</ResizablePanel>
														</>
													)}
											</ResizablePanelGroup>
										</TabsContent>

										{/* Comments Tab */}
										<TabsContent
											value="comments"
											className="m-0 flex min-h-0 flex-1 flex-col"
										>
											{/* Comment Input */}
											<div className="bg-muted/30 shrink-0 border-b p-3">
												<div className="flex items-start gap-2">
													<span className="text-muted-foreground mt-2 font-mono text-xs">
														{'>'}
													</span>
													<div className="flex-1">
														<Textarea
															placeholder="Add comment..."
															value={newComment}
															onChange={(e) => setNewComment(e.target.value)}
															className="min-h-[60px] resize-none font-mono text-xs"
														/>
														<div className="mt-2 flex items-center justify-between">
															<div className="flex items-center gap-2">
																<div className="flex gap-0.5">
																	{(
																		[
																			'bug',
																			'lightbulb',
																			'code',
																			'warning',
																		] as const
																	).map((icon) => {
																		const Icon = commentIconMap[icon]
																		return (
																			<Tooltip key={icon}>
																				<TooltipTrigger
																					render={
																						<Button
																							variant="ghost"
																							size="sm"
																							className={`h-5 w-5 p-0 ${
																								selectedCommentIcon === icon
																									? `${commentIconColors[icon]} bg-accent`
																									: 'text-muted-foreground hover:text-foreground'
																							}`}
																							onClick={() =>
																								setSelectedCommentIcon(
																									selectedCommentIcon === icon
																										? null
																										: icon,
																								)
																							}
																							title={icon}
																						>
																							<Icon className="h-3 w-3" />
																						</Button>
																					}
																				></TooltipTrigger>
																				<TooltipContent side="bottom">
																					{icon}
																				</TooltipContent>
																			</Tooltip>
																		)
																	})}
																</div>
																<Tooltip key="clock">
																	<TooltipTrigger
																		render={
																			<Button
																				variant="ghost"
																				size="sm"
																				className={`h-5 px-1 text-[10px] ${
																					addCommentTimestamp
																						? 'text-primary bg-accent'
																						: 'text-muted-foreground'
																				}`}
																				onClick={() =>
																					setAddCommentTimestamp(
																						!addCommentTimestamp,
																					)
																				}
																				title="Add video timestamp"
																			>
																				<Clock className="mr-0.5 h-3 w-3" />
																				{addCommentTimestamp &&
																					formatVideoTimestamp(
																						currentTime * 1000,
																					)}
																			</Button>
																		}
																	></TooltipTrigger>
																	<TooltipContent side="bottom">
																		Add video timestamp
																	</TooltipContent>
																</Tooltip>
															</div>
															<Button
																size="sm"
																className="h-5 px-3 text-[10px]"
																onClick={handleAddComment}
																disabled={!newComment.trim()}
															>
																Submit
															</Button>
														</div>
													</div>
												</div>
											</div>

											{/* Comments List */}
											<ScrollArea className="min-h-0 flex-1">
												{comments.length > 0 ? (
													<div className="divide-border divide-y">
														{comments.map((comment) => (
															<div key={comment.id} className="group">
																{/* Main Comment */}
																<div className="hover:bg-accent/30 p-3 transition-colors">
																	<div className="flex items-start gap-3">
																		{/* Avatar */}
																		<Avatar className="border-border h-8 w-8 shrink-0 border">
																			<AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
																				{comment.userId
																					.substring(0, 2)
																					.toUpperCase()}
																			</AvatarFallback>
																		</Avatar>

																		{/* Content */}
																		<div className="min-w-0 flex-1 space-y-1.5">
																			{/* Header row */}
																			<div className="flex flex-wrap items-center gap-2">
																				<span className="text-foreground text-xs font-medium">
																					User {comment.userId.split('-')[1]}
																				</span>
																				<span className="text-muted-foreground text-xs">
																					{formatCommentTime(comment.createdAt)}
																				</span>
																				{comment.icon &&
																					(() => {
																						const IconComponent =
																							commentIconMap[
																								comment.icon as keyof typeof commentIconMap
																							]
																						return (
																							<Badge
																								variant="outline"
																								className={cn(
																									'h-5 gap-1 px-1.5 text-[10px]',
																									commentIconColors[
																										comment.icon as keyof typeof commentIconColors
																									],
																								)}
																							>
																								<IconComponent className="h-3 w-3" />
																								{comment.icon}
																							</Badge>
																						)
																					})()}
																				{comment.timestampMs !== null && (
																					<Tooltip key="clock-timestamp">
																						<TooltipTrigger
																							render={
																								<Badge
																									variant="secondary"
																									className="hover:bg-secondary/80 h-5 cursor-pointer gap-1 px-1.5 text-[10px]"
																								>
																									<Clock className="h-3 w-3" />
																									{formatVideoTimestamp(
																										comment.timestampMs,
																									)}
																								</Badge>
																							}
																						></TooltipTrigger>
																						<TooltipContent side="bottom">
																							Go to this time in recording
																						</TooltipContent>
																					</Tooltip>
																				)}
																			</div>

																			{/* Comment text */}
																			<p className="text-foreground text-sm leading-relaxed">
																				{comment.content}
																			</p>

																			{/* Actions row */}
																			<div className="flex items-center gap-1 pt-1">
																				<Button
																					variant="ghost"
																					size="sm"
																					className="text-muted-foreground hover:text-foreground h-6 gap-1 px-2 text-xs"
																					onClick={() => handleLike(comment.id)}
																				>
																					<Heart
																						className={cn(
																							'h-3.5 w-3.5',
																							comment.likes > 0 &&
																								'fill-red-500 text-red-500',
																						)}
																					/>
																					{comment.likes > 0 && comment.likes}
																				</Button>
																				<Button
																					variant="ghost"
																					size="sm"
																					className="text-muted-foreground hover:text-foreground h-6 gap-1 px-2 text-xs"
																					onClick={() =>
																						setReplyingTo(
																							replyingTo === comment.id
																								? null
																								: comment.id,
																						)
																					}
																				>
																					<Reply className="h-3.5 w-3.5" />
																					Reply
																				</Button>
																			</div>
																		</div>
																	</div>

																	{/* Reply Input */}
																	{replyingTo === comment.id && (
																		<div className="bg-muted/50 mt-3 ml-11 rounded-lg border p-3">
																			<Textarea
																				placeholder="Write a reply..."
																				value={replyContent}
																				onChange={(e) =>
																					setReplyContent(e.target.value)
																				}
																				className="bg-background min-h-[60px] resize-none text-sm"
																			/>
																			<div className="mt-2 flex items-center justify-end gap-2">
																				<Button
																					variant="ghost"
																					size="sm"
																					className="h-7 px-3 text-xs"
																					onClick={() => setReplyingTo(null)}
																				>
																					Cancel
																				</Button>
																				<Button
																					size="sm"
																					className="h-7 px-3 text-xs"
																					onClick={() =>
																						handleReply(comment.id)
																					}
																				>
																					Reply
																				</Button>
																			</div>
																		</div>
																	)}

																	{/* Replies */}
																	{!comment.collapsed &&
																		comment.replies &&
																		comment.replies.length > 0 && (
																			<div className="mt-3 ml-11 space-y-2">
																				{comment.replies.map(
																					(reply: Comment) => (
																						<div
																							key={reply.id}
																							className="bg-muted/30 border-primary/20 flex items-start gap-2 rounded-lg border-l-0 p-2"
																						>
																							<Avatar className="border-border h-6 w-6 shrink-0 border">
																								<AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
																									{reply.userId
																										.substring(0, 2)
																										.toUpperCase()}
																								</AvatarFallback>
																							</Avatar>
																							<div className="min-w-0 flex-1">
																								<div className="mb-0.5 flex items-center gap-2">
																									<span className="text-foreground text-xs font-medium">
																										User{' '}
																										{reply.userId.split('-')[1]}
																									</span>
																									<span className="text-muted-foreground text-[10px]">
																										{formatCommentTime(
																											reply.createdAt,
																										)}
																									</span>
																								</div>
																								<p className="text-foreground text-xs leading-relaxed">
																									{reply.content}
																								</p>
																							</div>
																							<Button
																								variant="ghost"
																								size="sm"
																								className="text-muted-foreground hover:text-foreground h-6 shrink-0 px-1.5"
																								onClick={() =>
																									handleLike(
																										reply.id,
																										true,
																										comment.id,
																									)
																								}
																							>
																								<Heart
																									className={cn(
																										'h-3 w-3',
																										reply.likes > 0 &&
																											'fill-red-500 text-red-500',
																									)}
																								/>
																								{reply.likes > 0 && (
																									<span className="ml-0.5 text-[10px]">
																										{reply.likes}
																									</span>
																								)}
																							</Button>
																						</div>
																					),
																				)}
																			</div>
																		)}
																</div>
															</div>
														))}
													</div>
												) : (
													<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-4 text-sm">
														<Reply className="text-muted-foreground/50 h-8 w-8" />
														<p>No comments yet</p>
														<p className="text-xs">
															Be the first to add a comment!
														</p>
													</div>
												)}
											</ScrollArea>
										</TabsContent>
									</Tabs>
								</div>
							</ResizablePanel>
						</>
					)}
				</ResizablePanelGroup>

				{/* AI Chat Button and Panel */}
				{isChatOpen && (
					<div className="bg-background border-border fixed right-4 bottom-20 z-50 flex h-[32rem] w-96 flex-col rounded-lg border shadow-2xl">
						{/* Chat Header */}
						<div className="bg-foreground text-background flex shrink-0 items-center justify-between rounded-lg border-b p-4">
							<div className="flex items-center gap-2">
								<Sparkles className="h-5 w-5" />
								<span className="font-semibold">Bug Report Assistant</span>
							</div>
							<button
								onClick={() => setIsChatOpen(false)}
								className="hover:bg-background/20 rounded p-1 transition-colors"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<ScrollArea className="min-h-0 flex-1">
							<div ref={chatMessagesRef} className="space-y-4 p-4">
								{chatMessages.map((message, index) => (
									<div
										key={index}
										className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
									>
										<div
											className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
												message.role === 'user'
													? 'bg-foreground text-background'
													: 'bg-muted text-foreground'
											}`}
										>
											<div className="leading-relaxed whitespace-pre-wrap">
												{message.content}
											</div>
										</div>
									</div>
								))}
								{isChatLoading && (
									<div className="flex justify-start">
										<div className="bg-muted rounded-xl px-4 py-3">
											<div className="flex gap-1">
												<span
													className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"
													style={{ animationDelay: '0ms' }}
												></span>
												<span
													className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"
													style={{ animationDelay: '150ms' }}
												></span>
												<span
													className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"
													style={{ animationDelay: '300ms' }}
												></span>
											</div>
										</div>
									</div>
								)}
							</div>
						</ScrollArea>

						{/* Chat Input */}
						<div className="shrink-0 border-t p-3">
							<div className="flex gap-2">
								<input
									type="text"
									value={chatInput}
									onChange={(e) => setChatInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault()
											void handleSendMessage()
										}
									}}
									placeholder="Ask about this bug report..."
									className="bg-muted focus:ring-foreground/20 flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
								/>
								<button
									onClick={handleSendMessage}
									disabled={!chatInput.trim() || isChatLoading}
									className="bg-foreground text-background rounded-lg p-2 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
								>
									<Send className="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Floating Button */}
				<button
					onClick={() => setIsChatOpen(!isChatOpen)}
					className={`bg-foreground text-background fixed right-6 bottom-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${
						isChatOpen ? 'rotate-0' : ''
					}`}
				>
					{isChatOpen ? (
						<X className="h-6 w-6" />
					) : (
						<Sparkles className="h-6 w-6" />
					)}
				</button>
			</div>
		</TooltipProvider>
	)
}

export default RecordingViewer
