import { default as defaultConfig } from '@repo/config/eslint-preset'
import pluginLingui from 'eslint-plugin-lingui'

/** @type {import("eslint").Linter.Config} */
export default [
	...defaultConfig,
	pluginLingui.configs['flat/recommended'],
	// add custom config objects here:
	{
		files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
		rules: {
			'epic-web/prefer-dispose-in-tests': 'off',
		},
	},
	{
		files: ['**/tests/**/*.ts'],
		rules: {
			'react-hooks/rules-of-hooks': 'off',
		},
	},
	{
		ignores: [
			'.react-router/*',
			'env.d.ts',
			'test-results/**',
			'playwright-report/**',
		],
	},
]
