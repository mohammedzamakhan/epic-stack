import { default as defaultConfig } from '@repo/config/eslint-preset'

/** @type {import("eslint").Linter.Config} */
export default [
	...defaultConfig,
	{
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['.storybook/**', '**/*.stories.tsx', '**/*.stories.ts'],
		rules: {
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
		},
	},
	{
		// Storybook files use hooks in render functions, which is a valid pattern
		files: ['**/*.stories.tsx'],
		rules: {
			'react-hooks/rules-of-hooks': 'off',
		},
	},
]
