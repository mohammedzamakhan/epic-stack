import { detectBot, slidingWindow, validateEmail } from '@arcjet/remix'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans, t } from '@lingui/macro'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { brand, getPageTitle } from '@repo/config/brand'
import { prisma } from '@repo/database'
import { ForgotPasswordEmail } from '@repo/email'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Field, FieldLabel, FieldError, FieldGroup } from '@repo/ui/field'
import { Input } from '@repo/ui/input'
import { StatusButton } from '@repo/ui/status-button'
import { EmailSchema, UsernameSchema } from '@repo/validation'
import { data, redirect, Link, Form, useActionData } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'
import arcjet from '#app/utils/arcjet.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'
import { ENV } from '#app/utils/env.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
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

	// Arcjet security protection for forgot password (skip in test environment)
	if (ENV.ARCJET_KEY && ENV.NODE_ENV === 'production') {
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
					message: t`No user exists with this username or email`,
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
		select: { id: true, email: true, username: true },
	})

	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: 'reset-password',
		target: user.id,
	})

	const response = await sendEmail({
		to: user.email,
		subject: brand.email.passwordReset,
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
	return [{ title: getPageTitle('Password Recovery') }]
}

export default function ForgotPasswordRoute() {
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'forgot-password-form',
		constraint: getZodConstraint(ForgotPasswordSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ForgotPasswordSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl">
					<Trans>Forgot Password</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>No worries, we'll send you reset instructions.</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<FieldGroup>
						<Field
							data-invalid={
								fields.usernameOrEmail.errors?.length ? true : undefined
							}
						>
							<FieldLabel htmlFor={fields.usernameOrEmail.id}>
								<Trans>Username or Email</Trans>
							</FieldLabel>
							<Input
								{...getInputProps(fields.usernameOrEmail, { type: 'text' })}
								autoFocus
								placeholder={t`Enter your username or email`}
								required
								aria-invalid={
									fields.usernameOrEmail.errors?.length ? true : undefined
								}
							/>
							<FieldError
								errors={convertErrorsToFieldFormat(
									fields.usernameOrEmail.errors,
								)}
							/>
						</Field>

						<ErrorList errors={form.errors} id={form.errorId} />

						<StatusButton
							className="w-full"
							status={form.status ?? 'idle'}
							type="submit"
						>
							<Trans>Send reset instructions</Trans>
						</StatusButton>
					</FieldGroup>
				</Form>
			</CardContent>
			<CardFooter className="block rounded-lg p-4 text-center text-sm">
				<Trans>Remember your password?</Trans>{' '}
				<Link to="/login" className="font-medium underline underline-offset-4">
					<Trans>Back to login</Trans>
				</Link>
			</CardFooter>
		</Card>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
