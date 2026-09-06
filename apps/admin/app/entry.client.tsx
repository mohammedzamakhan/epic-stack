import { i18n, I18nProvider, detect, fromHtmlTag } from '@repo/i18n'
import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { loadCatalog } from './modules/lingui/lingui'

const locale = detect(fromHtmlTag('lang')) || 'en'
await loadCatalog(locale)

startTransition(() => {
	hydrateRoot(
		document,
		<I18nProvider i18n={i18n}>
			<HydratedRouter />
		</I18nProvider>,
	)
})
