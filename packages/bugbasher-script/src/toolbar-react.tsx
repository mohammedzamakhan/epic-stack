import { render } from 'preact'
import { BugBasherToolbar } from './components/toolbar/BugBasherToolbar'
import { Logger } from './logger.js'
import type { ToolbarState } from './types.js'

// Tailwind CSS - will be injected into shadow DOM
const TOOLBAR_STYLES = `
/* Complete CSS reset for Shadow DOM isolation */
*, *::before, *::after {
  all: unset;
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;
  border-color: currentColor;
}

/* Base styles */
:host {
  all: initial;
  font-family: Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #fafafa;
  display: block;
}

/* Design system colors - Isolated within Shadow DOM */
:host, * {
  /* Reset all CSS custom properties to prevent inheritance */
  --background: initial;
  --foreground: initial;
  --border: initial;
  --input: initial;
  --input-foreground: initial;
  --accent: initial;
  --accent-foreground: initial;
  --ring: initial;
  --destructive: initial;
}

/* Define our own isolated CSS variables */
:host {
  --bb-background: hsl(224, 71%, 4%);
  --bb-foreground: hsl(213, 31%, 91%);
  --bb-border: hsl(216, 34%, 17%);
  --bb-input: hsl(216, 34%, 17%);
  --bb-input-foreground: hsl(213, 31%, 91%);
  --bb-accent: hsl(216, 34%, 17%);
  --bb-accent-foreground: hsl(213, 31%, 91%);
  --bb-ring: hsl(216, 34%, 17%);
  --bb-destructive: rgb(239 68 68);
}

/* Tailwind utilities used by toolbar */
.fixed { position: fixed; }
.absolute { position: absolute; }
.relative { position: relative; }

.bottom-4 { bottom: calc(0.25rem * 4); }
.left-1/2 { left: 50%; }
.-translate-x-1/2 { translate: -50%; }

.z-50 { z-index: 50; }
.z-\\[2147483647\\] { z-index: 2147483647; }

.flex { display: flex; }
.inline-flex { display: inline-flex; }

.h-4 { height: calc(0.25rem * 4); }
.h-7 { height: calc(0.25rem * 7); }
.h-10 { height: calc(0.25rem * 10); }

.w-fit { width: fit-content; }
.w-px { width: 1px; }
.shrink-0 { flex-shrink: 0; }

.cursor-grab { cursor: grab; }
.cursor-grabbing { cursor: grabbing; }
.cursor-pointer { cursor: pointer; }

.select-none { user-select: none; }

.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-start { justify-content: flex-start; }

.gap-1 { gap: calc(0.25rem * 1); }
.gap-2 { gap: calc(0.25rem * 2); }

.rounded-md { border-radius: calc(0.625rem - 2px); }
.rounded-xl { border-radius: calc(0.625rem + 4px); }

.bg-background { background-color: var(--bb-background); }
.bg-border { background-color: var(--bb-border); }
.bg-input { background-color: var(--bb-input); }
.text-input-foreground { color: var(--bb-input-foreground); }

.border { border-width: 1px; }
.border-border { border-color: var(--bb-border); }

.px-2 { padding-inline: calc(0.25rem * 2); }
.py-1 { padding-block: calc(0.25rem * 1); }

.text-xs { font-size: 0.75rem; line-height: 12px; }
.leading-none { line-height: 1; }
.font-normal { font-weight: 400; }
.whitespace-nowrap { white-space: nowrap; }

.shadow-lg { 
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px,
              rgba(0, 0, 0, 0) 0px 0px 0px 0px,
              rgba(0, 0, 0, 0) 0px 0px 0px 0px,
              rgba(0, 0, 0, 0) 0px 0px 0px 0px,
              rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
              rgba(0, 0, 0, 0.1) 0px 4px 6px -4px;
}

.transition-all { 
  transition-property: all; 
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); 
  transition-duration: 0.15s; 
}

.pointer-events-none { pointer-events: none; }
.pointer-events-auto { pointer-events: auto; }

/* Focus styles */
.focus-visible\\:outline-1:focus-visible { outline-style: solid; outline-width: 1px; }
.focus-visible\\:outline-ring:focus-visible { outline-color: var(--bb-ring); }
.focus-visible\\:ring-\\[4px\\]:focus-visible { box-shadow: none; }
.focus-visible\\:ring-ring\\/50:focus-visible { }

/* Hover styles */
.hover\\:bg-accent:hover { background-color: var(--bb-accent); }
.hover\\:bg-accent\\/10:hover { background-color: color-mix(in oklab, var(--bb-accent) 10%, transparent); }
.hover\\:bg-input\\/80:hover { background-color: color-mix(in oklab, var(--bb-input) 80%, transparent); }
.hover\\:text-accent-foreground:hover { color: var(--bb-accent-foreground); }

/* Active styles */
.active\\:scale-\\[0\\.98\\]:active { scale: 0.98; }

/* Disabled styles */
.disabled\\:pointer-events-none:disabled { pointer-events: none; }
.disabled\\:opacity-50:disabled { opacity: 0.5; }

/* Data attribute styles */
.data-\\[size\\=icon\\]\\:size-7[data-size="icon"] { 
  width: calc(0.25rem * 7); 
  height: calc(0.25rem * 7); 
}

.has-\\[\\>svg\\]\\:px-2:has(> svg) { padding-inline: calc(0.25rem * 2); }

/* SVG styles */
.\\[\\&_svg\\]\\:pointer-events-none svg { pointer-events: none; }
.\\[\\&_svg\\]\\:shrink-0 svg { flex-shrink: 0; }
.\\[\\&_svg\\:not\\(\\[class\\*\\=\\'size-\\'\\]\\)\\]\\:size-4 svg:not([class*="size-"]) { 
  width: calc(0.25rem * 4); 
  height: calc(0.25rem * 4); 
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dark\\:hover\\:bg-accent\\/50:hover { 
    background-color: color-mix(in oklab, var(--bb-accent) 50%, transparent); 
  }
}

/* Recording state */
.bg-red-500 { background-color: rgb(239 68 68); }
.bg-red-600 { background-color: rgb(220 38 38); }
.border-red-500 { border-color: rgb(239 68 68); }
.border-red-600 { border-color: rgb(220 38 38); }
.text-white { color: rgb(255 255 255); }
.hover\\:bg-red-600:hover { background-color: rgb(220 38 38); }
.hover\\:border-red-600:hover { border-color: rgb(220 38 38); }

/* Commenting state */
.bg-blue-500 { background-color: rgb(59 130 246); }
.bg-blue-600 { background-color: rgb(37 99 235); }
.border-blue-500 { border-color: rgb(59 130 246); }
.border-blue-600 { border-color: rgb(37 99 235); }
.hover\\:bg-blue-600:hover { background-color: rgb(37 99 235); }
.hover\\:border-blue-600:hover { border-color: rgb(37 99 235); }

/* Animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

/* Icon styles for legacy components */
.w-2 { width: 0.5rem; }
.h-2 { height: 0.5rem; }
.w-2\\.5 { width: 0.625rem; }
.h-2\\.5 { height: 0.625rem; }
.rounded-full { border-radius: 9999px; }
.rounded-sm { border-radius: 0.125rem; }
.bg-current { background-color: currentColor; }
.border { border-width: 1px; }
.border-current { border-color: currentColor; }

.border-l-\\[3px\\] { border-left-width: 3px; }
.border-r-\\[3px\\] { border-right-width: 3px; }
.border-t-\\[3px\\] { border-top-width: 3px; }
.border-l-transparent { border-left-color: transparent; }
.border-r-transparent { border-right-color: transparent; }
.border-t-current { border-top-color: currentColor; }

.-bottom-0\\.5 { bottom: -0.125rem; }
.left-0\\.5 { left: 0.125rem; }
.w-0 { width: 0px; }
.h-0 { height: 0px; }
`

