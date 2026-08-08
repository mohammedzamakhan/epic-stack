import { type LinguiConfig } from '@lingui/conf'

const config: LinguiConfig = {
	fallbackLocales: {
		default: 'en',
	},
	locales: ['en', 'ar'],
	catalogs: [
		{
			path: '<rootDir>/app/locales/{locale}',
			include: ['app', '../../packages/ai'],
			exclude: [
				'**/node_modules/**',
				'../../packages/**/node_modules/**',
				'../../node_modules/**',
			],
		},
	],
}

export default config
