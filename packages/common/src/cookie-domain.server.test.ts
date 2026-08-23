import { describe, expect, it } from 'vitest'

import { getBrandDomain } from '@repo/config/brand'

import {
	sharedCookieDomain,
	sharedCookieDomainFromHost,
} from './cookie-domain.server.ts'

describe('sharedCookieDomainFromHost', () => {
	it('strips the app/admin label from a two-label apex', () => {
		expect(sharedCookieDomainFromHost('app.epic-startup.dev')).toBe(
			'.epic-startup.dev',
		)
		expect(sharedCookieDomainFromHost('app.preview.example.dev:2999')).toBe(
			'.preview.example.dev',
		)
		expect(sharedCookieDomainFromHost(`admin.${getBrandDomain()}`)).toBe(
			`.${getBrandDomain()}`,
		)
	})

	it('omits domain on localhost and opaque Workers hosts', () => {
		expect(sharedCookieDomainFromHost('localhost:3001')).toBeUndefined()
		expect(sharedCookieDomainFromHost('127.0.0.1')).toBeUndefined()
		expect(
			sharedCookieDomainFromHost('example-app.example.workers.dev'),
		).toBeUndefined()
	})

	it('shares cookies across *.localhost subdomains', () => {
		expect(sharedCookieDomainFromHost('app.localhost:3001')).toBe('.localhost')
	})
})

describe('sharedCookieDomain', () => {
	it('reads the apex from BASE_URL', () => {
		expect(sharedCookieDomain('https://app.epic-startup.dev')).toBe(
			'.epic-startup.dev',
		)
		expect(sharedCookieDomain('http://localhost:3001')).toBeUndefined()
	})
})