export class ReactToolbar {
	private container: HTMLElement
	private shadowRoot: ShadowRoot
	private mountPoint: HTMLElement | null = null
	private state: ToolbarState
	private logger: Logger
	private onStartRecording: () => void
	private onStopRecording: () => void
	private onStartCommenting: () => void
	private onStopCommenting: () => void

	constructor(
		projectId: string,
		onStartRecording: () => void,
		onStopRecording: () => void,
		onStartCommenting: () => void,
		onStopCommenting: () => void,
		debug: boolean = false,
	) {
		const sanitizedProjectId = this.sanitizeProjectId(projectId)
		if (!sanitizedProjectId) {
			throw new Error('Invalid project ID provided to Toolbar')
		}

		this.logger = new Logger(debug, 'BugBasher')
		this.onStartRecording = onStartRecording
		this.onStopRecording = onStopRecording
		this.onStartCommenting = onStartCommenting
		this.onStopCommenting = onStopCommenting

		this.state = {
			isVisible: false,
			isRecording: false,
			isCommenting: false,
			projectId: sanitizedProjectId,
			position: { x: 20, y: 20 },
			isDragging: false,
		}

		this.container = document.createElement('div')
		this.container.id = 'bugbasher-toolbar-container'

		try {
			this.shadowRoot = this.container.attachShadow({ mode: 'closed' })
			this.logger.log('Shadow DOM created successfully', this.shadowRoot)
		} catch (error) {
			this.logger.warn('Shadow DOM not supported, using regular DOM', error)
			this.shadowRoot = this.container as unknown as ShadowRoot
		}

		this.injectStyles()
		this.createMountPoint()
	}

