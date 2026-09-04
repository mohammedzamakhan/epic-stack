import { default as defaultConfig } from '@repo/config/eslint-preset'

/** @type {import("eslint").Linter.Config} */
export default [
	...defaultConfig,
	// Custom ignores for Astro app
	{
		ignores: [
			'dist/',
			'.astro/',
			'.emdash/',
			'node_modules/',
			'public/',
			'env.d.ts',
			'emdash-env.d.ts',
		],
	},
]
