import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
		passWithNoTests: true,
		env: {
			DATABASE_URL: 'file:./data.db',
			SSO_ENCRYPTION_KEY:
				'test-sso-encryption-key-that-is-at-least-32-chars-long',
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
		},
	},
})
