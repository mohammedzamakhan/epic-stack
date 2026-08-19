import { setupI18n, type I18n, type Messages } from '@lingui/core'
import { messages as ar } from '../locales/ar.po'
import { messages as de } from '../locales/de.po'
import { messages as en } from '../locales/en.po'
import { messages as es } from '../locales/es.po'
import { messages as fr } from '../locales/fr.po'
import { messages as zh } from '../locales/zh.po'

const catalogs: Record<string, Messages> = { ar, de, en, es, fr, zh }

function messagesFor(locale: string): Messages {
	const lang = locale.split('-')[0] ?? 'en'
	return catalogs[lang] ?? catalogs.en ?? {}
}

/**
 * Per-request i18n instance so concurrent SSR requests do not share locale.
 * Chrome copy uses Lingui source strings (`msg\`Sign in\``); page content
 * stays in the builder JSON maps.
 */
export function createSiteI18n(locale: string): I18n {
	const lang = locale.split('-')[0] ?? 'en'
	const i18n = setupI18n()
	i18n.load({
		en: catalogs.en ?? {},
		[lang]: messagesFor(lang),
	})
	i18n.activate(lang)
	return i18n
}
