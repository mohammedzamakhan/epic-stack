import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('cloudflare:workers', () => ({
	env: {},
}))

vi.mock('astro:middleware', () => ({
	defineMiddleware: (fn: any) => fn,
}))

vi.mock('~/lib/i18n', () => ({
	createSiteI18n: vi.fn().mockReturnValue({}),
}))

vi.mock('~/lib/org', () => ({
	fetchPublishedOrganizationForHost: vi.fn().mockResolvedValue(null),
	fetchPublishedSitePage: vi.fn().mockResolvedValue(null),
}))

import { onRequest } from './middleware.ts'

describe('Sites middleware onRequest', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		process.env.PUBLIC_SITE_HOST_SUFFIXES = 'sites.localhost,epic-startup.me'
	})

	it('applies security headers and processes static asset requests', async () => {
		const context: any = {
			request: new Request(
				'http://acme.sites.localhost:3008/fonts/inter.woff2',
			),
			locals: {},
		}
		const next = vi
			.fn()
			.mockResolvedValue(new Response('font-data', { status: 200 }))

		const response = (await onRequest(context, next)) as Response

		expect(next).toHaveBeenCalled()
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
		expect(response.headers.get('Content-Security-Policy')).toContain(
			"default-src 'self'",
		)
		expect(context.locals.orgSlug).toBe('acme')
	})

	it('attaches no-cache headers to /api/* routes', async () => {
		const context: any = {
			request: new Request('http://acme.sites.localhost:3008/api/auth/session'),
			locals: {},
		}
		const next = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))

		const response = (await onRequest(context, next)) as Response

		expect(response.headers.get('Cache-Control')).toBe(
			'no-store, no-cache, must-revalidate',
		)
		expect(response.headers.get('Vary')).toContain('Host')
	})

	it('handles custom domains and sets customHost on locals', async () => {
		const context: any = {
			request: new Request('http://custom-domain.com/_astro/client.js'),
			locals: {},
		}
		const next = vi
			.fn()
			.mockResolvedValue(new Response('console.log()', { status: 200 }))

		const response = (await onRequest(context, next)) as Response

		expect(response.status).toBe(200)
		expect(context.locals.customHost).toBe('custom-domain.com')
		expect(context.locals.orgSlug).toBeNull()
	})
})
