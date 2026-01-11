import { parseWithZod } from '@conform-to/zod'
import { UsernameSchema, PasswordSchema } from '@repo/validation'
import { data } from 'react-router'
import { z } from 'zod'
import { login } from '#app/utils/auth.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
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

export async function action({ request }: Route.ActionArgs) {
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
