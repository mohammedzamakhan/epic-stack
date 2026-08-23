import { describe, expect, it } from 'vitest'
import {
	parentDomainFromHost,
	sitePreviewFrameSrc,
	sitePreviewHostSuffixes,
} from './csp-frame-src.server.ts'

describe('site preview frame-src', () => {
	it('derives the parent domain from the App host', () => {
		expect(parentDomainFromHost('app.epic-startup.dev')).toBe(
			'epic-startup.dev',
		)
		expect(parentDomainFromHost('app.epic-startup.me:2999')).toBe(
			'epic-startup.me',
		)
		expect(parentDomainFromHost('localhost:3001')).toBeNull()
	})

	it('allows tenant Sites on the live brand domain from the request host', () => {
		expect(sitePreviewFrameSrc({}, 'app.epic-startup.dev')).toEqual(
			expect.arrayContaining([
				"'self'",
				'*.epic-startup.dev',
				'*.epic-startup.dev:*',
				'*.epic-startup.me',
			]),
		)
	})

	it('includes PUBLIC_SITE_HOST_SUFFIXES from env', () => {
		expect(
			sitePreviewHostSuffixes({
				PUBLIC_SITE_HOST_SUFFIXES: 'epic-startup.dev',
			}),
		).toEqual(expect.arrayContaining(['epic-startup.me', 'epic-startup.dev']))
	})
})
