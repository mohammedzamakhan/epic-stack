// Chunk loader utility for dynamic imports
// This handles loading chunks from the same base URL as the main script

let baseUrl: string | null = null

// Detect the base URL from the current script tag
function getBaseUrl(): string {
	if (baseUrl) return baseUrl

	// Try to get from current script
	const currentScript = document.currentScript as HTMLScriptElement
	if (currentScript?.src) {
		baseUrl = currentScript.src.substring(
			0,
			currentScript.src.lastIndexOf('/') + 1,
		)
		return baseUrl
	}

	// Fallback: look for BugBasher script tag
	const scripts = document.querySelectorAll(
		'script[src*="bugbasher"], script[src*="script"]',
	)
	const bugBasherScript = scripts[scripts.length - 1] as HTMLScriptElement
	if (bugBasherScript?.src) {
		baseUrl = bugBasherScript.src.substring(
			0,
			bugBasherScript.src.lastIndexOf('/') + 1,
		)
		return baseUrl
	}

	// Last resort: use current origin with /dist/ path
	baseUrl = window.location.origin + '/dist/'
	return baseUrl
}

// Cache for loaded modules
const moduleCache = new Map<string, Promise<any>>()

// For now, since we don't have actual chunks, we'll load from the main bundle
// This is a fallback until we get proper code splitting working
export async function loadChunk<T = any>(chunkName: string): Promise<T> {
	// Map chunk names to actual module paths
	const chunkMap: Record<string, string> = {
		bugbasher: './bugbasher.js',
		toolbar: './toolbar.js',
		openreplay: './openreplay.js',
		'comment-system': './comment-system.js',
		communication: './communication.js',
	}

	const modulePath = chunkMap[chunkName]
	if (!modulePath) {
		throw new Error(`Unknown chunk: ${chunkName}`)
	}

	if (moduleCache.has(chunkName)) {
		return moduleCache.get(chunkName)!
	}

	// For now, we'll import from relative paths since chunks aren't being created
	const loadPromise = import(/* @vite-ignore */ modulePath)
	moduleCache.set(chunkName, loadPromise)

	return loadPromise
}

// Preload a chunk without executing it
export function preloadChunk(chunkName: string): void {
	// Skip preloading for now since we don't have separate chunks
	return
}

// Check if a chunk is already loaded
export function isChunkLoaded(chunkName: string): boolean {
	return moduleCache.has(chunkName)
}
