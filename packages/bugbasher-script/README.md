# BugBasher Embedded Script

This package contains the embedded script that customers include on their
websites to enable BugBasher bug recording functionality.

## Architecture

The BugBasher script uses a **recorder page delegation architecture** where
screen capture is handled by opening a dedicated recorder page instead of using
iframe communication. This provides better user experience and simpler
architecture.

### Components

- **Embedded Script** (`script.js`): Handles toolbar UI, comment system,
  OpenReplay integration
- **Recorder Page** (`/recorder/{projectId}`): Handles screen capture,
  MediaRecorder API, video processing, and recording review
- **Communication Layer**: BroadcastChannel-based communication between script
  and recorder page

### Benefits

- **Better UX**: Current tab is visible in screen selector since recorder opens
  in new tab
- **Immediate Review**: Users can review and save recordings directly in the
  recorder page
- **Simpler Architecture**: No complex iframe communication needed
- **Cross-tab coordination**: BroadcastChannel enables coordination between
  pages

## Features

- **Floating Toolbar**: Non-invasive UI with Record and Comment buttons
- **Screen Recording**: Capture screen/tab video using MediaRecorder API
- **Comment System**: Add annotated screenshots with element highlighting
- **OpenReplay Integration**: Automatic capture of network requests, console
  logs, and user interactions
- **Cross-Tab Communication**: Coordinate with recorder page via
  BroadcastChannel
- **Session Management**: Store and transfer recording data to review page
- **Shadow DOM Isolation**: Prevent style conflicts with host website

## Installation

### For Customers

Add the following script tag to your website:

```html
<script
	src="https://your-domain.com/bugbasher/script.js"
	data-project-id="your-project-id"
	data-api-origin="https://your-domain.com"
	data-auto-show="true"
	data-debug="false"
></script>
```

### Script Tag Attributes

- `data-project-id` (required): Your BugBasher project ID
- `data-api-origin` (optional): API origin URL (defaults to current origin)
- `data-auto-show` (optional): Auto-show toolbar on load (default: true)
- `data-debug` (optional): Enable debug logging (default: false)

## Development

### Build

```bash
npm run build
```

This creates `dist/script.iife.js` - a standalone IIFE bundle that can be
embedded on any website.

### Development Mode

```bash
npm run dev
```

Watches for changes and rebuilds automatically.

### Type Checking

```bash
npm run typecheck
```

## API Usage

### Recording Flow

1. Customer includes script on their website
2. User clicks "Record" in floating toolbar
3. Script opens recorder page in new tab with query parameters
   (`/recorder/{projectId}?source=toolbar&sessionId=...&autoStart=true&returnUrl=...`)
4. Recorder page auto-starts screen sharing permission request
5. User selects screen/tab to record (current tab is visible in selector)
6. Recorder page starts MediaRecorder and shows recording interface
7. User can stop recording from recorder page
8. Recorder page shows immediate preview and review interface
9. User can save recording or discard it
10. User can return to original page or view saved recording

### Cross-tab Communication

The recorder page communicates with the embedded script via BroadcastChannel:

- `RECORDING_STARTED`: Notifies script that recording has begun
- `RECORDING_STOPPED`: Notifies script that recording has ended
- Script updates toolbar state based on these messages

Once loaded, the script exposes a global `window.BugBasher` API:

```javascript
// Show/hide toolbar
window.BugBasher.showToolbar('project-id')
window.BugBasher.hideToolbar()

// Recording control
await window.BugBasher.startRecording()
const sessionData = await window.BugBasher.stopRecording()
const isRecording = window.BugBasher.getIsRecording()

// User identification
window.BugBasher.setUser('user-123', {
	name: 'John Doe',
	email: 'john@example.com',
})

// Custom event tracking
window.BugBasher.trackEvent('button_clicked', { buttonId: 'submit' })
window.BugBasher.reportIssue('Login failed', { errorCode: 401 })

// OpenReplay session info
const sessionToken = window.BugBasher.getSessionToken()
const sessionURL = window.BugBasher.getSessionURL()
```

## Architecture

### Core Components

1. **BugBasher** (`bugbasher.ts`): Main orchestrator class
2. **Toolbar** (`toolbar.ts`): Floating UI component with shadow DOM
3. **ScreenCapture** (`screen-capture.ts`): MediaRecorder integration
4. **CommentSystem** (`comment-system.ts`): Element highlighting and screenshot
   capture
5. **OpenReplayIntegration** (`openreplay.ts`): OpenReplay SDK wrapper
6. **Communication** (`communication.ts`): Cross-tab messaging and session
   storage

### Data Flow

1. User clicks Record button on toolbar
2. Screen capture starts via `getDisplayMedia()`
3. OpenReplay tracker captures network/console/DOM events
4. User can add comments with screenshots during recording
5. On stop, session data is assembled and stored in localStorage
6. Review page opens in new tab and receives data via postMessage
7. User previews and submits bug report

## Browser Compatibility

- Chrome/Edge (Chromium): Full support
- Firefox: Full support
- Safari: Full support (with MediaRecorder polyfill if needed)

### Required APIs

- `navigator.mediaDevices.getDisplayMedia`
- `MediaRecorder`
- `localStorage`
- `BroadcastChannel` (optional, for cross-tab communication)
- `ShadowRoot` (for toolbar isolation)

## Security Considerations

- Shadow DOM prevents CSS injection from host website
- postMessage origin validation for cross-frame communication
- localStorage quota handling with graceful degradation
- Privacy controls for sensitive data (emails, headers, etc.)

## License

Private - Internal use only
