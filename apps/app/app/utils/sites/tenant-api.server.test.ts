import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	getRegionalTenantApiUrl,
	provisionTenantDatabase,
} from './tenant-api.server.ts'

describe('tenant-api sites server utility', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		vi.resetModules()
		process.env.INTERNAL_COMMAND_TOKEN = 'test-token-123456789'
		process.env.TENANT_API_URL = 'http://localhost:3007'
		process.env.TENANT_API_URL_KSA = 'http://localhost:3009'
	})

	afterEach(() => {
		process.env = { ...originalEnv }
		vi.restoreAllMocks()
	})

	it('resolves US tenant API URL with fallback', () => {
		expect(getRegionalTenantApiUrl('us')).toBe('http://localhost:3007')
		expect(getRegionalTenantApiUrl(null)).toBe('http://localhost:3007')
	})

	it('resolves KSA tenant API URL', () => {
		expect(getRegionalTenantApiUrl('ksa')).toBe('http://localhost:3009')
	})

	it('handles null payload gracefully on non-2xx response without throwing TypeError', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 502,
				statusText: 'Bad Gateway',
				json: vi.fn().mockResolvedValue(null),
			}),
		)

		await expect(
			provisionTenantDatabase({
				orgId: 'org-123',
				dataRegion: 'us',
			}),
		).rejects.toThrow('Tenant API error: HTTP 502 Bad Gateway')
	})

	it('extracts error message from structured JSON error response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: vi
					.fn()
					.mockResolvedValue({ error: 'Database already provisioned' }),
			}),
		)

		await expect(
			provisionTenantDatabase({
				orgId: 'org-123',
				dataRegion: 'us',
			}),
		).rejects.toThrow('Tenant API error: Database already provisioned')
	})
})
