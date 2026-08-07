import { default as defaultConfig } from '@repo/config/eslint-preset'

/** @type {import("eslint").Linter.Config} */
export default [
	...defaultConfig,
	{
		ignores: ['dist/', '.astro/', 'node_modules/', 'public/', 'env.d.ts'],
	},
]
