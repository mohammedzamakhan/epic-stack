import { describe, expect, it } from 'vitest'

import {
	LINK_PICK_SUFFIX,
	buildHrefFromLink,
	normalizeLinkPickFields,
	parseLinkValue,
	resolveContentLink,
	resolveLinkTarget,
} from './content-links'

describe('normalizeLinkPickFields', () => {
	it('merges pick into empty canonical URL and strips pick keys', () => {
		const input = [
			{
				_type: 'marketing.hero',
				_key: 'hero',
				primaryCtaUrl__pick: '/pages/features',
				secondaryCtaUrl: '/demo',
			},
		]

		const result = normalizeLinkPickFields(input) as any

		expect(result[0].primaryCtaUrl).toBe('/pages/features')
		expect(result[0][`primaryCtaUrl${LINK_PICK_SUFFIX}`]).toBeUndefined()
		expect(result[0].secondaryCtaUrl).toBe('/demo')
	})

	it('flattens structured link objects to URL strings', () => {
		const input = [
			{
				primaryCtaUrl: {
					type: 'page',
					page: '/pages/pricing',
					target: '_blank',
				},
			},
		]

		const result = normalizeLinkPickFields(input) as Array<{
			primaryCtaUrl: string
			primaryCtaUrlTarget?: string
		}>

		expect(result[0].primaryCtaUrl).toBe('/pages/pricing')
		expect(result[0].primaryCtaUrlTarget).toBe('_blank')
	})

	it('prefers a manually entered URL over quick pick', () => {
		const input = [
			{
				ctaUrl: '#pricing',
				[`ctaUrl${LINK_PICK_SUFFIX}`]: '/pages/features',
			},
		]

		const result = normalizeLinkPickFields(input) as Array<{
			ctaUrl: string
		}>

		expect(result[0].ctaUrl).toBe('#pricing')
	})

	it('normalizes nested repeater rows', () => {
		const input = [
			{
				plans: [
					{
						name: 'Pro',
						[`ctaUrl${LINK_PICK_SUFFIX}`]: '/signup',
					},
				],
			},
		]

		const result = normalizeLinkPickFields(input) as Array<{
			plans: Array<{ name: string; ctaUrl: string }>
		}>

		expect(result[0].plans[0].ctaUrl).toBe('/signup')
	})
})

describe('buildHrefFromLink', () => {
	it('builds mailto links with subject', () => {
		expect(
			buildHrefFromLink({
				type: 'email',
				email: 'hello@example.com',
				emailSubject: 'Hi',
			}),
		).toBe('mailto:hello@example.com?subject=Hi')
	})

	it('builds tel links', () => {
		expect(
			buildHrefFromLink({
				type: 'tel',
				tel: '+1 415 555 1212',
			}),
		).toBe('tel:+14155551212')
	})
})

describe('parseLinkValue', () => {
	it('parses legacy page paths', () => {
		expect(parseLinkValue('/pages/about')).toEqual({
			type: 'page',
			page: '/pages/about',
			target: '_self',
		})
	})
})

describe('resolveContentLink', () => {
	it('prefers canonical URL over quick pick', () => {
		expect(
			resolveContentLink(
				{ ctaUrl: '#pricing', ctaUrl__pick: '/pages/features' },
				'ctaUrl',
			),
		).toBe('#pricing')
	})

	it('resolves structured link objects', () => {
		expect(
			resolveContentLink(
				{
					primaryCtaUrl: {
						type: 'url',
						url: 'https://example.com',
					},
				},
				'primaryCtaUrl',
			),
		).toBe('https://example.com')
	})

	it('falls back to quick pick when canonical is empty', () => {
		expect(
			resolveContentLink(
				{ primaryCtaUrl__pick: '/pages/features' },
				'primaryCtaUrl',
			),
		).toBe('/pages/features')
	})
})

describe('resolveLinkTarget', () => {
	it('reads flattened target suffix', () => {
		expect(
			resolveLinkTarget({ primaryCtaUrlTarget: '_blank' }, 'primaryCtaUrl'),
		).toBe('_blank')
	})

	it('reads target from structured link object', () => {
		expect(
			resolveLinkTarget(
				{
					primaryCtaUrl: {
						type: 'url',
						url: '/demo',
						target: '_blank',
					},
				},
				'primaryCtaUrl',
			),
		).toBe('_blank')
	})
})
