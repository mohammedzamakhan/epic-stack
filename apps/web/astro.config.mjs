import cloudflare from '@astrojs/cloudflare'
import partytown from '@astrojs/partytown'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
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
		react(),
		sitemap({
			filter: (page) =>
				!page.includes('/preview/') &&
				!page.includes('/api/'),
			changefreq: 'weekly',
			priority: 0.7,
			lastmod: new Date(),
		}),
		partytown({
			config: {
				forward: ['dataLayer.push', 'gtag'],
			},
		}),
	],

	vite: {
		plugins: [tailwindcss(), fontless()],
		server: {
			allowedHosts: [domain, 'localhost'],
		},
		optimizeDeps: {
			exclude: ['@sentry/profiling-node', '@sentry-internal/node-cpu-profiler'],
		},
		ssr: {
			external: [
				'zlib', 'http', 'https', 'node:path', 'node:url', 'node:fs', 
				'node:http2', 'node:buffer', 'node:crypto', 'fs', 'os', 'path', 
				'child_process', 'crypto', 'tty', 'worker_threads', 'net', 'stream',
				'util', 'events', 'buffer', 'url', 'querystring', 'assert'
			],
			noExternal: ['@payloadcms/live-preview']
		},
		define: {
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
		}
	},

	adapter: cloudflare({
		imageService: 'passthrough',
		platformProxy: {
			enabled: true
		}
	}),
})

