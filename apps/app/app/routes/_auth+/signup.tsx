import { detectBot, slidingWindow, validateEmail } from '@arcjet/remix'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { SignupEmail } from '@repo/email'
import { data, redirect, Form, useSearchParams, Link } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Input,
	Label,
	StatusButton,
} from '@repo/ui'
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
import { EmailSchema } from '#app/utils/user-validation.ts'
import { verifySessionStorage } from '#app/utils/verification.server'
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
					message: 'A user already exists with this email',
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
		subject: `Welcome to Epic Startup!`,
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
	return [{ title: 'Sign Up | Epic Startup' }]
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
					{inviteToken ? 'Join organization' : 'Create an account'}
				</CardTitle>
				<CardDescription>
					{inviteToken
						? 'Complete your signup to join the organization'
						: 'Sign up with your social account or email'}
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
							Or continue with
						</span>
					</div>

					{/* Email Signup Form */}
					<Form method="POST" {...getFormProps(form)}>
						<HoneypotInputs />
						<div className="grid gap-6">
							<div className="grid gap-3">
								<Label htmlFor={fields.email.id}>Email</Label>
								<Input
									{...getInputProps(fields.email, { type: 'email' })}
									autoFocus
									autoComplete="email"
									placeholder="m@example.com"
									required
								/>
								<ErrorList errors={fields.email.errors} />
							</div>

							<ErrorList errors={form.errors} id={form.errorId} />

							<StatusButton
								className="w-full"
								status={isPending ? 'pending' : (form.status ?? 'idle')}
								type="submit"
								disabled={isPending}
							>
								Sign up
							</StatusButton>
						</div>
					</Form>
				</div>
			</CardContent>
			<CardFooter className="block rounded-lg p-4 text-center text-sm">
				Already have an account?{' '}
				<Link
					to={
						redirectTo
							? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
							: '/login'
					}
					className="font-medium underline underline-offset-4"
				>
					Sign in
				</Link>
			</CardFooter>
		</Card>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
