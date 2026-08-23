import { describe, expect, it } from 'vitest'
import {
	sharedCookieDomain,
	sharedCookieDomainFromHost,
} from './cookie-domain.server.ts'

describe('sharedCookieDomainFromHost', () => {
	it('strips the app/admin label from a two-label apex', () => {
		expect(sharedCookieDomainFromHost('app.menuza.io')).toBe('.menuza.io')
		expect(sharedCookieDomainFromHost('app.epic-startup.dev:2999')).toBe(
			'.epic-startup.dev',
		)
		expect(sharedCookieDomainFromHost('admin.epic-startup.me')).toBe(
			'.epic-startup.me',
		)
	})

	it('omits domain on localhost and opaque Workers hosts', () => {
		expect(sharedCookieDomainFromHost('localhost:3001')).toBeUndefined()
		expect(sharedCookieDomainFromHost('127.0.0.1')).toBeUndefined()
		expect(
			sharedCookieDomainFromHost('epic-startup-app.zama-887.workers.dev'),
		).toBeUndefined()
	})

	it('shares cookies across *.localhost subdomains', () => {
		expect(sharedCookieDomainFromHost('app.localhost:3001')).toBe('.localhost')
	})
})

describe('sharedCookieDomain', () => {
	it('reads the apex from BASE_URL', () => {
		expect(sharedCookieDomain('https://app.menuza.io')).toBe('.menuza.io')
		expect(sharedCookieDomain('http://localhost:3001')).toBeUndefined()
	})
})
