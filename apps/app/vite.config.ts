import { lingui } from '@lingui/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import {
	type SentryReactRouterBuildOptions,
	sentryReactRouter,
} from '@sentry/react-router'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { envOnlyMacros } from 'vite-env-only'
import macrosPlugin from 'vite-plugin-babel-macros'

const MODE = process.env.NODE_ENV

// Plugin to stub out cache.server.ts in test mode to avoid node:sqlite in jsdom
function stubCacheServerPlugin(): Plugin {
	return {
		name: 'stub-cache-server',
		enforce: 'pre',
		resolveId(id) {
			if (MODE === 'test' && id.includes('cache.server')) {
				return '\0virtual:cache-server-stub'
			}
		},
		load(id) {
			if (id === '\0virtual:cache-server-stub') {
				return `
					export const cachified = () => Promise.resolve();
					export const cache = { 
						delete: () => {}, 
						clear: () => {},
						clearAll: () => {},
						set: () => {},
						get: () => {}
					};
					export const ssoCache = {
						delete: () => {},
						clear: () => {},
						clearAll: () => {},
						set: () => {},
						get: () => {},
						getEndpoints: () => null,
						setEndpoints: () => {}
					};
					export default {};
				`
			}
		},
	}
}

const sentryConfig: SentryReactRouterBuildOptions = {
	authToken: process.env.SENTRY_AUTH_TOKEN,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,

	unstable_sentryVitePluginOptions: {
		release: {
			name: process.env.COMMIT_SHA,
			setCommits: {
				auto: true,
			},
		},
		sourcemaps: {
			filesToDeleteAfterUpload: ['./build/**/*.map', '.server-build/**/*.map'],
		},
	},
}

export default defineConfig((config) => ({
	build: {
		target: 'es2022',
		cssMinify: MODE === 'production',

		rollupOptions: {
			external: [/node:.*/, 'fsevents'],
			output: {
				// Optimize chunk splitting for better caching and parallel loading
				manualChunks: (id) => {
					// Split vendor chunks for better caching
					if (id.includes('node_modules')) {
						// Large UI libraries in separate chunks
						if (id.includes('@radix-ui')) {
							return 'vendor-radix'
						}
						if (id.includes('@tiptap')) {
							return 'vendor-tiptap'
						}
						if (id.includes('recharts') || id.includes('d3-')) {
							return 'vendor-charts'
						}
						if (id.includes('@novu')) {
							return 'vendor-novu'
						}
						if (id.includes('react-router') || id.includes('@react-router')) {
							return 'vendor-router'
						}
						// Core React in its own chunk
						if (id.includes('react') || id.includes('react-dom')) {
							return 'vendor-react'
						}
						// Other vendor code
						return 'vendor'
					}
				},
			},
		},

		assetsInlineLimit: (source: string) => {
			if (source.includes('/app/assets')) {
				return false
			}
		},

		sourcemap: true,
	},
	optimizeDeps: {
		include: ['@repo/email', '@repo/integrations'],
	},
	...(MODE !== 'test' && {
		ssr: {
			noExternal: ['@repo/email'],
		},
	}),
	server: {
		allowedHosts: ['app.epic-stack.me', 'localhost'],
		watch: {
			ignored: ['**/playwright-report/**', '**/node_modules/.vite-temp/**'],
		},
		fs: {
			allow: ['..'],
		},
	},
	sentryConfig,
	plugins: [
		MODE === 'test' ? stubCacheServerPlugin() : null,
		envOnlyMacros(),
		tailwindcss(),
		// reactRouterDevTools(),
		// it would be really nice to have this enabled in tests, but we'll have to
		// wait until https://github.com/remix-run/remix/issues/9871 is fixed
		MODE === 'test' ? null : reactRouter(),
		macrosPlugin(),
		lingui(),
		MODE === 'production' && process.env.SENTRY_AUTH_TOKEN
			? sentryReactRouter(sentryConfig, config)
			: null,
	],
	test: {
		include: ['./app/**/*.test.{ts,tsx}'],
		setupFiles: ['./tests/setup/setup-test-env.ts'],
		globalSetup: ['./tests/setup/global-setup.ts'],
		environment: 'node',
		envFile: '../../.env',
		restoreMocks: true,
		pool: 'threads',
		coverage: {
			include: ['app/**/*.{ts,tsx}'],
			all: true,
		},
	},
}))
