/// <reference types="astro/client" />

import { type I18n } from '@lingui/core'
import { type PublicOrganization, type PublicWebsitePage } from './lib/org'

declare global {
	namespace App {
		interface Locals {
			orgSlug: string | null
			customHost: string | null
			requestedLocale: string
			defaultLocale: string
			i18n: I18n
			organization: PublicOrganization | null
			publishedPagePromise?: Promise<PublicWebsitePage | null>
		}
	}
}

declare module '*.css?url' {
	const href: string
	export default href
}
