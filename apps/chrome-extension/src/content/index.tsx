import React from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '../components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../components/ui/card'

// Import CSS as text using Vite's ?inline query
import cssText from './content.css?inline'

// React component to render inside the shadow DOM
function ContentApp({ onClose }: { onClose: () => void }) {
	const [clicked, setClicked] = React.useState(false)

	return (
		<Card className="m-4 w-80 shadow-lg">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">Epic SaaS Extension</CardTitle>
						<CardDescription>Injected with Shadow DOM</CardDescription>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="hover:bg-destructive hover:text-destructive-foreground h-6 w-6 p-0"
					>
						×
					</Button>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<p className="text-muted-foreground mb-4 text-sm">
					This component uses Tailwind CSS v4 with isolated styles in Shadow
					DOM.
				</p>
				<div className="space-y-2">
					<Button
						className="w-full"
						onClick={() => setClicked(!clicked)}
						variant={clicked ? 'secondary' : 'default'}
					>
						{clicked ? 'Clicked! 🎉' : 'Click me!'}
					</Button>
					{clicked && (
						<p className="text-center text-xs font-medium text-green-600">
							React state and Tailwind classes working perfectly!
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

// Create and inject the Web Component with Shadow DOM
class EpicSaasWidget extends HTMLElement {
	private shadowRoot: ShadowRoot
	private reactRoot: any

	constructor() {
		super()
		this.shadowRoot = this.attachShadow({ mode: 'open' })
	}

	connectedCallback() {
		// Create a container for React with CSS variables class
		const container = document.createElement('div')
		container.className = 'shadow-root-container'

		// Create style element with the processed CSS
		const style = document.createElement('style')
		style.textContent = cssText

		// Append styles and container to shadow root
		this.shadowRoot.appendChild(style)
		this.shadowRoot.appendChild(container)

		// Render React component
		this.reactRoot = createRoot(container)
		this.reactRoot.render(
			React.createElement(ContentApp, {
				onClose: () => {
					this.remove()
				},
			}),
		)
	}

	disconnectedCallback() {
		if (this.reactRoot) {
			this.reactRoot.unmount()
		}
	}
}

// Function to create shadow DOM manually without Web Components
function createShadowWidget() {
	try {
		if (document.querySelector('#epic-saas-widget')) {
			return
		}

		// Create a regular div that will host the shadow DOM
		const hostElement = document.createElement('div')
		hostElement.id = 'epic-saas-widget'
		hostElement.style.position = 'fixed'
		hostElement.style.top = '20px'
		hostElement.style.right = '20px'
		hostElement.style.zIndex = '10000'
		hostElement.style.pointerEvents = 'auto'
		hostElement.style.opacity = '0'
		hostElement.style.transform = 'translateY(-10px)'
		hostElement.style.transition = 'all 0.3s ease-out'

		// Create shadow root manually
		const shadowRoot = hostElement.attachShadow({ mode: 'open' })

		// Create container for React
		const container = document.createElement('div')
		container.className = 'shadow-root-container'

		// Create style element with the processed CSS
		const style = document.createElement('style')
		style.textContent = cssText

		// Append styles and container to shadow root
		shadowRoot.appendChild(style)
		shadowRoot.appendChild(container)

		// Render React component
		const reactRoot = createRoot(container)
		reactRoot.render(
			React.createElement(ContentApp, {
				onClose: () => {
					reactRoot.unmount()
					hostElement.remove()
				},
			}),
		)

		// Append to body
		document.body.appendChild(hostElement)

		// Animate in
		setTimeout(() => {
			hostElement.style.opacity = '1'
			hostElement.style.transform = 'translateY(0)'
		}, 100)
	} catch (error) {
		console.error('Failed to create shadow DOM manually:', error)
	}
}

// Function to initialize the widget with Web Components fallback
function initializeWidget() {
	try {
		// Check if customElements is available
		if (!customElements) {
			createShadowWidget()
			return
		}

		// Check if the element is already defined
		if (customElements.get('epic-saas-widget')) {
			if (document.querySelector('epic-saas-widget')) {
				return
			}

			// Create the widget directly
			const widget = document.createElement('epic-saas-widget')
			widget.style.position = 'fixed'
			widget.style.top = '20px'
			widget.style.right = '20px'
			widget.style.zIndex = '10000'
			widget.style.pointerEvents = 'auto'
			widget.style.opacity = '0'
			widget.style.transform = 'translateY(-10px)'
			widget.style.transition = 'all 0.3s ease-out'

			document.body.appendChild(widget)

			setTimeout(() => {
				widget.style.opacity = '1'
				widget.style.transform = 'translateY(0)'
			}, 100)
		} else {
			// Register the custom element
			customElements.define('epic-saas-widget', EpicSaasWidget)

			// Check if widget already exists
			if (document.querySelector('epic-saas-widget')) {
				return
			}

			// Create and inject the widget
			const widget = document.createElement('epic-saas-widget')
			widget.style.position = 'fixed'
			widget.style.top = '20px'
			widget.style.right = '20px'
			widget.style.zIndex = '10000'
			widget.style.pointerEvents = 'auto'
			widget.style.opacity = '0'
			widget.style.transform = 'translateY(-10px)'
			widget.style.transition = 'all 0.3s ease-out'

			document.body.appendChild(widget)

			setTimeout(() => {
				widget.style.opacity = '1'
				widget.style.transform = 'translateY(0)'
			}, 100)
		}
	} catch (error) {
		console.error('Failed to initialize widget:', error)
		createShadowWidget()
	}
}

// Wait for DOM to be ready and then initialize
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeWidget)
} else {
	// DOM is already ready
	initializeWidget()
}
