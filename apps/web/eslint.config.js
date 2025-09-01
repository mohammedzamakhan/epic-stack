import { default as defaultConfig } from '@repo/config/eslint-preset'

/** @type {import("eslint").Linter.Config} */
export default [
	...defaultConfig,
	// Custom ignores for Astro app
	{
		ignores: [
			'dist/',
			'.astro/',
			'node_modules/',
			'public/',
		],
	},
]