import twilio from 'twilio'

let twilioClient: twilio.Twilio | null = null

export function getTwilioClient() {
	if (!twilioClient) {
		const accountSid = process.env.TWILIO_ACCOUNT_SID
		const authToken = process.env.TWILIO_AUTH_TOKEN

		if (!accountSid || !authToken) {
			console.warn(
				'Twilio credentials not found. SMS will be logged to console.',
			)
		} else {
			twilioClient = twilio(accountSid, authToken)
		}
	}
	return twilioClient
}

export async function sendSms({
	to,
	message,
}: {
	to: string
	message: string
}) {
	const from = process.env.TWILIO_FROM_NUMBER
	const client = getTwilioClient()

	if (!client || !from) {
		if (process.env.NODE_ENV === 'production') {
			throw new Error(
				'Twilio credentials not found. SMS disabled in production.',
			)
		}
		console.info(`[SMS MOCK] To: ${to} | Message: ${message}`)
		return { success: true, mock: true }
	}

	const region = (process.env.DATA_REGION || 'us').toLowerCase()
	if (process.env.NODE_ENV === 'production' && region === 'ksa') {
		throw new Error(
			'Twilio must not be used for KSA customer PII. Configure an in-kingdom SMS provider (see docs/tenant-data-residency.md).',
		)
	}

	try {
		const response = await client.messages.create({
			body: message,
			from,
			to,
		})
		return { success: true, sid: response.sid, mock: false }
	} catch (error) {
		console.error('Failed to send SMS via Twilio', error)
		throw error
	}
}
