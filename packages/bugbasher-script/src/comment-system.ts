import { domToPng } from 'modern-screenshot'
import { extensionBridge } from './extension-bridge.js'
import { Logger } from './logger.js'
import type { Comment } from './types.js'

export class CommentSystem {
	private isActive = false
	private overlay: HTMLElement | null = null
	private comments: Comment[] = []
	private recordingStartTime: number = 0
	private onCommentAdded?: (comment: Comment) => void
	private logger: Logger

	constructor(
		onCommentAdded?: (comment: Comment) => void,
		debug: boolean = false,
	) {
		this.onCommentAdded = onCommentAdded
		this.logger = new Logger(debug, 'BugBasher')
	}

	startCommenting(recordingStartTime?: number): void {
		if (this.isActive) return

		this.isActive = true
		this.recordingStartTime = recordingStartTime || Date.now()
		this.createOverlay()
		this.attachEventListeners()
		this.setCursor()

		this.logger.log('Comment mode started')
	}

	stopCommenting(): void {
		if (!this.isActive) return

		this.isActive = false
		this.removeOverlay()
		this.removeEventListeners()
		this.resetCursor()

		this.logger.log('Comment mode stopped')
	}

	private createOverlay(): void {
		// Create overlay for highlighting elements
		this.overlay = document.createElement('div')
		this.overlay.id = 'bugbasher-comment-overlay'
		this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483646;
      background: transparent;
    `

		document.body.appendChild(this.overlay)
	}

	private removeOverlay(): void {
		if (this.overlay && this.overlay.parentNode) {
			this.overlay.parentNode.removeChild(this.overlay)
			this.overlay = null
		}
		this.clearHighlight()
	}

	private setCursor(): void {
		document.body.style.cursor = 'crosshair'
	}

	private resetCursor(): void {
		document.body.style.cursor = ''
	}

	private attachEventListeners(): void {
		document.addEventListener('mouseover', this.handleMouseOver)
		document.addEventListener('mouseout', this.handleMouseOut)
		document.addEventListener('click', this.handleClick)
		document.addEventListener('keydown', this.handleKeyDown)
	}

	private removeEventListeners(): void {
		document.removeEventListener('mouseover', this.handleMouseOver)
		document.removeEventListener('mouseout', this.handleMouseOut)
		document.removeEventListener('click', this.handleClick)
		document.removeEventListener('keydown', this.handleKeyDown)
	}

	private handleMouseOver = (event: MouseEvent): void => {
		if (!this.isActive) return

		const target = event.target as HTMLElement

		// Skip BugBasher elements
		if (this.isBugBasherElement(target)) return

		this.highlightElement(target)
	}

	private handleMouseOut = (event: MouseEvent): void => {
		if (!this.isActive) return

		const target = event.target as HTMLElement

		// Skip BugBasher elements
		if (this.isBugBasherElement(target)) return

		this.clearHighlight()
	}

	private handleClick = async (event: MouseEvent): Promise<void> => {
		if (!this.isActive) return

		event.preventDefault()
		event.stopPropagation()

		const target = event.target as HTMLElement

		// Skip BugBasher elements
		if (this.isBugBasherElement(target)) return

		await this.captureComment(target, event.clientX, event.clientY)
	}

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (!this.isActive) return

		// Exit comment mode on Escape
		if (event.key === 'Escape') {
			event.preventDefault()
			this.stopCommenting()
		}
	}

	private isBugBasherElement(element: HTMLElement): boolean {
		// Check if element is part of BugBasher UI
		return !!(
			element.closest('#bugbasher-toolbar-container') ||
			element.closest('#bugbasher-comment-overlay') ||
			element.closest('#bugbasher-comment-dialog') ||
			element.id?.startsWith('bugbasher-') ||
			element.className?.includes('bugbasher-')
		)
	}

	private highlightElement(element: HTMLElement): void {
		this.clearHighlight()

		const rect = element.getBoundingClientRect()
		const scrollX = window.pageXOffset || document.documentElement.scrollLeft
		const scrollY = window.pageYOffset || document.documentElement.scrollTop

		// Create highlight overlay
		const highlight = document.createElement('div')
		highlight.id = 'bugbasher-element-highlight'
		highlight.style.cssText = `
      position: absolute;
      left: ${rect.left + scrollX}px;
      top: ${rect.top + scrollY}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid #0d6efd;
      background: rgba(13, 110, 253, 0.1);
      pointer-events: none;
      z-index: 2147483647;
      box-sizing: border-box;
    `

		if (this.overlay) {
			this.overlay.appendChild(highlight)
		}
	}

	private clearHighlight(): void {
		if (this.overlay) {
			const existing = this.overlay.querySelector(
				'#bugbasher-element-highlight',
			)
			if (existing) {
				existing.remove()
			}
		}
	}

	private async captureComment(
		element: HTMLElement,
		x: number,
		y: number,
	): Promise<void> {
		try {
			// Clear highlight before screenshot
			this.clearHighlight()

			this.logger.log('Starting comment capture...')

			// Capture screenshot of the viewport
			const screenshot = await this.captureScreenshot()
			this.logger.log('Screenshot captured successfully')

			// Show comment dialog with screenshot
			const message = await this.showCommentDialog(x, y, screenshot)
			this.logger.log('Comment dialog completed, message:', message)

			if (message) {
				const comment: Comment = {
					element: {
						selector: this.generateSelector(element),
						tagName: element.tagName.toLowerCase(),
						text: this.getElementText(element),
					},
					message,
					screenshot,
					position: { x, y },
					timestamp: Date.now(),
					relativeTime: this.getRelativeTime(),
					url: window.location.href,
				}

				this.comments.push(comment)

				// Call the callback if provided
				if (this.onCommentAdded) {
					this.onCommentAdded(comment)
				}

				this.logger.log('Comment captured successfully:', comment)
			} else {
				this.logger.log('Comment cancelled by user')
			}
		} catch (error) {
			this.logger.error('Failed to capture comment:', error)
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			const errorStack = error instanceof Error ? error.stack : undefined
			this.logger.error('Error details:', {
				message: errorMessage,
				stack: errorStack,
				element: element.tagName,
				position: { x, y },
			})
			alert(
				`Failed to capture comment: ${errorMessage}\n\nPlease try again or check the console for more details.`,
			)
		}
	}

	private async captureScreenshot(): Promise<string> {
		try {
			// First, try to use Chrome extension for perfect screenshot
			const extensionResult = await this.captureViaExtension()
			if (extensionResult) {
				this.logger.log(
					'[CommentSystem] Screenshot captured via Chrome extension',
				)
				return extensionResult
			}

			// Fall back to modern-screenshot library
			this.logger.log('[CommentSystem] Using modern-screenshot fallback')
			return await this.captureCurrentViewport()
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			this.logger.error('Screenshot capture failed:', errorMessage)
			return this.createFallbackScreenshot()
		}
	}

	private async captureViaExtension(): Promise<string | null> {
		try {
			// Check if extension is available
			const isAvailable = await extensionBridge.detect(
				300,
				this.logger.isDebugEnabled(),
			)
			if (!isAvailable) {
				this.logger.log('[CommentSystem] Chrome extension not available')
				return null
			}

			// Temporarily hide BugBasher UI elements before extension captures
			const bugbasherElements = document.querySelectorAll(
				'[id^="bugbasher-"], [class*="bugbasher-"]',
			)
			const originalStyles: Array<{
				element: HTMLElement
				display: string
				visibility: string
			}> = []

			bugbasherElements.forEach((element) => {
				const htmlElement = element as HTMLElement
				originalStyles.push({
					element: htmlElement,
					display: htmlElement.style.display || '',
					visibility: htmlElement.style.visibility || '',
				})
				htmlElement.style.display = 'none'
				htmlElement.style.visibility = 'hidden'
			})

			// Small delay to ensure elements are hidden
			await new Promise((resolve) => setTimeout(resolve, 50))

			try {
				const result = await extensionBridge.captureScreenshot()

				if (result.ok) {
					return result.payload
				} else {
					this.logger.warn(
						'[CommentSystem] Extension screenshot failed:',
						result.error.message,
					)
					return null
				}
			} finally {
				// Restore BugBasher UI elements
				originalStyles.forEach(({ element, display, visibility }) => {
					if (display !== undefined) {
						element.style.display = display
					}
					if (visibility !== undefined) {
						element.style.visibility = visibility
					}
				})
			}
		} catch (error) {
			this.logger.warn('[CommentSystem] Extension screenshot error:', error)
			return null
		}
	}

	private async captureCurrentViewport(): Promise<string> {
		// Temporarily hide BugBasher UI elements
		const bugbasherElements = document.querySelectorAll(
			'[id^="bugbasher-"], [class*="bugbasher-"]',
		)
		const originalStyles: Array<{
			element: HTMLElement
			display: string
			visibility: string
		}> = []

		bugbasherElements.forEach((element) => {
			const htmlElement = element as HTMLElement
			originalStyles.push({
				element: htmlElement,
				display: htmlElement.style.display || '',
				visibility: htmlElement.style.visibility || '',
			})
			htmlElement.style.display = 'none'
			htmlElement.style.visibility = 'hidden'
		})

		try {
			// Get current scroll position
			const scrollX = window.pageXOffset || document.documentElement.scrollLeft
			const scrollY = window.pageYOffset || document.documentElement.scrollTop

			// Store original scroll position
			const originalScrollX = scrollX
			const originalScrollY = scrollY

			// Temporarily scroll to top for clean capture
			window.scrollTo(0, 0)

			// Wait a moment for scroll to complete
			await new Promise((resolve) => setTimeout(resolve, 50))

			// Create a viewport-sized container
			const container = document.createElement('div')
			container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: ${window.innerWidth}px;
        height: ${window.innerHeight}px;
        overflow: hidden;
        z-index: -1;
        background: white;
        pointer-events: none;
      `

			// Clone the body and position it to show the original viewport
			const bodyClone = document.body.cloneNode(true) as HTMLElement

			// Remove BugBasher elements from clone
			const clonedBugbasherElements = bodyClone.querySelectorAll(
				'[id^="bugbasher-"], [class*="bugbasher-"]',
			)
			clonedBugbasherElements.forEach((el) => el.remove())

			// Position the clone to show what was originally visible
			bodyClone.style.cssText = `
        position: absolute;
        top: ${-originalScrollY}px;
        left: ${-originalScrollX}px;
        margin: 0;
        padding: 0;
        width: ${Math.max(document.body.scrollWidth, window.innerWidth)}px;
        height: ${Math.max(document.body.scrollHeight, window.innerHeight)}px;
        transform: none;
        overflow: visible;
      `

			container.appendChild(bodyClone)
			document.body.appendChild(container)

			// Small delay to ensure rendering
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Capture the container
			const dataUrl = await domToPng(container, {
				quality: 0.8,
				scale: 1,
				width: window.innerWidth,
				height: window.innerHeight,
				backgroundColor: '#ffffff',
			})

			// Clean up
			document.body.removeChild(container)

			// Restore original scroll position
			window.scrollTo(originalScrollX, originalScrollY)

			return dataUrl
		} finally {
			// Restore BugBasher UI elements
			originalStyles.forEach(({ element, display, visibility }) => {
				if (display !== undefined) {
					element.style.display = display
				}
				if (visibility !== undefined) {
					element.style.visibility = visibility
				}
			})
		}
	}

	private createFallbackScreenshot(): string {
		// Create a simple canvas with error message
		const canvas = document.createElement('canvas')
		canvas.width = window.innerWidth
		canvas.height = window.innerHeight
		const ctx = canvas.getContext('2d')

		if (ctx) {
			// Fill with light background
			ctx.fillStyle = '#f8f9fa'
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Add border
			ctx.strokeStyle = '#dee2e6'
			ctx.lineWidth = 2
			ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)

			// Add text
			ctx.fillStyle = '#6c757d'
			ctx.font =
				'16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
			ctx.textAlign = 'center'
			ctx.fillText(
				'Screenshot not available',
				canvas.width / 2,
				canvas.height / 2 - 10,
			)
			ctx.fillText(
				'Comment saved without screenshot',
				canvas.width / 2,
				canvas.height / 2 + 20,
			)

			// Add timestamp
			ctx.font =
				'12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
			ctx.fillStyle = '#adb5bd'
			const timestamp = new Date().toLocaleString()
			ctx.fillText(
				`Captured at: ${timestamp}`,
				canvas.width / 2,
				canvas.height / 2 + 50,
			)
		}

		return canvas.toDataURL('image/png')
	}

	private showCommentDialog(
		x: number,
		y: number,
		screenshot?: string,
	): Promise<string | null> {
		return new Promise((resolve) => {
			// Create dialog
			const dialog = document.createElement('div')
			dialog.id = 'bugbasher-comment-dialog'
			dialog.style.cssText = `
        position: fixed;
        left: ${Math.min(x, window.innerWidth - 320)}px;
        top: ${Math.min(y, window.innerHeight - 280)}px;
        width: 300px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `

			const screenshotHtml = screenshot
				? `
        <div style="margin-bottom: 12px;">
          <img 
            id="bugbasher-comment-screenshot"
            src="${screenshot}"
            alt="Screenshot"
            style="
              width: 100%;
              height: auto;
              max-height: 120px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #ddd;
              cursor: pointer;
            "
            title="Click to open in new tab"
          />
        </div>
      `
				: ''

			dialog.innerHTML = `
        <div style="margin-bottom: 12px; font-weight: 500; color: #333;">
          Add Comment
        </div>
        ${screenshotHtml}
        <textarea 
          id="bugbasher-comment-input"
          placeholder="Describe the issue..."
          style="
            width: 100%;
            height: 80px;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
            font-size: 14px;
            resize: vertical;
            box-sizing: border-box;
          "
        ></textarea>
        <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
          <button 
            id="bugbasher-comment-cancel"
            style="
              padding: 6px 12px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            "
          >
            Cancel
          </button>
          <button 
            id="bugbasher-comment-save"
            style="
              padding: 6px 12px;
              border: 1px solid #0d6efd;
              background: #0d6efd;
              color: white;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            "
          >
            Save
          </button>
        </div>
      `

			document.body.appendChild(dialog)

			const input = dialog.querySelector(
				'#bugbasher-comment-input',
			) as HTMLTextAreaElement
			const cancelBtn = dialog.querySelector(
				'#bugbasher-comment-cancel',
			) as HTMLButtonElement
			const saveBtn = dialog.querySelector(
				'#bugbasher-comment-save',
			) as HTMLButtonElement
			const screenshotImg = dialog.querySelector(
				'#bugbasher-comment-screenshot',
			) as HTMLImageElement | null

			if (screenshotImg && screenshot) {
				screenshotImg.addEventListener('click', () => {
					const newTab = window.open('', '_blank')
					if (newTab) {
						newTab.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Screenshot</title>
                  <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a1a; }
                    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                  </style>
                </head>
                <body>
                  <img src="${screenshot}" alt="Screenshot" />
                </body>
              </html>
            `)
						newTab.document.close()
					}
				})
			}

			// Focus input
			input.focus()

			const cleanup = () => {
				if (dialog.parentNode) {
					dialog.parentNode.removeChild(dialog)
				}
			}

			cancelBtn.addEventListener('click', () => {
				cleanup()
				resolve(null)
			})

			saveBtn.addEventListener('click', () => {
				const message = input.value.trim()
				cleanup()
				resolve(message || null)
			})

			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
					const message = input.value.trim()
					cleanup()
					resolve(message || null)
				} else if (e.key === 'Escape') {
					cleanup()
					resolve(null)
				}
			})
		})
	}

	private generateSelector(element: HTMLElement): string {
		// Generate a CSS selector for the element
		if (element.id) {
			return `#${element.id}`
		}

		const path: string[] = []
		let current: HTMLElement | null = element

		while (current && current !== document.body) {
			let selector = current.tagName.toLowerCase()

			if (current.className) {
				const classes = current.className.split(' ').filter((c) => c.trim())
				if (classes.length > 0) {
					selector += '.' + classes.join('.')
				}
			}

			// Add nth-child if needed for uniqueness
			const siblings = Array.from(current.parentElement?.children || [])
			const sameTagSiblings = siblings.filter(
				(s) => s.tagName === current!.tagName,
			)
			if (sameTagSiblings.length > 1) {
				const index = sameTagSiblings.indexOf(current) + 1
				selector += `:nth-child(${index})`
			}

			path.unshift(selector)
			current = current.parentElement
		}

		return path.join(' > ')
	}

	private getElementText(element: HTMLElement): string {
		const text = element.textContent || element.innerText || ''
		return text.trim().substring(0, 100) // Truncate to 100 characters
	}

	private getRelativeTime(): number {
		if (!this.recordingStartTime) return 0
		return Math.floor((Date.now() - this.recordingStartTime) / 1000)
	}

	getComments(): Comment[] {
		return [...this.comments]
	}

	clearComments(): void {
		this.comments = []
	}

	isInCommentMode(): boolean {
		return this.isActive
	}

	setRecordingStartTime(startTime: number | null): void {
		this.recordingStartTime = startTime || 0
	}

	destroy(): void {
		this.stopCommenting()
		this.clearComments()
	}
}
