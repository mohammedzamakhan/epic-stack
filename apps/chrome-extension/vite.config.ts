import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const BROWSER = process.env.BROWSER || 'chrome'

const baseManifest: ManifestV3Export = {
	manifest_version: 3,
	name: 'Epic SaaS Extension',
	version: '1.0',
	description: 'Injects a script into a domain after user permission.',
	permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
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
}

const chromeManifest: Partial<ManifestV3Export> = {
	...baseManifest,
	name: 'Epic SaaS Chrome Extension',
	background: {
		service_worker: 'src/background/index.ts',
		type: 'module',
	},
}

const firefoxManifest: Partial<ManifestV3Export> = {
	...baseManifest,
	name: 'Epic SaaS Firefox Extension',
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
