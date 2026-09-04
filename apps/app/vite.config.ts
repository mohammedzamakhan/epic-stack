import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import { lingui } from '@lingui/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import { getLocalDomain } from '@repo/config/brand'
import {
	type SentryReactRouterBuildOptions,
	sentryReactRouter,
} from '@sentry/react-router'
import tailwindcss from '@tailwindcss/vite'
import { varlockVitePlugin } from '@varlock/vite-integration'
import { defineConfig, type Plugin } from 'vite'
import { envOnlyMacros } from 'vite-env-only'
import macrosPlugin from 'vite-plugin-babel-macros'

const appDir = fileURLToPath(new URL('.', import.meta.url))
const domain = `app.${getLocalDomain()}`

const MODE = process.env.NODE_ENV
const isCloudflare = process.env.DEPLOY_TARGET === 'cloudflare'

function cloudflareWorkerAliasPlugin(): Plugin | null {
	if (!isCloudflare) return null
	const workerFile = (name: string) => `${appDir}/workers/${name}`
	const ssrOnly: Record<string, string> = {
		'isomorphic-dompurify': workerFile('dompurify-stub.ts'),
		'@sentry/react-router': workerFile('sentry-stub.ts'),
	}
	const always: Record<string, string> = {
		'@sentry/profiling-node': workerFile('litefs-stub.ts'),
		'node:sqlite': workerFile('node-sqlite-stub.ts'),
	}
	const remixCrypto = workerFile('remix-crypto-stub.ts')
	return {
		name: 'cloudflare-worker-aliases',
		enforce: 'pre',
		resolveId(id, _importer, options) {
			if (always[id]) return always[id]
			if (/remix-utils\/build\/common\/crypto/.test(id)) return remixCrypto
			if (
				options?.ssr &&
				(id.includes('notes-chart.tsx') || id.endsWith('notes-chart'))
			) {
				return workerFile('notes-chart-ssr-stub.tsx')
			}
			if (options?.ssr && ssrOnly[id]) return ssrOnly[id]
			return null
		},
	}
}

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
					export const invalidateUserOrganizationsCache = () => Promise.resolve();
					export const invalidateUserCache = () => Promise.resolve();
					export const invalidateUserSecurityCache = () => Promise.resolve();
					export const deleteCacheKeys = () => Promise.resolve();
					export const clearCacheByType = () => Promise.resolve();
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
			filesToDeleteAfterUpload: ['./build/**/*.map'],
		},
	},
}

export default defineConfig((config) => ({
	base: MODE === 'test' ? 'http://localhost:3001' : undefined,
	build: {
		target: 'es2022',
		cssMinify: MODE === 'production',

		rollupOptions: isCloudflare
			? {}
			: {
					input: config.isSsrBuild ? './server/app.ts' : undefined,
					external: [
						/node:.*/,
						'fsevents',
						'@sentry/profiling-node',
						'@sentry-internal/node-cpu-profiler',
					],
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
								if (
									id.includes('react-router') ||
									id.includes('@react-router')
								) {
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

		assetsInlineLimit: isCloudflare
			? 4096
			: (source: string) => {
					if (typeof source === 'string' && source.includes('/app/assets')) {
						return false
					}
				},

		// The Cloudflare bundle includes the entire SSR dependency graph. Generating
		// source maps for it pushes the CI build beyond the hosted runner's heap,
		// while Sentry uploads are disabled for this target below.
		sourcemap: !isCloudflare,
	},
	optimizeDeps: {
		include: ['@repo/email', '@repo/integrations'],
		exclude: [
			'@sentry/profiling-node',
			'@sentry-internal/node-cpu-profiler',
			'@repo/ai',
			'@repo/ui',
			'@repo/marketing',
			'@repo/marketing-workflow',
		],
	},
	...(MODE !== 'test' && {
		// Vite 6 merges legacy `ssr.noExternal` arrays with the Cloudflare
		// plugin's `resolve.noExternal: true` into `['pkg', true]`, which breaks
		// shouldExternalize (`filename.replace is not a function`). Use `true` for CF.
		ssr: {
			noExternal: isCloudflare
				? true
				: [
						'@repo/ai',
						'@repo/email',
						'@repo/marketing',
						'@repo/marketing-workflow',
					],
		},
	}),
	server: {
		allowedHosts: [domain, 'localhost'],
		watch: {
			ignored: ['**/playwright-report/**', '**/node_modules/.vite-temp/**'],
		},
		fs: {
			allow: ['..'],
		},
		hmr: {
			host: 'localhost',
			port: 24679,
			protocol: 'ws',
		},
	},
	sentryConfig,
	plugins: [
		...(isCloudflare ? [cloudflare({ viteEnvironment: { name: 'ssr' } })] : []),
		cloudflareWorkerAliasPlugin(),
		varlockVitePlugin(),
		MODE === 'test' ? stubCacheServerPlugin() : null,
		envOnlyMacros(),
		tailwindcss(),
		// reactRouterDevTools(),
		// it would be really nice to have this enabled in tests, but we'll have to
		// wait until https://github.com/remix-run/remix/issues/9871 is fixed
		MODE === 'test' ? null : reactRouter(),
		macrosPlugin(),
		lingui(),
		MODE === 'production' && process.env.SENTRY_AUTH_TOKEN && !isCloudflare
			? sentryReactRouter(sentryConfig, config)
			: null,
	].filter(Boolean) as Plugin[],
	test: {
		include: ['./app/**/*.test.{ts,tsx}'],
		setupFiles: ['./tests/setup/setup-test-env.ts'],
		globalSetup: ['./tests/setup/global-setup.ts'],
		environment: 'node',
		env: {
			BASE_URL: 'http://localhost:3001',
		},
		envFile: '../../.env',
		restoreMocks: true,
		// Forked workers get isolated process.env + SQLite files (threads shared one DB).
		pool: 'forks',
		maxWorkers: process.env.CI ? 2 : undefined,
		coverage: {
			include: ['app/**/*.{ts,tsx}'],
			exclude: [
				'app/components/ui/**',
				'app/assets/**',
				'app/locales/**',
				'**/*.d.ts',
				'**/+types/**',
			],
			all: true,
		},
	},
}))
