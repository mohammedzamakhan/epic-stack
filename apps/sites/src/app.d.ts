/// <reference types="astro/client" />

import { type I18n } from '@lingui/core'

declare global {
	namespace App {
		interface Locals {
			orgSlug: string | null
			customHost: string | null
			requestedLocale: string
			defaultLocale: string
			i18n: I18n
		}
	}
}
