import { describe, expect, it } from 'vitest'

import { getBrandDomain } from '@repo/config/brand'

import {
	parentDomainFromHost,
	sitePreviewFrameSrc,
	sitePreviewHostSuffixes,
} from './csp-frame-src.server.ts'

describe('site preview frame-src', () => {
	it('derives the parent domain from the App host', () => {
		expect(parentDomainFromHost('app.preview.example.dev')).toBe(
			'preview.example.dev',
		)
		expect(parentDomainFromHost(`app.${getBrandDomain()}:2999`)).toBe(
			getBrandDomain(),
		)
		expect(parentDomainFromHost('localhost:3001')).toBeNull()
	})

	it('allows tenant Sites on the live brand domain from the request host', () => {
		expect(sitePreviewFrameSrc({}, 'app.preview.example.dev')).toEqual(
			expect.arrayContaining([
				"'self'",
				'*.preview.example.dev',
				'*.preview.example.dev:*',
				`*.${getBrandDomain()}`,
			]),
		)
	})

	it('includes PUBLIC_SITE_HOST_SUFFIXES from env', () => {
		expect(
			sitePreviewHostSuffixes({
				PUBLIC_SITE_HOST_SUFFIXES: 'preview.example.dev',
			}),
		).toEqual(expect.arrayContaining([getBrandDomain(), 'preview.example.dev']))
	})
})
