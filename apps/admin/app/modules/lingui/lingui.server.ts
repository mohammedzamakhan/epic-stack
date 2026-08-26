import { createLocaleCookie, createLinguiServer } from '@repo/i18n/server'
import config from '../../../lingui.config'
import { loadCatalog } from './lingui.ts'

export const localeCookie = createLocaleCookie()

export const linguiServer = createLinguiServer(config, localeCookie)

/** Activate catalogs before loaders/actions that call `t`. Data requests skip entry.server. */
export async function ensureLinguiRequestLocale(request: Request) {
	const locale = await linguiServer.getLocale(request)
	await loadCatalog(locale)
	return locale
}
