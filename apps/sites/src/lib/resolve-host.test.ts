import { describe, expect, it } from 'vitest'

import { getBrandDomain } from '@repo/config/brand'

import { getSiteHostSuffixes, resolveHost } from './resolve-host.ts'

const brandDomain = getBrandDomain()

const previewEnv = {
	ROOT_APP: 'zama-887.workers.dev',
	PUBLIC_SITE_HOST_SUFFIXES: 'preview.example.dev',
}

describe('resolveHost', () => {
	it('reads the org slug from the brand .me domain', () => {
		expect(resolveHost(`acme12.${brandDomain}`)).toEqual({
			kind: 'slug',
			orgSlug: 'acme12',
		})
	})

	it('reads the org slug from a Cloudflare Worker route suffix', () => {
		expect(resolveHost('acme12.preview.example.dev', previewEnv)).toEqual({
			kind: 'slug',
			orgSlug: 'acme12',
		})
	})

	it('does not treat a Worker-route host as a custom domain', () => {
		expect(resolveHost('acme12.preview.example.dev')).toEqual({
			kind: 'custom',
			host: 'acme12.preview.example.dev',
		})
	})

	it('ignores the platform apex and reserved names', () => {
		expect(resolveHost('preview.example.dev', previewEnv)).toEqual({
			kind: 'none',
		})
		expect(resolveHost('www.preview.example.dev', previewEnv)).toEqual({
			kind: 'none',
		})
		expect(resolveHost(brandDomain)).toEqual({ kind: 'none' })
	})

	it('includes ROOT_APP and extra suffixes, longest first', () => {
		expect(getSiteHostSuffixes(previewEnv)).toEqual([
			'zama-887.workers.dev',
			'preview.example.dev',
			brandDomain,
		])
	})
})
