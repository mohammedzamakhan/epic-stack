/**
 * Extension configuration
 */

export interface ExtensionConfig {
	bugbasherScriptUrl: string
	apiOrigin: string
	debug: boolean
}

const CONFIG_KEY = 'bugbasher_config'

const DEFAULT_CONFIG: ExtensionConfig = {
	bugbasherScriptUrl: 'https://cdn.bugbasher.me/script.js',
	apiOrigin: 'https://app.bugbasher.me',
	debug: false,
}

const DEV_CONFIG: ExtensionConfig = {
	bugbasherScriptUrl: 'http://localhost:8080/dist/script.js',
	apiOrigin: 'https://app.bugbasher.me:2999',
	debug: false,
}

// Note: The script.js is an ES module that imports from sibling files:
// - bugbasher.js
// - comment-system.js
// - toolbar.js
// - openreplay.js
// - communication.js
// All must be served from the same directory.
//
// For local dev: cd packages/bugbasher-script && npm run build && npx http-server -p 8080 --cors

export async function getConfig(): Promise<ExtensionConfig> {
	try {
		const result = await chrome.storage.local.get([CONFIG_KEY])
		if (result[CONFIG_KEY]) {
			return { ...DEFAULT_CONFIG, ...result[CONFIG_KEY] }
		}

		const isDev =
			!('update_url' in chrome.runtime.getManifest()) ||
			process.env.NODE_ENV === 'development'

		return isDev ? DEV_CONFIG : DEFAULT_CONFIG
	} catch {
		return DEFAULT_CONFIG
	}
}

export async function setConfig(
	config: Partial<ExtensionConfig>,
): Promise<void> {
	const current = await getConfig()
	await chrome.storage.local.set({
		[CONFIG_KEY]: { ...current, ...config },
	})
}

export async function resetConfig(): Promise<void> {
	await chrome.storage.local.remove([CONFIG_KEY])
}
