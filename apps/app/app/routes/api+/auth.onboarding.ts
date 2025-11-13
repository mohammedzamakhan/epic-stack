import { parseWithZod } from '@conform-to/zod'
import { data } from 'react-router'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server.ts'
import { checkIsCommonPassword, signup } from '#app/utils/auth.server.ts'
import { createTokenPair } from '#app/utils/jwt.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import {
	NameSchema,
	PasswordAndConfirmPasswordSchema,
	UsernameSchema,
} from '#app/utils/user-validation.ts'
import { getClientIp } from '#app/utils/ip-tracking.server.ts'
import { type Route } from './+types/auth.onboarding.ts'

export const onboardingEmailSessionKey = 'onboardingEmail'

const OnboardingFormSchema = z
	.object({
		email: z.string().email('Invalid email address').optional(), // Allow email in request body for mobile
		username: UsernameSchema,
		name: NameSchema,
		agreeToTermsOfServiceAndPrivacyPolicy: z
			.union([z.boolean(), z.string()])
			.transform((val) => {
				if (typeof val === 'string') {
					return val === 'on' || val === 'true'
				}
				return Boolean(val)
			})
			.refine((val) => val === true, {
				message: 'You must agree to the terms of service and privacy policy',
			}),
		remember: z
			.union([z.boolean(), z.string()])
			.optional()
			.transform((val) => {
				if (typeof val === 'string') {
					return val === 'on' || val === 'true'
				}
				return Boolean(val)
			}),
		redirectTo: z.string().optional(),
	})
	.and(PasswordAndConfirmPasswordSchema)

async function requireOnboardingEmail(request: Request) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	if (typeof email !== 'string' || !email) {
		throw new Error('No onboarding email found in session')
	}
	return email
}

export async function action({ request }: Route.ActionArgs) {
	try {
		const formData = await request.formData()

		// First, try to get email from the form data (mobile app approach)
		let email: string | undefined = formData.get('email')?.toString()

		// If no email in form data, try to get it from the verification session (web app approach)
		if (!email) {
			try {
				email = await requireOnboardingEmail(request)
			} catch (error) {
				return data(
					{
						success: false,
						error: 'no_verification_session',
						message:
							'No verification session found. Please start the signup process again.',
					},
					{ status: 400 },
				)
			}
		}

		if (!email) {
			return data(
				{
					success: false,
					error: 'no_email',
					message: 'Email is required for account creation.',
				},
				{ status: 400 },
			)
		}

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

		const submission = await parseWithZod(formData, {
			schema: OnboardingFormSchema.superRefine(async (data, ctx) => {
				const existingUser = await prisma.user.findUnique({
					where: { username: data.username },
					select: { id: true },
				})
				if (existingUser) {
					ctx.addIssue({
						path: ['username'],
						code: z.ZodIssueCode.custom,
						message: 'A user already exists with this username',
					})
					return
				}

				if (process.env.NODE_ENV !== 'test') {
					const isCommonPassword = await checkIsCommonPassword(data.password)
					if (isCommonPassword) {
						ctx.addIssue({
							path: ['password'],
							code: z.ZodIssueCode.custom,
							message:
								'This password is commonly used and not secure. Please choose a different password.',
						})
						return
					}
				}
			}),
			async: true,
		})

		if (submission.status !== 'success') {
			return data(
				{
					success: false,
					error: 'validation_failed',
					message: 'Validation failed',
					issues: submission.status === 'error' ? submission.error : undefined,
				},
				{ status: 400 },
			)
		}

		const { username, name, password, remember } = submission.value

		// Create the user account
		const session = await signup({
			email,
			username,
			name,
			password,
			request,
		})

		// Get user data for the response
		const user = await prisma.user.findUnique({
			select: {
				id: true,
				email: true,
				username: true,
				name: true,
				image: { select: { id: true } },
				createdAt: true,
				updatedAt: true,
			},
			where: { id: session.userId },
		})

		if (!user) {
			return data(
				{
					success: false,
					error: 'user_not_found',
					message: 'User not found after creation',
				},
				{ status: 400 },
			)
		}

		// Create JWT tokens for mobile authentication
		const userAgent = request.headers.get('user-agent') ?? undefined
		const ip = getClientIp(request)

		const tokens = await createTokenPair(
			{
				id: user.id,
				email: user.email,
				username: user.username,
			},
			{ userAgent, ip },
		)

		return data({
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					username: user.username,
					name: user.name,
					image: user.image?.id,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
				},
				// Return JWT tokens instead of session
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				expiresIn: tokens.expiresIn,
				expiresAt: tokens.expiresAt.toISOString(),
			},
		})
	} catch (error) {
		console.error('Onboarding action error:', error)
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
			message: 'Use POST method for onboarding',
		},
		{ status: 405 },
	)
}
