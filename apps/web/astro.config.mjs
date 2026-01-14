import cloudflare from '@astrojs/cloudflare'
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
	],

	vite: {
		plugins: [tailwindcss(), fontless()],
		server: {
			allowedHosts: [domain, 'localhost'],
		},
		optimizeDeps: {
			exclude: ['@sentry/profiling-node', '@sentry-internal/node-cpu-profiler'],
		}
	},

	adapter: cloudflare(),
})
