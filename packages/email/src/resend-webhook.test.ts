import { describe, expect, it } from 'vitest'
import { verifyResendWebhook } from './resend-webhook.ts'

describe('verifyResendWebhook', () => {
	it('requires svix signature headers', () => {
		expect(() =>
			verifyResendWebhook({
				payload: '{}',
				webhookSecret: 'whsec_test',
				headers: {
					id: null,
					timestamp: null,
					signature: null,
				},
			}),
		).toThrow('Missing Resend webhook signature headers')
	})
})
