import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
	},
	resolve: {
		alias: {
			'cloudflare:workers': path.resolve(
				import.meta.dirname,
				'./test-helpers/cloudflare-workers-mock.ts',
			),
		},
	},
})
