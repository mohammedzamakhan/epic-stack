import type { ToolbarState } from './types.js'

export class Toolbar {
	private shadowRoot: ShadowRoot
	private container: HTMLElement
	private state: ToolbarState
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
	) {
		// Validate and sanitize projectId
		const sanitizedProjectId = this.sanitizeProjectId(projectId)
		if (!sanitizedProjectId) {
			throw new Error('Invalid project ID provided to Toolbar')
		}

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

		// Create the container element
		this.container = document.createElement('div')
		this.container.id = 'bugbasher-toolbar-container'

		// Create shadow DOM for style isolation (with fallback for test environments)
		try {
			this.shadowRoot = this.container.attachShadow({ mode: 'closed' })
		} catch (error) {
			// Fallback for environments that don't support shadow DOM (like jsdom)
			console.warn('Shadow DOM not supported, using regular DOM')
			this.shadowRoot = this.container as any // Type assertion for test compatibility
		}

		this.createToolbar()
		this.attachEventListeners()
	}

	private sanitizeProjectId(projectId: string): string | null {
		if (!projectId || typeof projectId !== 'string') {
			return null
		}

		// Trim whitespace and check if empty
		const trimmed = projectId.trim()
		if (trimmed.length === 0) {
			return null
		}

		return trimmed
	}

	private createToolbar(): void {
		this.shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
        }

        .toolbar {
          position: absolute;
          background: #ffffff;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 8px;
          display: flex;
          gap: 8px;
          align-items: center;
          pointer-events: auto;
          cursor: move;
          user-select: none;
          min-width: 120px;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
        }

        .toolbar.dragging {
          cursor: grabbing;
        }

        .toolbar-button {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #495057;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 60px;
          justify-content: center;
        }

        .toolbar-button:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .toolbar-button.active {
          background: #dc3545;
          border-color: #dc3545;
          color: white;
        }

        .toolbar-button.recording {
          background: #dc3545;
          border-color: #dc3545;
          color: white;
          animation: pulse 2s infinite;
        }

        .toolbar-button.commenting {
          background: #0d6efd;
          border-color: #0d6efd;
          color: white;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .record-icon {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .comment-icon {
          width: 10px;
          height: 10px;
          border: 1px solid currentColor;
          border-radius: 2px;
          position: relative;
        }

        .comment-icon::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 2px;
          width: 0;
          height: 0;
          border-left: 3px solid transparent;
          border-right: 3px solid transparent;
          border-top: 3px solid currentColor;
        }

        .drag-handle {
          width: 4px;
          height: 16px;
          background: repeating-linear-gradient(
            to bottom,
            #dee2e6 0px,
            #dee2e6 2px,
            transparent 2px,
            transparent 4px
          );
          cursor: grab;
          margin-right: 4px;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .hidden {
          display: none !important;
        }
      </style>
      
      <div class="toolbar" id="toolbar">
        <div class="drag-handle" id="dragHandle"></div>
        <button class="toolbar-button" id="recordButton">
          <div class="record-icon"></div>
          <span id="recordText">Record</span>
        </button>
        <button class="toolbar-button" id="commentButton">
          <div class="comment-icon"></div>
          <span>Comment</span>
        </button>
      </div>
    `
	}

	private attachEventListeners(): void {
		const toolbar = this.shadowRoot.getElementById('toolbar')!
		const dragHandle = this.shadowRoot.getElementById('dragHandle')!
		const recordButton = this.shadowRoot.getElementById('recordButton')!
		const commentButton = this.shadowRoot.getElementById('commentButton')!

		// Drag functionality
		let isDragging = false
		let dragOffset = { x: 0, y: 0 }

		const startDrag = (e: MouseEvent) => {
			isDragging = true
			this.state.isDragging = true
			toolbar.classList.add('dragging')

			const rect = toolbar.getBoundingClientRect()
			dragOffset.x = e.clientX - rect.left
			dragOffset.y = e.clientY - rect.top

			e.preventDefault()
		}

		const drag = (e: MouseEvent) => {
			if (!isDragging) return

			const newX = e.clientX - dragOffset.x
			const newY = e.clientY - dragOffset.y

			// Keep toolbar within viewport bounds
			const maxX = window.innerWidth - toolbar.offsetWidth
			const maxY = window.innerHeight - toolbar.offsetHeight

			this.state.position.x = Math.max(0, Math.min(newX, maxX))
			this.state.position.y = Math.max(0, Math.min(newY, maxY))

			this.updatePosition()
			e.preventDefault()
		}

		const stopDrag = () => {
			if (!isDragging) return

			isDragging = false
			this.state.isDragging = false
			toolbar.classList.remove('dragging')

			// Save position to localStorage
			this.savePosition()
		}

		// Attach drag events
		dragHandle.addEventListener('mousedown', startDrag)
		toolbar.addEventListener('mousedown', (e) => {
			if (e.target === toolbar || e.target === dragHandle) {
				startDrag(e)
			}
		})

		document.addEventListener('mousemove', drag)
		document.addEventListener('mouseup', stopDrag)

		// Button click handlers
		recordButton.addEventListener('click', (e) => {
			e.stopPropagation()
			if (this.state.isRecording) {
				this.onStopRecording()
			} else {
				this.onStartRecording()
			}
		})

		commentButton.addEventListener('click', (e) => {
			e.stopPropagation()
			if (this.state.isCommenting) {
				this.onStopCommenting()
			} else {
				this.onStartCommenting()
			}
		})
	}

	private updatePosition(): void {
		const toolbar = this.shadowRoot.getElementById('toolbar')!
		toolbar.style.left = `${this.state.position.x}px`
		toolbar.style.top = `${this.state.position.y}px`
	}

	private savePosition(): void {
		try {
			localStorage.setItem(
				'bugbasher_toolbar_position',
				JSON.stringify(this.state.position),
			)
		} catch (error) {
			console.warn('Failed to save toolbar position:', error)
		}
	}

	private loadPosition(): void {
		try {
			const saved = localStorage.getItem('bugbasher_toolbar_position')
			if (saved) {
				const position = JSON.parse(saved)
				this.state.position = position
			}
		} catch (error) {
			console.warn('Failed to load toolbar position:', error)
		}
	}

	show(): void {
		if (this.state.isVisible) return

		this.state.isVisible = true
		this.loadPosition()

		// Add to DOM
		document.body.appendChild(this.container)

		// Update position
		this.updatePosition()
	}

	hide(): void {
		if (!this.state.isVisible) return

		this.state.isVisible = false

		// Remove from DOM
		if (this.container.parentNode) {
			this.container.parentNode.removeChild(this.container)
		}
	}

	updateRecordingState(isRecording: boolean): void {
		this.state.isRecording = isRecording

		const recordButton = this.shadowRoot.getElementById('recordButton')!
		const recordText = this.shadowRoot.getElementById('recordText')!

		if (isRecording) {
			recordButton.classList.add('recording')
			recordText.textContent = 'Stop'
		} else {
			recordButton.classList.remove('recording')
			recordText.textContent = 'Record'
		}
	}

	updateCommentingState(isCommenting: boolean): void {
		this.state.isCommenting = isCommenting

		const commentButton = this.shadowRoot.getElementById('commentButton')!

		if (isCommenting) {
			commentButton.classList.add('commenting')
		} else {
			commentButton.classList.remove('commenting')
		}
	}

	setVisible(visible: boolean): void {
		const toolbar = this.shadowRoot.getElementById('toolbar')!
		if (visible) {
			toolbar.classList.remove('hidden')
		} else {
			toolbar.classList.add('hidden')
		}
	}

	isVisible(): boolean {
		return this.state.isVisible
	}

	setRecording(isRecording: boolean): void {
		this.updateRecordingState(isRecording)
	}

	setCommenting(isCommenting: boolean): void {
		this.updateCommentingState(isCommenting)
	}

	destroy(): void {
		this.hide()
		// Clean up event listeners would be handled by removing the element
	}
}
