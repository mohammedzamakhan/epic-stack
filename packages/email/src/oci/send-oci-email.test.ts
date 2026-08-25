import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
	getOciEmailConfig,
	isOciEmailConfigured,
	resetOciEmailConfigCache,
} from './config.ts'
import { sendOciEmail } from './send-oci-email.ts'

describe('@repo/email OCI provider', () => {
	beforeEach(() => {
		resetOciEmailConfigCache()
		vi.unstubAllEnvs()
	})

	it('reports unconfigured when required env vars are missing', () => {
		expect(isOciEmailConfigured()).toBe(false)
		expect(getOciEmailConfig()).toBeNull()
	})

	it('loads config when required env vars are present', () => {
		vi.stubEnv('OCI_TENANCY_OCID', 'ocid1.tenancy')
		vi.stubEnv('OCI_USER_OCID', 'ocid1.user')
		vi.stubEnv('OCI_FINGERPRINT', 'aa:bb:cc')
		vi.stubEnv(
			'OCI_PRIVATE_KEY',
			'-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----',
		)
		vi.stubEnv('OCI_REGION', 'me-jeddah-1')
		vi.stubEnv('OCI_EMAIL_COMPARTMENT_ID', 'ocid1.compartment')
		vi.stubEnv('OCI_EMAIL_SENDER_EMAIL', 'marketing@example.com')

		const config = getOciEmailConfig()
		expect(config?.senderEmail).toBe('marketing@example.com')
		expect(isOciEmailConfigured()).toBe(true)
	})

	it('returns mock send result in non-production when unconfigured', async () => {
		const result = await sendOciEmail({
			to: 'customer@example.com',
			subject: 'Hello',
			html: '<p>Hi</p>',
			text: 'Hi',
		})

		expect(result.status).toBe('skipped')
		if (result.status === 'skipped') {
			expect(result.data.mock).toBe(true)
		}
	})

	it('uses MSW mock transport when MOCKS=true', async () => {
		vi.stubEnv('MOCKS', 'true')
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					emailSubmittedResponse: { messageId: 'mock-msg-1' },
					opcRequestId: 'opc-1',
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			),
		)
		vi.stubGlobal('fetch', fetchMock)

		const result = await sendOciEmail({
			to: 'customer@example.com',
			subject: 'Hello',
			html: '<p>Hi</p>',
			text: 'Hi',
			messageId: 'msg-1',
		})

		expect(fetchMock).toHaveBeenCalledOnce()
		expect(result).toEqual({
			status: 'success',
			data: { messageId: 'mock-msg-1', opcRequestId: 'opc-1' },
		})
	})
})
