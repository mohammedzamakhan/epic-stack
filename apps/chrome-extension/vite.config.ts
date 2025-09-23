import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const BROWSER = process.env.BROWSER || 'chrome'

const baseManifest: ManifestV3Export = {
	manifest_version: 3,
	name: 'Epic Startup Extension',
	version: '1.0',
	description: 'Chrome extension for Epic Startup',
	permissions: ['storage', 'activeTab', 'scripting', 'tabs', 'cookies'],
	host_permissions: ['<all_urls>'],
	action: {
		default_popup: 'index.html',
	},
	web_accessible_resources: [
		{
			resources: ['assets/*.js'],
			matches: ['<all_urls>'],
		},
	],
	externally_connectable: {
		matches: ['*://*.epic-stack.me/*'],
	},
}

const chromeManifest: Partial<ManifestV3Export> = {
	...baseManifest,
	name: 'Epic Startup Chrome Extension',
	background: {
		service_worker: 'src/background/index.ts',
		type: 'module',
	},
}

const firefoxManifest: Partial<ManifestV3Export> = {
	...baseManifest,
	name: 'Epic Startup Firefox Extension',
	background: {
		scripts: ['src/background/index.ts'],
		type: 'module',
	},
	applications: {
		gecko: {
			id: 'epic-saas-extension@example.com',
		},
	},
}

const manifest = BROWSER === 'firefox' ? firefoxManifest : chromeManifest

// https://vitejs.dev/config/
export default defineConfig(() => {
	return {
		base: './',
		build: {
			emptyOutDir: true,
			outDir: `build/${BROWSER}`,
			rollupOptions: {
				output: {
					chunkFileNames: 'assets/chunk-[hash].js',
				},
			},
		},
		server: {
			port: 5173,
			strictPort: true,
			hmr: {
				port: 5173,
			},
		},
		plugins: [
			react(),
			tailwindcss(),
			crx({
				manifest: manifest as ManifestV3Export,
				contentScripts: {
					injectCss: true,
				},
			}),
		],
	}
})
