import cloudflare from '@astrojs/cloudflare'
import { brand } from '@repo/config/brand'
import tailwindcss from '@tailwindcss/vite'
import varlockAstroIntegration from '@varlock/astro-integration'
import { defineConfig } from 'astro/config'
import { fontless } from 'fontless'

const domain = brand.name.toLowerCase().replace(/\s+/g, '-') + '.me'

export default defineConfig({
	output: 'server',
	site: `https://${domain}`,
	integrations: [
		varlockAstroIntegration(),
		{
			name: 'fix-varlock-entry-detection',
			hooks: {
				'astro:config:done': ({ config }) => {
					const varlockPlugin = config.vite.plugins
						.flat()
						.find((p) => p && p.name === 'inject-varlock-config')
					if (varlockPlugin && varlockPlugin.transform) {
						const originalTransform = varlockPlugin.transform
						varlockPlugin.transform = function (code, id, options) {
							if (id.includes('node_modules/varlock/')) {
								const originalGetModuleIds = this.getModuleIds
								this.getModuleIds = function () {
									const ids = Array.from(originalGetModuleIds.call(this))
									if (ids[0] === id) ids.unshift('FAKE_ID')
									return ids.values()
								}
								const result = originalTransform.call(this, code, id, options)
								this.getModuleIds = originalGetModuleIds
								return result
							}
							return originalTransform.call(this, code, id, options)
						}
					}
				},
			},
		},
	],

	vite: {
		plugins: [
			{
				name: 'fix-varlock-name',
				enforce: 'pre',
				transform(code, id) {
					if (id.includes('varlock/dist/')) {
						const polyfill = `if (!globalThis.__name) { globalThis.__name = (target, value) => Object.defineProperty(target, "name", { value, configurable: true }); }\n`
						return (
							polyfill + code.replace(/\b__name\(/g, 'globalThis.__name(')
						)
					}
				},
			},
			tailwindcss(),
			fontless({
				families: [
					{
						name: 'GeistPixel',
						weights: ['400'],
						src: [{ url: '/fonts/GeistPixel-Square.woff2', format: 'woff2' }],
					},
				],
			}),
		],
		server: {
			// Allow org subdomains (acme.epic-startup.me) via the local proxy
			allowedHosts: [`.${domain}`, domain, 'localhost'],
		},
		optimizeDeps: {
			exclude: ['@sentry/profiling-node', '@sentry-internal/node-cpu-profiler'],
		},
		resolve: {
			alias: {
				zlib: 'node:zlib',
				http: 'node:http',
				https: 'node:https',
				crypto: 'node:crypto',
				util: 'node:util',
				stream: 'node:stream',
				buffer: 'node:buffer',
				events: 'node:events',
				path: 'node:path',
				url: 'node:url',
				fs: 'node:fs',
				os: 'node:os',
			},
		},
		ssr: {
			external: [
				'node:zlib',
				'node:http',
				'node:https',
				'node:path',
				'node:url',
				'node:fs',
				'node:http2',
				'node:buffer',
				'node:crypto',
				'node:os',
				'node:child_process',
				'node:tty',
				'node:worker_threads',
				'node:net',
				'node:stream',
				'node:util',
				'node:events',
				'node:querystring',
				'node:assert',
			],
		},
		define: {
			'process.env.NODE_ENV': JSON.stringify(
				process.env.NODE_ENV || 'production',
			),
		},
	},

	adapter:
		process.env.npm_lifecycle_event === 'build'
			? cloudflare({
					imageService: 'passthrough',
				})
			: undefined,
})
