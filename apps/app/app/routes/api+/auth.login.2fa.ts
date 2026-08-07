import { detectBot, slidingWindow } from '@arcjet/remix'
import { parseWithZod } from '@conform-to/zod'
import { auditService, AuditAction } from '@repo/audit'
import { prisma } from '@repo/database'
import { arcjet, checkHoneypot } from '@repo/security'
import { data, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { isCodeValid } from '#app/routes/_auth+/verify.server.tsx'
import { createAuthenticatedSessionResponse } from '#app/utils/jwt.server.ts'

const Login2FASchema = z.object({
	userId: z.string(),
	code: z.string().min(1, '2FA code is required'),
})

// Add rules to the base Arcjet instance for login protection
const aj = arcjet
	.withRule(
		detectBot({
			// Will block requests. Use "DRY_RUN" to log only.
			mode: 'LIVE',
			// Configured with a list of bots to allow from https://arcjet.com/bot-list.
			// Blocks all bots except monitoring services.
			allow: ['CATEGORY:MONITOR'],
		}),
	)
	.withRule(
		// Chain bot protection with rate limiting.
		// A login API shouldn't be submitted more than a few times a minute to prevent brute force.
		slidingWindow({
			mode: 'LIVE',
			max: 10, // 10 requests per window.
			interval: '60s', // 60 second sliding window.
		}),
	)

export async function action({ request }: ActionFunctionArgs) {
	try {
		// Apply Arcjet protection before processing the request
		const decision = await aj.protect({ request, context: {} })

		if (decision.isDenied()) {
			let errorMessage = 'Access denied'

			if (decision.reason.isBot()) {
				errorMessage = 'Forbidden'
			} else if (decision.reason.isRateLimit()) {
				errorMessage = 'Too many login attempts - try again shortly'
			}

			return data(
				{
					success: false,
					error: 'access_denied',
					message: errorMessage,
				},
				{ status: 403, statusText: errorMessage },
			)
		}

		const formData = await request.formData()
		try {
			await checkHoneypot(formData)
		} catch {
			return data(
				{
					success: false,
					error: 'spam_detected',
					message: 'Form submission failed security check',
				},
				{ status: 400 },
			)
		}

		const submission = await parseWithZod(formData, {
			schema: Login2FASchema,
		})

		if (submission.status !== 'success') {
			return data(
				{
					success: false,
					error: 'validation_failed',
					message: 'Missing required fields',
				},
				{ status: 400 },
			)
		}

		const { userId, code } = submission.value

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true },
		})

		if (!user) {
			return data(
				{
					success: false,
					error: 'user_not_found',
					message: 'Invalid user',
				},
				{ status: 400 },
			)
		}

		const valid = await isCodeValid({
			code,
			type: '2fa',
			target: userId,
		})

		if (!valid) {
			void auditService.logAuth(
				AuditAction.USER_LOGIN_FAILED,
				userId,
				'Failed 2FA code verification for API login',
				{ source: 'api', hasTwoFactor: true },
				request,
				false,
			)

			return data(
				{
					success: false,
					error: 'invalid_code',
					message: 'Invalid or expired 2FA code',
				},
				{ status: 400 },
			)
		}

		void auditService.logAuth(
			AuditAction.USER_LOGIN,
			userId,
			'User logged in via API with 2FA',
			{ source: 'api', loginMethod: '2fa' },
			request,
			true,
		)

		const response = await createAuthenticatedSessionResponse(userId, request)

		if (!response.success) {
			return data(response, { status: 400 })
		}

		return data(response)
	} catch (error) {
		console.error('2FA login action error:', error)
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
			message: 'Use POST method for 2FA login verification',
		},
		{ status: 405 },
	)
}
