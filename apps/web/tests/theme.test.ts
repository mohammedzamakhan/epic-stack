import { describe, expect, it } from 'vitest'

import { getThemeFromCookie } from '../src/utils/theme.ts'

describe('getThemeFromCookie', () => {
	it('reads light/dark from the configured operator theme cookie', () => {
		expect(getThemeFromCookie('en_theme=light; other=1', 'en_theme')).toBe(
			'light',
		)
		expect(
			getThemeFromCookie('en_theme_staging=dark', 'en_theme_staging'),
		).toBe('dark')
	})

	it('defaults to dark when the cookie is missing or invalid', () => {
		expect(getThemeFromCookie(null, 'en_theme')).toBe('dark')
		expect(getThemeFromCookie('en_theme=system', 'en_theme')).toBe('dark')
		expect(getThemeFromCookie('en_theme=light', 'en_theme_staging')).toBe(
			'dark',
		)
	})
})
