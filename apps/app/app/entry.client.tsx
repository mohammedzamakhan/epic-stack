import { i18n, I18nProvider, detect, fromHtmlTag } from '@repo/i18n'
import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { ENV } from 'varlock/env'
import { loadCatalog } from './modules/lingui/lingui'

if (ENV.NODE_ENV === 'production' && ENV.SENTRY_DSN) {
	void import('./utils/monitoring.client.tsx').then(({ init }) => init())
}

const locale = detect(fromHtmlTag('lang')) || 'en'

await loadCatalog(locale)

// Start hydration immediately - translations will be available soon
startTransition(() => {
	hydrateRoot(
		document,
		<I18nProvider i18n={i18n}>
			<HydratedRouter />
		</I18nProvider>,
	)
})
