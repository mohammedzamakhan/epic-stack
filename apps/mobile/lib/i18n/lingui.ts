import { i18n, type Messages } from '@lingui/core'

import { messages as arMessages } from '../../locales/ar.po'
import { messages as enMessages } from '../../locales/en.po'

const catalogs: Record<string, Messages> = {
	ar: arMessages,
	en: enMessages,
}

export async function loadCatalog(locale: string) {
	const messages = catalogs[locale] ?? catalogs.en
	return i18n.loadAndActivate({ locale, messages })
}

export { i18n }
