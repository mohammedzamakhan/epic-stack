import { type LinguiConfig } from '@lingui/conf'

const config: LinguiConfig = {
	sourceLocale: 'en',
	fallbackLocales: {
		default: 'en',
	},
	locales: ['en', 'ar'],
	catalogs: [
		{
			path: '<rootDir>/app/locales/{locale}',
			include: [
				'app',
				'../../packages/ai',
				'../../packages/marketing',
				'../../packages/marketing-workflow',
			],
			exclude: [
				'**/node_modules/**',
				'../../packages/**/node_modules/**',
				'../../node_modules/**',
			],
		},
	],
}

export default config
