import { detectBot, slidingWindow, validateEmail } from '@arcjet/remix'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { ForgotPasswordEmail } from '@repo/email'
import { data, redirect, Link, useFetcher } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#app/components/ui/card.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import arcjet from '#app/utils/arcjet.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { EmailSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { type Route } from './+types/forgot-password.ts'
import { prepareVerification } from './verify.server.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

const ForgotPasswordSchema = z.object({
	usernameOrEmail: z.union([EmailSchema, UsernameSchema]),
})

// Add rules to the base Arcjet instance for forgot password protection
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
		// Forgot password form shouldn't be submitted more than a few times per hour to prevent abuse.
		slidingWindow({
			mode: 'LIVE',
			max: 3, // 3 requests per window.
			interval: '3600s', // 1 hour sliding window.
		}),
	)
	.withRule(
		// Validate the email address to prevent spam.
		validateEmail({
			mode: 'LIVE',
			// Block disposable, invalid, and email addresses with no MX records.
			block: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'],
		}),
	)

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	await checkHoneypot(formData)

	// Arcjet security protection for forgot password
	if (process.env.ARCJET_KEY) {
		const usernameOrEmail = formData.get('usernameOrEmail') as string
		try {
			const decision = await aj.protect(
				{ request, context: {} },
				{ email: usernameOrEmail },
			)

			if (decision.isDenied()) {
				let errorMessage = 'Access denied'

				if (decision.reason.isBot()) {
					errorMessage = 'Forbidden'
				} else if (decision.reason.isRateLimit()) {
					errorMessage = 'Too many password reset attempts - try again later'
				} else if (decision.reason.isEmail()) {
					// This is a generic error, but you could be more specific
					// See https://docs.arcjet.com/email-validation/reference#checking-the-email-type
					errorMessage = 'Invalid email address'
				}

				// Return early with error response
				return data({ result: null }, { status: 400, statusText: errorMessage })
			}
		} catch (error) {
			// If Arcjet fails, log error but continue with forgot password process
			console.error('Arcjet protection failed:', error)
		}
	}
	const submission = await parseWithZod(formData, {
		schema: ForgotPasswordSchema.superRefine(async (data, ctx) => {
			const user = await prisma.user.findFirst({
				where: {
					OR: [
						{ email: data.usernameOrEmail },
						{ username: data.usernameOrEmail },
					],
				},
				select: { id: true },
			})
			if (!user) {
				ctx.addIssue({
					path: ['usernameOrEmail'],
					code: z.ZodIssueCode.custom,
					message: 'No user exists with this username or email',
				})
				return
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { usernameOrEmail } = submission.value

	const user = await prisma.user.findFirstOrThrow({
		where: { OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
		select: { email: true, username: true },
	})

	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: 'reset-password',
		target: usernameOrEmail,
	})

	const response = await sendEmail({
		to: user.email,
		subject: `Epic Notes Password Reset`,
		react: (
			<ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
		),
	})

	if (response.status === 'success') {
		return redirect(redirectTo.toString())
	} else {
		return data(
			{ result: submission.reply({ formErrors: [response.error.message] }) },
			{ status: 500 },
		)
	}
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Password Recovery for Epic Notes' }]
}

export default function ForgotPasswordRoute() {
	const forgotPassword = useFetcher<typeof action>()

	const [form, fields] = useForm({
		id: 'forgot-password-form',
		constraint: getZodConstraint(ForgotPasswordSchema),
		lastResult: forgotPassword.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ForgotPasswordSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card className="shadow-2xl border-0">
			<CardHeader className="text-center">
				<CardTitle className="text-xl">Forgot Password</CardTitle>
				<CardDescription>
					No worries, we'll send you reset instructions.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<forgotPassword.Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<div className="grid gap-6">
						<div className="grid gap-3">
							<Label htmlFor={fields.usernameOrEmail.id}>
								Username or Email
							</Label>
							<Input
								{...getInputProps(fields.usernameOrEmail, { type: 'text' })}
								autoFocus
								placeholder="Enter your username or email"
								required
							/>
							<ErrorList errors={fields.usernameOrEmail.errors} />
						</div>

						<ErrorList errors={form.errors} id={form.errorId} />

						<StatusButton
							className="w-full"
							status={
								forgotPassword.state === 'submitting'
									? 'pending'
									: (form.status ?? 'idle')
							}
							type="submit"
							disabled={forgotPassword.state !== 'idle'}
						>
							Send reset instructions
						</StatusButton>

						<div className="bg-muted backdrop-blur-sm rounded-lg p-4 text-center text-sm -m-6 mt-0">
							Remember your password?{' '}
							<Link
								to="/login"
								className="font-medium underline underline-offset-4"
							>
								Back to login
							</Link>
						</div>
					</div>
				</forgotPassword.Form>
			</CardContent>
		</Card>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
