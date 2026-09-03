import { operatorThemeCookieName } from '@repo/common/cookie-domain'
import { describe, expect, it } from 'vitest'
import { getTheme, setTheme } from './theme.server.ts'

describe('theme.server', () => {
	const cookieName = operatorThemeCookieName()

	describe('getTheme', () => {
		it('returns null when cookie header has invalid theme', () => {
			const request = new Request('http://localhost:3000', {
				headers: { cookie: `${cookieName}=invalid_theme` },
			})
			expect(getTheme(request)).toBeNull()
		})

		it('returns light when cookie header specifies light', () => {
			const request = new Request('http://localhost:3000', {
				headers: { cookie: `${cookieName}=light` },
			})
			expect(getTheme(request)).toBe('light')
		})

		it('returns dark when cookie header specifies dark', () => {
			const request = new Request('http://localhost:3000', {
				headers: { cookie: `${cookieName}=dark` },
			})
			expect(getTheme(request)).toBe('dark')
		})

		it('defaults to dark when no cookie header is provided', () => {
			const request = new Request('http://localhost:3000')
			expect(getTheme(request)).toBe('dark')
		})
	})

	describe('setTheme', () => {
		it('serializes light theme with 1 year max-age', () => {
			const cookie = setTheme('light')
			expect(cookie).toContain(`${cookieName}=light`)
			expect(cookie).toContain('Max-Age=31536000')
			expect(cookie).toContain('Path=/')
		})

		it('serializes dark theme with 1 year max-age', () => {
			const cookie = setTheme('dark')
			expect(cookie).toContain(`${cookieName}=dark`)
			expect(cookie).toContain('Max-Age=31536000')
		})

		it('serializes system theme with max-age -1 to clear cookie', () => {
			const cookie = setTheme('system')
			expect(cookie).toContain(`${cookieName}=`)
			expect(cookie).toContain('Max-Age=-1')
		})
	})
})
