import { detectBot, slidingWindow, validateEmail } from '@arcjet/remix'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import * as E from '@react-email/components'
import { data, redirect, Form, useSearchParams } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
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
import { type Route } from './+types/signup.ts'
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
	return null
}

export async function action(args: Route.ActionArgs) {
	const formData = await args.request.formData()

	await checkHoneypot(formData)

	// Arcjet security protection
	if (process.env.ARCJET_KEY) {
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
				return data(
					{ result: null },
					{ status: 400, statusText: errorMessage },
				)
			}
		} catch (error) {
			// If Arcjet fails, log error but continue with signup process
			console.error('Arcjet protection failed:', error)
		}
	}

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
		subject: `Welcome to Epic Notes!`,
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

export function SignupEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string
	otp: string
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Welcome to Epic Notes!</E.Text>
				</h1>
				<p>
					<E.Text>
						Here's your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>Or click the link to get started:</E.Text>
				</p>
				<E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
			</E.Container>
		</E.Html>
	)
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Sign Up | Epic Notes' }]
}

export default function SignupRoute({ actionData }: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

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
		<div className="container flex flex-col justify-center pt-20 pb-32">
			<div className="text-center">
				<h1 className="text-h1">Let's start your journey!</h1>
				<p className="text-body-md text-muted-foreground mt-3">
					Please enter your email.
				</p>
			</div>
			<div className="mx-auto mt-16 max-w-sm min-w-full sm:min-w-[368px]">
				<Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<Field
						labelProps={{
							htmlFor: fields.email.id,
							children: 'Email',
						}}
						inputProps={{
							...getInputProps(fields.email, { type: 'email' }),
							autoFocus: true,
							autoComplete: 'email',
						}}
						errors={fields.email.errors}
					/>
					<ErrorList errors={form.errors} id={form.errorId} />
					<StatusButton
						className="w-full"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
						type="submit"
						disabled={isPending}
					>
						Submit
					</StatusButton>
				</Form>
				<ul className="flex flex-col gap-4 py-4">
					{providerNames.map((providerName) => (
						<>
							<hr />
							<li key={providerName}>
								<ProviderConnectionForm
									type="Signup"
									providerName={providerName}
									redirectTo={redirectTo}
								/>
							</li>
						</>
					))}
				</ul>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
