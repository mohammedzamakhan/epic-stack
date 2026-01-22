import { type LinguiConfig } from '@lingui/conf'

const config: LinguiConfig = {
	fallbackLocales: {
		default: 'en',
	},
	locales: ['en', 'ar'],
	catalogs: [
		{
			path: '<rootDir>/locales/{locale}',
			include: ['app', 'components', 'lib'],
		},
	],
}

export default config
