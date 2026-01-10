import { Honeypot, SpamError } from 'remix-utils/honeypot/server'

// SECURITY: Prevent using default example secret in production
if (
	process.env.NODE_ENV === 'production' &&
	process.env.HONEYPOT_SECRET === 'super-duper-s3cret'
) {
	throw new Error(
		'SECURITY WARNING: You are using the default HONEYPOT_SECRET from .env.example in production. ' +
			'This reduces the effectiveness of spam protection. Please generate a new secret.',
	)
}

export const honeypot = new Honeypot({
	validFromFieldName: process.env.NODE_ENV === 'test' ? null : undefined,
	encryptionSeed: process.env.HONEYPOT_SECRET,
})

export async function checkHoneypot(formData: FormData) {
	try {
		await honeypot.check(formData)
	} catch (error) {
		if (error instanceof SpamError) {
			throw new Response('Form not submitted properly', { status: 400 })
		}
		throw error
	}
}
