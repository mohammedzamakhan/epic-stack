import { Webhook } from 'svix'

export type ResendWebhookHeaders = {
	id: string | null
	timestamp: string | null
	signature: string | null
}

export function verifyResendWebhook({
	payload,
	headers,
	webhookSecret,
}: {
	payload: string
	headers: ResendWebhookHeaders
	webhookSecret: string
}): unknown {
	if (!headers.id || !headers.timestamp || !headers.signature) {
		throw new Error('Missing Resend webhook signature headers')
	}

	const verifier = new Webhook(webhookSecret)
	return verifier.verify(payload, {
		'svix-id': headers.id,
		'svix-timestamp': headers.timestamp,
		'svix-signature': headers.signature,
	})
}
