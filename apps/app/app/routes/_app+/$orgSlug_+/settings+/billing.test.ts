import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __setMockLaunchStatus } from '#app/utils/env.server.ts'
import {
	createAuthenticatedRequest,
	createTestOrganization,
	createTestSession,
	createTestUser,
	getResponseStatus,
	setupTestOrgWithUser,
} from '#tests/test-utils.ts'
import { action, loader } from './billing.tsx'

vi.mock('#app/utils/payments.server.ts', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('#app/utils/payments.server.ts')>()
	return {
		...actual,
		getPlansAndPrices: vi.fn().mockResolvedValue({
			plans: {
				base: { id: 'prod_base', name: 'Base' },
				plus: { id: 'prod_plus', name: 'Plus' },
			},
			prices: {
				base: {
					monthly: { id: 'price_base_m', unitAmount: 1000, currency: 'usd' },
					yearly: { id: 'price_base_y', unitAmount: 10000, currency: 'usd' },
				},
				plus: {
					monthly: { id: 'price_plus_m', unitAmount: 2000, currency: 'usd' },
					yearly: { id: 'price_plus_y', unitAmount: 20000, currency: 'usd' },
				},
			},
		}),
	}
})

describe('settings/billing route integration', () => {
	beforeEach(() => {
		__setMockLaunchStatus('LAUNCHED')
	})

	afterEach(() => {
		__setMockLaunchStatus(null)
	})

	describe('loader', () => {
		it('redirects unauthenticated users to login', async () => {
			const owner = await createTestUser()
			const org = await createTestOrganization(owner.id, 'admin')

			const request = new Request(
				`http://localhost:3000/${org.slug}/settings/billing`,
			)

			try {
				await loader({
					request,
					params: { orgSlug: org.slug },
					context: {},
				} as any)
				expect.fail('Expected loader to redirect unauthenticated user')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(302)
				expect(error.headers.get('Location')).toContain('/login')
			}
		})

		it('throws 404 for users outside the organization', async () => {
			const outsider = await createTestUser()
			const { cookie } = await createTestSession(outsider.id)

			const owner = await createTestUser()
			const org = await createTestOrganization(owner.id, 'admin')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${org.slug}/settings/billing`,
				{},
				cookie,
			)

			try {
				await loader({
					request,
					params: { orgSlug: org.slug },
					context: {},
				} as any)
				expect.fail('Expected loader to deny outsider')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(404)
			}
		})

		it('throws 404 when in CLOSED_BETA without active subscription', async () => {
			__setMockLaunchStatus('CLOSED_BETA')
			const { organization, cookie } = await setupTestOrgWithUser('admin')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}/settings/billing`,
				{},
				cookie,
			)

			try {
				await loader({
					request,
					params: { orgSlug: organization.slug },
					context: {},
				} as any)
				expect.fail('Expected 404 in beta without subscription')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(404)
			}
		})

		it('loads billing details successfully for organization admin when LAUNCHED', async () => {
			const { organization, cookie } = await setupTestOrgWithUser('admin')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}/settings/billing`,
				{},
				cookie,
			)

			const result = (await loader({
				request,
				params: { orgSlug: organization.slug },
				context: {},
			} as any)) as any

			expect(result).toBeDefined()
			expect(result.organization).toBeDefined()
			expect(result.organization.id).toBe(organization.id)
			expect(result.invoices).toEqual([])
		})
	})

	describe('action', () => {
		it('returns 400 when submitting invalid intent', async () => {
			const { organization, cookie } = await setupTestOrgWithUser('admin')

			const formData = new FormData()
			formData.append('intent', 'unknown-intent')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}/settings/billing`,
				{ method: 'POST', body: formData },
				cookie,
			)

			const response = (await action({
				request,
				params: { orgSlug: organization.slug },
				context: {},
			} as any)) as Response

			expect(getResponseStatus(response)).toBe(400)
			const body = (await response.json()) as { error?: string }
			expect(body.error).toContain('Invalid intent')
		})

		it('throws 404 on action during CLOSED_BETA without subscription', async () => {
			__setMockLaunchStatus('CLOSED_BETA')
			const { organization, cookie } = await setupTestOrgWithUser('admin')

			const formData = new FormData()
			formData.append('intent', 'upgrade')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}/settings/billing`,
				{ method: 'POST', body: formData },
				cookie,
			)

			try {
				await action({
					request,
					params: { orgSlug: organization.slug },
					context: {},
				} as any)
				expect.fail('Expected 404 for action in beta')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(404)
			}
		})
	})
})
