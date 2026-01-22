import { i18n } from '@lingui/core'
import { I18nProvider as LinguiI18nProvider } from '@lingui/react'
import * as Localization from 'expo-localization'
import { useEffect, useState, type ReactNode } from 'react'
import './polyfills'
import { loadCatalog } from './lingui'

const SUPPORTED_LOCALES = ['en', 'ar'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function getDefaultLocale(): SupportedLocale {
	const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en'
	return SUPPORTED_LOCALES.includes(deviceLocale as SupportedLocale)
		? (deviceLocale as SupportedLocale)
		: 'en'
}

interface I18nProviderProps {
	children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		const initI18n = async () => {
			const locale = getDefaultLocale()
			await loadCatalog(locale)
			setIsLoaded(true)
		}
		void initI18n()
	}, [])

	if (!isLoaded) {
		return null
	}

	return <LinguiI18nProvider i18n={i18n}>{children}</LinguiI18nProvider>
}
