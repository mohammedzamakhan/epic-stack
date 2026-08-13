import { describe, expect, it } from 'vitest'
import {
	negotiateSiteLocale,
	getLocalizedEditableValue,
	parseLocalizedString,
	parseSiteLocalesConfig,
	pickLocalized,
	serializeLocalizedString,
} from './site-locales.ts'

describe('site-locales', () => {
	it('parses locales config with defaults', () => {
		expect(parseSiteLocalesConfig(null, null)).toEqual({
			locales: ['en'],
			defaultLocale: 'en',
		})

		expect(parseSiteLocalesConfig(JSON.stringify(['en', 'ar']), 'ar')).toEqual({
			locales: ['en', 'ar'],
			defaultLocale: 'ar',
		})
	})

	it('parses legacy plain strings and JSON maps', () => {
		expect(parseLocalizedString('Hello', 'en')).toEqual({ en: 'Hello' })
		expect(parseLocalizedString('{"en":"Hi","ar":"مرحبا"}')).toEqual({
			en: 'Hi',
			ar: 'مرحبا',
		})
	})

	it('picks localized content with fallback', () => {
		const map = { en: 'Hello', ar: 'مرحبا' }
		expect(pickLocalized(map, 'ar', 'en')).toBe('مرحبا')
		expect(pickLocalized(map, 'fr', 'en')).toBe('Hello')
		expect(pickLocalized(map, 'fr-FR', 'de')).toBe('Hello')
	})

	it('preserves spaces for editable localized values', () => {
		expect(getLocalizedEditableValue('{"en":"Hello "}', 'en', 'en')).toBe(
			'Hello ',
		)
		expect(getLocalizedEditableValue('{"en":" "}', 'en', 'en')).toBe(' ')
		expect(getLocalizedEditableValue('Plain text ', 'en', 'en')).toBe(
			'Plain text ',
		)
	})

	it('serializes localized strings without empty values', () => {
		expect(
			serializeLocalizedString({ en: 'Hello', ar: '  ', fr: 'Bonjour' }),
		).toBe('{"en":"Hello","fr":"Bonjour"}')
	})

	it('negotiates supported locales', () => {
		expect(negotiateSiteLocale(['fr-FR', 'en'], ['en', 'ar'], 'en')).toBe('en')
		expect(negotiateSiteLocale('ar', ['en', 'ar'], 'en')).toBe('ar')
		expect(negotiateSiteLocale(['de'], ['en', 'ar'], 'ar')).toBe('ar')
	})
})
