import { describe, expect, it } from 'vitest'

import { resolveRegionalTenantApiUrls } from './tenant-api.server.ts'

describe('resolveRegionalTenantApiUrls', () => {
	it('gives the browser the public HTTPS origin and keeps localhost for server fetch', () => {
		expect(
			resolveRegionalTenantApiUrls('us', {
				TENANT_API_URL: 'http://localhost:3007',
			}),
		).toEqual({
			tenantApiUrl: 'http://localhost:3007',
		})
	})

	it('resolves KSA public and internal URLs independently', () => {
		expect(
			resolveRegionalTenantApiUrls('ksa', {
				TENANT_API_URL_KSA: 'http://localhost:3009',
			}),
		).toEqual({
			tenantApiUrl: 'http://localhost:3009',
		})
	})

	it('falls back to the internal URL when no public origin is configured', () => {
		expect(
			resolveRegionalTenantApiUrls('us', {
				TENANT_API_URL: 'https://tenant-api.example.com/',
			}),
		).toEqual({
			tenantApiUrl: 'https://tenant-api.example.com',
		})
	})
})
