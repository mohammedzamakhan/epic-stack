import { detectBot, slidingWindow, validateEmail } from '@arcjet/remix'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans, t } from '@lingui/macro'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { brand, getPageTitle } from '@repo/config/brand'
import { SignupEmail } from '@repo/email'
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
import { EmailSchema } from '@repo/validation'
import { data, redirect, Form, useSearchParams, Link } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'
import arcjet from '#app/utils/arcjet.server.ts'
import { requireAnonymous } from '#app/utils/auth.server.ts'
import {
	ProviderConnectionForm,
	providerNames,
} from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { type Route } from './+types/signup.ts'
import { onboardingInviteTokenSessionKey } from './onboarding'
import { prepareVerification } from './verify.server.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

const SignupSchema = z.object({
	email: EmailSchema,
})

// Add rules to the base Arcjet instance outside of the handler function.
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
		// A signup form shouldn't be submitted more than a few times a minute.
		slidingWindow({
			mode: 'LIVE',
			max: 5, // 5 requests per window.
			interval: '60s', // 60 second sliding window.
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

export async function loader({ request }: Route.LoaderArgs) {
	await requireAnonymous(request)

	// Check for invite token in session
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const inviteToken = verifySession.get(onboardingInviteTokenSessionKey)

	return { inviteToken: typeof inviteToken === 'string' ? inviteToken : null }
}

export async function action(args: Route.ActionArgs) {
	const formData = await args.request.formData()

	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: { email: data.email },
				select: { id: true },
			})
			if (existingUser) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: t`A user already exists with this email`,
				})
				return
			}
			// Arcjet security protection (skip in test environment)
			if (process.env.ARCJET_KEY && process.env.NODE_ENV !== 'test') {
				const email = formData.get('email') as string
				try {
					const decision = await aj.protect(args, { email })

					if (decision.isDenied()) {
						let errorMessage = 'Access denied'

						if (decision.reason.isBot()) {
							errorMessage = 'Forbidden'
						} else if (decision.reason.isRateLimit()) {
							errorMessage = 'Too many signup attempts - try again shortly'
						} else if (decision.reason.isEmail()) {
							// This is a generic error, but you could be more specific
							// See https://docs.arcjet.com/email-validation/reference#checking-the-email-type
							errorMessage = 'Invalid email address'
						}

						// Return early with error response
						ctx.addIssue({
							path: ['email'],
							code: z.ZodIssueCode.custom,
							message: errorMessage,
						})
						return
					}
				} catch (error) {
					// If Arcjet fails, log error but continue with signup process
					console.error('Arcjet protection failed:', error)
				}
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
	const { email } = submission.value
	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request: args.request,
		type: 'onboarding',
		target: email,
	})

	const response = await sendEmail({
		to: email,
		subject: brand.email.welcome,
		react: <SignupEmail onboardingUrl={verifyUrl.toString()} otp={otp} />,
	})

	if (response.status === 'success') {
		return redirect(redirectTo.toString())
	} else {
		return data(
			{
				result: submission.reply({ formErrors: [response.error.message] }),
			},
			{
				status: 500,
			},
		)
	}
}

export const meta: Route.MetaFunction = () => {
	return [{ title: getPageTitle('Sign Up') }]
}

export default function SignupRoute({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')
	const inviteToken = loaderData?.inviteToken

	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getZodConstraint(SignupSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			const result = parseWithZod(formData, { schema: SignupSchema })
			return result
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card className="bg-muted/80 border-0 shadow-2xl">
			<CardHeader>
				<CardTitle className="text-xl">
					{inviteToken ? (
						<Trans>Join organization</Trans>
					) : (
						<Trans>Create an account</Trans>
					)}
				</CardTitle>
				<CardDescription>
					{inviteToken ? (
						<Trans>Complete your signup to join the organization</Trans>
					) : (
						<Trans>Sign up with your social account or email</Trans>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6">
					{/* Social Signup Buttons */}
					<div className="flex flex-col gap-4">
						{providerNames.map((providerName) => (
							<ProviderConnectionForm
								key={providerName}
								type="Signup"
								providerName={providerName}
								redirectTo={redirectTo}
							/>
						))}
					</div>

					{/* Divider */}
					<div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
						<span className="bg-card text-muted-foreground relative z-10 px-2">
							<Trans>Or continue with</Trans>
						</span>
					</div>

					{/* Email Signup Form */}
					<Form method="POST" {...getFormProps(form)}>
						<HoneypotInputs />
						<FieldGroup>
							<Field
								data-invalid={fields.email.errors?.length ? true : undefined}
							>
								<FieldLabel htmlFor={fields.email.id}>
									<Trans>Email</Trans>
								</FieldLabel>
								<Input
									{...getInputProps(fields.email, { type: 'email' })}
									autoFocus
									autoComplete="email"
									placeholder={t`m@example.com`}
									required
									aria-invalid={fields.email.errors?.length ? true : undefined}
								/>
								<FieldError
									errors={convertErrorsToFieldFormat(fields.email.errors)}
								/>
							</Field>

							<ErrorList errors={form.errors} id={form.errorId} />

							<StatusButton
								className="w-full"
								status={isPending ? 'pending' : (form.status ?? 'idle')}
								type="submit"
								disabled={isPending}
							>
								<Trans>Sign up</Trans>
							</StatusButton>
						</FieldGroup>
					</Form>
				</div>
			</CardContent>
			<CardFooter className="block rounded-lg p-4 text-center text-sm">
				<Trans>Already have an account?</Trans>{' '}
				<Link
					to={
						redirectTo
							? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
							: '/login'
					}
					className="font-medium underline underline-offset-4"
				>
					<Trans>Sign in</Trans>
				</Link>
			</CardFooter>
		</Card>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
