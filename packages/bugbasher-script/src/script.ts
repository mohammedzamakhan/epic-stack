import type { BugBasherConfig, BugBasherAPI } from './types.js'
import { Logger } from './logger.js'

// Global BugBasher instance - lazy loaded
let bugBasherInstance: BugBasherAPI | null = null
let isInitializing = false
let logger: Logger

// Lazy loader for BugBasher class
async function loadBugBasher(): Promise<typeof import('./bugbasher.js')> {
	const { BugBasher } = await import('./bugbasher.js')
	return { BugBasher }
}

// Initialize BugBasher from script tag attributes or global config
async function initializeBugBasher(): Promise<BugBasherAPI> {
	if (bugBasherInstance) {
		return bugBasherInstance
	}

	if (isInitializing) {
		// Wait for initialization to complete
		while (isInitializing) {
			await new Promise((resolve) => setTimeout(resolve, 10))
		}
		return bugBasherInstance!
	}

	isInitializing = true

	try {
		// Get configuration from script tag or global variable
		const config = getBugBasherConfig()

		// Initialize logger with debug setting
		logger = new Logger(config.debug, 'BugBasher')

		if (!config.projectId) {
			logger.error(
				'Project ID is required. Please set data-project-id attribute or window.BugBasherConfig.projectId',
			)
			throw new Error('Project ID is required')
		}

		// Lazy load BugBasher class
		const { BugBasher } = await loadBugBasher()

		// Create BugBasher instance
		bugBasherInstance = new BugBasher(config)

		logger.log('Initialized successfully')

		return bugBasherInstance
	} catch (error) {
		// Keep console.error for initialization failures since logger might not be available yet
		console.error('BugBasher: Failed to initialize:', error)
		throw error
	} finally {
		isInitializing = false
	}
}

function getBugBasherConfig(): BugBasherConfig {
	// Try to get config from global variable first (check both naming conventions)
	if (typeof window !== 'undefined') {
		const config =
			(window as any).BugBasherConfig || (window as any).BUGBASHER_CONFIG
		if (config) {
			return config
		}
	}

	// Fallback to script tag attributes
	const scriptTag = document.currentScript as HTMLScriptElement
	if (scriptTag) {
		return {
			projectId: scriptTag.getAttribute('data-project-id') || '',
			apiOrigin:
				scriptTag.getAttribute('data-api-origin') || window.location.origin,
			debug: scriptTag.getAttribute('data-debug') === 'true',
		}
	}

	// Last resort: look for any script tag with BugBasher attributes
	const scripts = document.querySelectorAll('script[data-project-id]')
	const bugBasherScript = scripts[scripts.length - 1] as HTMLScriptElement

	if (bugBasherScript) {
		return {
			projectId: bugBasherScript.getAttribute('data-project-id') || '',
			apiOrigin:
				bugBasherScript.getAttribute('data-api-origin') ||
				window.location.origin,
			debug: bugBasherScript.getAttribute('data-debug') === 'true',
		}
	}

	// Return empty config if nothing found
	return {
		projectId: '',
		apiOrigin: window.location.origin,
		debug: false,
	}
}

function shouldAutoShowToolbar(): boolean {
	// Check script tag attribute
	const scriptTag = document.currentScript as HTMLScriptElement
	if (scriptTag && scriptTag.getAttribute('data-auto-show') === 'false') {
		return false
	}

	// Check global config (both naming conventions)
	if (typeof window !== 'undefined') {
		const config =
			(window as any).BugBasherConfig || (window as any).BUGBASHER_CONFIG
		if (config && config.autoShow === false) {
			return false
		}
	}

	// Default to true
	return true
}

// Export functions for external use (e.g., IIFE wrapper)
export async function showToolbar(projectId: string): Promise<void> {
	const instance = await initializeBugBasher()
	return instance.showToolbar(projectId)
}

export async function hideToolbar(): Promise<void> {
	if (bugBasherInstance) {
		return bugBasherInstance.hideToolbar()
	}
}

export async function startRecording(): Promise<void> {
	const instance = await initializeBugBasher()
	return instance.startRecording()
}

export async function stopRecording(): Promise<any> {
	if (bugBasherInstance) {
		return bugBasherInstance.stopRecording()
	}
	throw new Error('BugBasher not initialized')
}

export function getIsRecording(): boolean {
	return bugBasherInstance?.getIsRecording() ?? false
}

export async function setUser(
	userId: string,
	metadata?: Record<string, any>,
): Promise<void> {
	const instance = await initializeBugBasher()
	return instance.setUser(userId, metadata)
}

export async function trackEvent(
	name: string,
	payload: Record<string, any>,
): Promise<void> {
	const instance = await initializeBugBasher()
	return instance.trackEvent(name, payload)
}

export async function reportIssue(
	title: string,
	payload: Record<string, any>,
): Promise<void> {
	const instance = await initializeBugBasher()
	return instance.reportIssue(title, payload)
}

export function getSessionToken(): string | null {
	return bugBasherInstance?.getSessionToken() ?? null
}

export function getSessionURL(): string | null {
	return bugBasherInstance?.getSessionURL() ?? null
}

// Lazy-loaded global API that only initializes when methods are called
const createLazyAPI = (): BugBasherAPI => ({
	async showToolbar(projectId: string): Promise<void> {
		return showToolbar(projectId)
	},

	async hideToolbar(): Promise<void> {
		return hideToolbar()
	},

	async startRecording(): Promise<void> {
		return startRecording()
	},

	async stopRecording(): Promise<any> {
		return stopRecording()
	},

	getIsRecording(): boolean {
		return getIsRecording()
	},

	async setUser(userId: string, metadata?: Record<string, any>): Promise<void> {
		return setUser(userId, metadata)
	},

	async trackEvent(name: string, payload: Record<string, any>): Promise<void> {
		return trackEvent(name, payload)
	},

	async reportIssue(
		title: string,
		payload: Record<string, any>,
	): Promise<void> {
		return reportIssue(title, payload)
	},

	getSessionToken(): string | null {
		return getSessionToken()
	},

	getSessionURL(): string | null {
		return getSessionURL()
	},
})

// Auto-initialize only if toolbar should be shown
async function autoInitialize(): Promise<void> {
	if (shouldAutoShowToolbar()) {
		try {
			const config = getBugBasherConfig()
			if (config.projectId) {
				await showToolbar(config.projectId)
			}
		} catch (error) {
			// Keep console.error for auto-initialization failures since logger might not be available
			console.error('BugBasher: Auto-initialization failed:', error)
		}
	}
}

// Initialize when DOM is ready - but only auto-show if configured
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', autoInitialize)
} else {
	// DOM is already ready
	autoInitialize()
}

// Handle dynamic initialization
if (typeof window !== 'undefined') {
	// Store instance reference for synchronous methods
	;(window as any).__bugBasherInstance = bugBasherInstance

	// Expose global API for direct ES module usage
	window.BugBasher = createLazyAPI()

	;(window as any).initBugBasher = async (config?: BugBasherConfig) => {
		if (config) {
			;(window as any).BugBasherConfig = config
		}
		if (config?.projectId) {
			await showToolbar(config.projectId)
		}
	}
}
