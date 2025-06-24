import { i18n } from '@lingui/core'
import { detect, fromHtmlTag } from '@lingui/detect-locale'
import { I18nProvider } from '@lingui/react'
import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { loadCatalog } from './modules/lingui/lingui'

if (ENV.MODE === 'production' && ENV.SENTRY_DSN) {
	void import('./utils/monitoring.client.tsx').then(({ init }) => init())
}

const locale = detect(fromHtmlTag('lang')) || 'en'
console.log('locale:::', locale)
await loadCatalog(locale)

startTransition(() => {
	hydrateRoot(
		document,
		<I18nProvider i18n={i18n}>
			<HydratedRouter />
		</I18nProvider>,
	)
})
