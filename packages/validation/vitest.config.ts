import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
			reportsDirectory: './coverage',
			exclude: [
				'node_modules/',
				'dist/',
				'tests/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/index.ts',
				'**/__mocks__/**',
				'**/fixtures/**',
			],
			include: ['src/**/*.ts', 'src/**/*.tsx'],
			all: true,
			skipFull: false,
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
				},
				perFile: true,
			},
			watermarks: {
				statements: [50, 80],
				functions: [50, 80],
				branches: [50, 80],
				lines: [50, 80],
			},
		},
  },
})