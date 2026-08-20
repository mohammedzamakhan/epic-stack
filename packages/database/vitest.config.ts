import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		env: {
			DATABASE_URL: 'file:./db/data.db',
			SESSION_SECRET: 'test-session-secret-min-32-characters-long-for-testing',
		},
		testTimeout: 10000,
	},
})
