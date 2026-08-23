import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		env: {
			DATABASE_URL: 'file:./db/data.db',
		},
		testTimeout: 10000,
	},
})
