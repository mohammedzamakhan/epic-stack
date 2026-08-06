// IIFE wrapper that dynamically loads the ES module version
// This provides a small initial footprint while enabling code splitting

import type { BugBasherConfig, BugBasherAPI } from './types.js'

// Detect script source URL for loading chunks
function getScriptBaseUrl(): string {
	const currentScript = document.currentScript as HTMLScriptElement
	if (currentScript?.src) {
		return currentScript.src.substring(
			0,
			currentScript.src.lastIndexOf('/') + 1,
		)
	}

	// Fallback: look for BugBasher script tag
	const scripts = document.querySelectorAll(
		'script[src*="bugbasher"], script[src*="script"]',
	)
	const bugBasherScript = scripts[scripts.length - 1] as HTMLScriptElement
	if (bugBasherScript?.src) {
		return bugBasherScript.src.substring(
			0,
			bugBasherScript.src.lastIndexOf('/') + 1,
		)
	}

	return window.location.origin + '/'
}

// Lazy loader for the main ES module
let modulePromise: Promise<any> | null = null

async function loadMainModule(): Promise<any> {
	if (modulePromise) return modulePromise

	const baseUrl = getScriptBaseUrl()
	const moduleUrl = `${baseUrl}script.js`

	modulePromise = import(/* @vite-ignore */ moduleUrl)
	return modulePromise
}

// Create a proxy API that loads the real implementation on demand
const createLazyAPI = (): BugBasherAPI => ({
	async showToolbar(projectId: string): Promise<void> {
		const module = await loadMainModule()
		return module.showToolbar?.(projectId)
	},

	async hideToolbar(): Promise<void> {
		const module = await loadMainModule()
		return module.hideToolbar?.()
	},

	async startRecording(): Promise<void> {
		const module = await loadMainModule()
		return module.startRecording?.()
	},

	async stopRecording(): Promise<any> {
		const module = await loadMainModule()
		return module.stopRecording?.()
	},

	getIsRecording(): boolean {
		// This needs to be synchronous, so we return false if not loaded
		if (!modulePromise) return false
		// If module is loaded, try to get the real value
		return (window as any).__bugBasherInstance?.getIsRecording?.() ?? false
	},

	async setUser(userId: string, metadata?: Record<string, any>): Promise<void> {
		const module = await loadMainModule()
		return module.setUser?.(userId, metadata)
	},

	async trackEvent(name: string, payload: Record<string, any>): Promise<void> {
		const module = await loadMainModule()
		return module.trackEvent?.(name, payload)
	},

	async reportIssue(
		title: string,
		payload: Record<string, any>,
	): Promise<void> {
		const module = await loadMainModule()
		return module.reportIssue?.(title, payload)
	},

	getSessionToken(): string | null {
		// Synchronous method - return null if not loaded
		return (window as any).__bugBasherInstance?.getSessionToken?.() ?? null
	},

	getSessionURL(): string | null {
		// Synchronous method - return null if not loaded
		return (window as any).__bugBasherInstance?.getSessionURL?.() ?? null
	},
})

// Configuration helpers
function getBugBasherConfig(): BugBasherConfig {
	// Try to get config from global variable first
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

	return {
		projectId: '',
		apiOrigin: window.location.origin,
		debug: false,
	}
}

function shouldAutoShowToolbar(): boolean {
	const scriptTag = document.currentScript as HTMLScriptElement
	if (scriptTag && scriptTag.getAttribute('data-auto-show') === 'false') {
		return false
	}

	if (typeof window !== 'undefined') {
		const config =
			(window as any).BugBasherConfig || (window as any).BUGBASHER_CONFIG
		if (config && config.autoShow === false) {
			return false
		}
	}

	return true
}

// Auto-initialize if configured
async function autoInitialize(): Promise<void> {
	if (shouldAutoShowToolbar()) {
		try {
			const config = getBugBasherConfig()
			if (config.projectId) {
				await window.BugBasher.showToolbar(config.projectId)
			}
		} catch (error) {
			// Keep console.error for IIFE wrapper since logger might not be available
			console.error('BugBasher: Auto-initialization failed:', error)
		}
	}
}

// Expose API immediately
if (typeof window !== 'undefined') {
	window.BugBasher = createLazyAPI()

	// Manual initialization function
	;(window as any).initBugBasher = async (config?: BugBasherConfig) => {
		if (config) {
			;(window as any).BugBasherConfig = config
		}
		if (config?.projectId) {
			await window.BugBasher.showToolbar(config.projectId)
		}
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', autoInitialize)
} else {
	autoInitialize()
}
