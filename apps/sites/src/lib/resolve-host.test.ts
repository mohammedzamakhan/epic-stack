import { describe, expect, it } from 'vitest'
import { getSiteHostSuffixes, resolveHost } from './resolve-host.ts'

const previewEnv = {
	ROOT_APP: 'zama-887.workers.dev',
	PUBLIC_SITE_HOST_SUFFIXES: 'epic-startup.dev',
}

describe('resolveHost', () => {
	it('reads the org slug from the brand .me domain', () => {
		expect(resolveHost('acme12.epic-startup.me')).toEqual({
			kind: 'slug',
			orgSlug: 'acme12',
		})
	})

	it('reads the org slug from a Cloudflare Worker route suffix', () => {
		expect(resolveHost('acme12.epic-startup.dev', previewEnv)).toEqual({
			kind: 'slug',
			orgSlug: 'acme12',
		})
	})

	it('does not treat a Worker-route host as a custom domain', () => {
		expect(resolveHost('acme12.epic-startup.dev')).toEqual({
			kind: 'custom',
			host: 'acme12.epic-startup.dev',
		})
	})

	it('ignores the platform apex and reserved names', () => {
		expect(resolveHost('epic-startup.dev', previewEnv)).toEqual({
			kind: 'none',
		})
		expect(resolveHost('www.epic-startup.dev', previewEnv)).toEqual({
			kind: 'none',
		})
		expect(resolveHost('epic-startup.me')).toEqual({ kind: 'none' })
	})

	it('includes ROOT_APP and extra suffixes, longest first', () => {
		expect(getSiteHostSuffixes(previewEnv)).toEqual([
			'zama-887.workers.dev',
			'epic-startup.dev',
			'epic-startup.me',
		])
	})
})
