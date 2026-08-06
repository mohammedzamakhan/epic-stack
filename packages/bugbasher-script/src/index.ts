// Export main classes and types for internal use
export { BugBasher } from './bugbasher.js'
export { OpenReplayIntegration } from './openreplay.js'
export { Toolbar } from './toolbar-react.js'
export { CommentSystem } from './comment-system.js'
export { Communication } from './communication.js'
export { ExtensionBridge, extensionBridge } from './extension-bridge.js'

// Export composable toolbar components
export {
	ToolbarRoot,
	ToolbarContainer,
	ToolbarButton,
	ToolbarDragHandle,
	ToolbarGroup,
	ToolbarSeparator,
	RecordIcon,
	CommentIcon,
	FrameIcon,
	TypographyIcon,
	PhotoIcon,
	PlusIcon,
	useToolbarContext,
} from './components/toolbar/index.js'

export type {
	BugBasherAPI,
	BugBasherConfig,
	SessionData,
	Comment,
	ToolbarState,
	BroadcastMessage,
	WatcherMessage,
	OpenReplayTracker,
} from './types.js'

export type {
	ExtensionCapabilities,
	ExtensionBridgeResult,
	ExtensionBridgeResponse,
	ExtensionBridgeError,
	RecordingEventType,
	RecordingStatusPayload,
	RecordingStoppedPayload,
	RecordingErrorPayload,
} from './extension-bridge.js'

// The main script.js is built separately via Vite
// This index is for TypeScript imports within the monorepo
