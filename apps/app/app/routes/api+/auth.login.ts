import { detectBot, slidingWindow } from '@arcjet/remix'
import { parseWithZod } from '@conform-to/zod'
import { auditService, AuditAction } from '@repo/audit'
import { prisma } from '@repo/database'
import { arcjet, checkHoneypot } from '@repo/security'
import { UsernameSchema, PasswordSchema } from '@repo/validation'
import { data } from 'react-router'
import { z } from 'zod'
import { login } from '#app/utils/auth.server.ts'
import { createAuthenticatedSessionResponse } from '#app/utils/jwt.server.ts'
import { type Route } from './+types/auth.login.ts'

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z
		.union([z.boolean(), z.string()])
		.optional()
		.transform((val) => {
			if (typeof val === 'string') {
				return val === 'on' || val === 'true'
			}
			return Boolean(val)
		}),
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

export async function action({ request }: Route.ActionArgs) {
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
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: LoginFormSchema.transform(async (data, ctx) => {
			const session = await login({ ...data, request })
			if (!session) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid username or password',
				})
				return z.NEVER
			}
			return { ...data, session }
		}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.session) {
		// Log failed login attempt (SOC 2 CC7.2)
		const username = formData.get('username')?.toString()
		void auditService.logAuth(
			AuditAction.USER_LOGIN_FAILED,
			undefined,
			`Failed API login attempt for: ${username}`,
			{ username, source: 'api' },
			request,
			false,
		)

		return data(
			{
				success: false,
				error: 'authentication_failed',
				message: 'Invalid username or password',
			},
			{ status: 400 },
		)
	}

	const { session } = submission.value

	// Check if user has 2FA enrolled
	const twoFactorVerification = await prisma.verification.findFirst({
		where: { target: session.userId, type: '2fa' },
	})

	if (twoFactorVerification) {
		return data(
			{
				success: false,
				error: 'two_factor_required',
				message: 'Two-factor authentication required',
				userId: session.userId,
			},
			{ status: 400 },
		)
	}

	// Log successful login (SOC 2 CC7.2)
	void auditService.logAuth(
		AuditAction.USER_LOGIN,
		session.userId,
		'User logged in via API',
		{ source: 'api', loginMethod: 'password' },
		request,
		true,
	)

	// Use shared helper to create authenticated session response
	const response = await createAuthenticatedSessionResponse(
		session.userId,
		request,
	)

	if (!response.success) {
		return data(response, { status: 400 })
	}

	return data(response)
}