	private sanitizeProjectId(projectId: string): string | null {
		if (!projectId || typeof projectId !== 'string') {
			return null
		}
		const trimmed = projectId.trim()
		return trimmed.length === 0 ? null : trimmed
	}

	private injectStyles(): void {
		const styleElement = document.createElement('style')
		styleElement.textContent = TOOLBAR_STYLES
		styleElement.style.display = 'none'
		this.shadowRoot.appendChild(styleElement)
		this.logger.log('Styles injected into Shadow DOM', {
			shadowRoot: this.shadowRoot,
			stylesLength: TOOLBAR_STYLES.length,
			isActualShadowRoot: this.shadowRoot instanceof ShadowRoot,
		})
	}

	private createMountPoint(): void {
		this.mountPoint = document.createElement('div')
		this.mountPoint.id = 'bugbasher-preact-root'
		this.shadowRoot.appendChild(this.mountPoint)
	}

	private renderToolbar(): void {
		if (!this.mountPoint) return

		render(
			<BugBasherToolbar
				isRecording={this.state.isRecording}
				isCommenting={this.state.isCommenting}
				onStartRecording={this.onStartRecording}
				onStopRecording={this.onStopRecording}
				onStartCommenting={this.onStartCommenting}
				onStopCommenting={this.onStopCommenting}
			/>,
			this.mountPoint,
		)
	}

	show(): void {
		if (this.state.isVisible) return

		this.state.isVisible = true
		document.body.appendChild(this.container)
		this.renderToolbar()
		this.logger.log('Toolbar shown', {
			container: this.container,
			shadowRoot: this.shadowRoot,
			isActualShadowRoot: this.shadowRoot instanceof ShadowRoot,
			containerParent: this.container.parentNode,
		})
	}

	hide(): void {
		if (!this.state.isVisible) return

		this.state.isVisible = false
		if (this.mountPoint) {
			render(null, this.mountPoint)
		}
		if (this.container.parentNode) {
			this.container.parentNode.removeChild(this.container)
		}
	}

	setRecording(isRecording: boolean): void {
		this.state.isRecording = isRecording
		this.renderToolbar()
	}

	setCommenting(isCommenting: boolean): void {
		this.state.isCommenting = isCommenting
		this.renderToolbar()
	}

	updateRecordingState(isRecording: boolean): void {
		this.setRecording(isRecording)
	}

	updateCommentingState(isCommenting: boolean): void {
		this.setCommenting(isCommenting)
	}

	setVisible(visible: boolean): void {
		if (visible) {
			this.show()
		} else {
			this.hide()
		}
	}

	isVisible(): boolean {
		return this.state.isVisible
	}

	destroy(): void {
		if (this.mountPoint) {
			render(null, this.mountPoint)
		}
		this.hide()
	}
}

export { ReactToolbar as Toolbar }
