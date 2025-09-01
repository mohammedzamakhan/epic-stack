import { type LinguiConfig } from '@lingui/conf'

const config: LinguiConfig = {
	fallbackLocales: {
		default: 'en',
	},
	locales: ['en', 'ar'],
	catalogs: [
		{
			path: '<rootDir>/app/locales/{locale}',
			include: ['app'],
		},
	],
}

export default config
