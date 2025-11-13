import { data } from 'react-router'
import { z } from 'zod'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { validateRequest } from '#app/routes/_auth+/verify.server.ts'
import { type Route } from './+types/auth.verify.ts'

const codeQueryParam = 'code'
const targetQueryParam = 'target'
const typeQueryParam = 'type'
const redirectToQueryParam = 'redirectTo'

const types = ['onboarding', 'reset-password', 'change-email', '2fa'] as const
const VerificationTypeSchema = z.enum(types)

export const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
})

export async function action({ request }: Route.ActionArgs) {
	try {
		const formData = await request.formData()

		// Check honeypot
		try {
			await checkHoneypot(formData)
		} catch (error) {
			return data(
				{
					success: false,
					error: 'spam_detected',
					message: 'Form submission failed security check',
				},
				{ status: 400 },
			)
		}

		// Use the existing validateRequest function from the web app
		try {
			const result = await validateRequest(request, formData)

			// If validateRequest returns a redirect (successful verification),
			// we convert it to a success response for the API
			if (result instanceof Response && result.status === 302) {
				const location = result.headers.get('Location')

				// Preserve the session cookie from the redirect
				const responseData = data({
					success: true,
					data: {
						verified: true,
						redirectTo: location,
						message: 'Verification successful',
					},
				})

				return responseData
			}

			// If it returns data, pass it through
			return result
		} catch (error) {
			// If validateRequest throws an error (like a redirect with toast),
			// handle it appropriately for the API
			if (error instanceof Response) {
				if (error.status === 302) {
					// This might be a redirect with error info
					return data(
						{
							success: false,
							error: 'verification_failed',
							message: 'Verification failed',
						},
						{ status: 400 },
					)
				}
			}
			throw error
		}
	} catch (error) {
		console.error('Verify action error:', error)
		return data(
			{
				success: false,
				error: 'internal_error',
				message: 'An unexpected error occurred. Please try again.',
			},
			{ status: 500 },
		)
	}
}

export async function loader() {
	return data(
		{
			success: false,
			error: 'method_not_allowed',
			message: 'Use POST method for verification',
		},
		{ status: 405 },
	)
}
