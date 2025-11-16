import { parseWithZod } from '@conform-to/zod'
import { data } from 'react-router'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server.ts'
import { login } from '#app/utils/auth.server.ts'
import { createTokenPair } from '#app/utils/jwt.server.ts'
import { UsernameSchema, PasswordSchema } from '@repo/validation'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { getClientIp } from '#app/utils/ip-tracking.server.ts'
import { handleNewDeviceSignin } from '#app/utils/new-device-signin.server.tsx'
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

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: LoginFormSchema.transform(async (data, ctx) => {
			const session = await login(data)
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
				message: 'User not found',
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

	// Check for new device and send notification email
	void handleNewDeviceSignin({
		userId: user.id,
		request,
	})

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
}
