import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateInstanceUrl } from '@repo/security'
import { handleUpdateIntegrationConfig } from '../src/route-handlers/update-config'
import { prisma } from '@repo/database'

vi.mock('@repo/database', () => ({
	prisma: {
		integration: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
}))

describe('Jira SSRF and Config Auth Protection (WO-45 + WO-87)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('validateInstanceUrl (SSRF Guard)', () => {
		it('rejects http: URLs (requires https: strictly)', () => {
			const res = validateInstanceUrl('http://my-jira.atlassian.net')
			expect(res.valid).toBe(false)
			expect(res.reason).toContain('HTTPS is required')
		})

		it('rejects URLs with embedded credentials', () => {
			const res = validateInstanceUrl(
				'https://user:password@my-jira.atlassian.net',
			)
			expect(res.valid).toBe(false)
			expect(res.reason).toContain('credentials')
		})

		it('rejects IPv6 unique-local and link-local addresses', () => {
			expect(validateInstanceUrl('https://[fd00::1]').valid).toBe(false)
			expect(validateInstanceUrl('https://[fe80::1]').valid).toBe(false)
		})

		it('accepts valid HTTPS cloud domain', () => {
			expect(validateInstanceUrl('https://company.atlassian.net').valid).toBe(
				true,
			)
		})
	})

	describe('handleUpdateIntegrationConfig permission and SSRF validation', () => {
		it('rejects non-atlassian.net instanceUrl with 400', async () => {
			vi.mocked(prisma.integration.findUnique).mockResolvedValue({
				id: 'int-123',
				providerName: 'jira',
			} as any)

			const formData = new FormData()
			formData.append('intent', 'update-integration-config')
			formData.append('integrationId', 'int-123')
			formData.append(
				'config',
				JSON.stringify({ instanceUrl: 'https://evil-attacker-server.com' }),
			)

			const request = new Request(
				'http://localhost:3000/api/integrations/update-config',
				{
					method: 'POST',
					body: formData,
				},
			)

			const deps = {
				requireUserId: vi.fn().mockResolvedValue('user-123'),
				getUserDefaultOrganization: vi
					.fn()
					.mockResolvedValue({ organization: { id: 'org-123' } }),
			}

			const response = await handleUpdateIntegrationConfig(
				{ request, params: {}, context: {} } as any,
				deps,
			)
			expect(response.status).toBe(400)
			const body = await response.json()
			expect(body.error).toContain('Invalid Jira instance URL')
		})

		it('denies user when requireOrgPermission throws', async () => {
			const formData = new FormData()
			formData.append('intent', 'update-integration-config')
			formData.append('integrationId', 'int-123')
			formData.append('config', JSON.stringify({}))

			const request = new Request(
				'http://localhost:3000/api/integrations/update-config',
				{
					method: 'POST',
					body: formData,
				},
			)

			const deps = {
				requireUserId: vi.fn().mockResolvedValue('user-viewer'),
				getUserDefaultOrganization: vi
					.fn()
					.mockResolvedValue({ organization: { id: 'org-123' } }),
				requireOrgPermission: vi.fn().mockRejectedValue(new Error('Denied')),
			}

			const response = await handleUpdateIntegrationConfig(
				{ request, params: {}, context: {} } as any,
				deps,
			)
			expect(response.status).toBe(403)
		})
	})
})
