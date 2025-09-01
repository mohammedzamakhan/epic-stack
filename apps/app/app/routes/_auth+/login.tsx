import { detectBot, slidingWindow } from '@arcjet/remix'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { startAuthentication } from '@simplewebauthn/browser'
import { type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server'
import { useOptimistic, useState, useTransition } from 'react'
import { data, Form, Link, useNavigate, useSearchParams } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { CheckboxField, ErrorList } from '#app/components/forms.tsx'
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
	Icon,
} from '@repo/ui'
import arcjet from '#app/utils/arcjet.server.ts'
import { login, requireAnonymous } from '#app/utils/auth.server.ts'
import {
	ProviderConnectionForm,
	providerNames,
} from '#app/utils/connections.tsx'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { getErrorMessage, useIsPending } from '#app/utils/misc.tsx'
import { PasswordSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { type Route } from './+types/login.ts'
import { handleNewSession } from './login.server.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
})

const AuthenticationOptionsSchema = z.object({
	options: z.object({ challenge: z.string() }),
}) satisfies z.ZodType<{ options: PublicKeyCredentialRequestOptionsJSON }>

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
		// A login form shouldn't be submitted more than a few times a minute to prevent brute force.
		slidingWindow({
			mode: 'LIVE',
			max: 10, // 10 requests per window.
			interval: '60s', // 60 second sliding window.
		}),
	)

export async function loader({ request }: Route.LoaderArgs) {
	await requireAnonymous(request)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	await checkHoneypot(formData)

	// Arcjet security protection for login (skip in test environment)
	if (process.env.ARCJET_KEY && process.env.NODE_ENV !== 'test') {
		try {
			const decision = await aj.protect({ request, context: {} })

			if (decision.isDenied()) {
				let errorMessage = 'Access denied'

				if (decision.reason.isBot()) {
					errorMessage = 'Forbidden'
				} else if (decision.reason.isRateLimit()) {
					errorMessage = 'Too many login attempts - try again shortly'
				}

				// Return early with error response
				return data({ result: null }, { status: 400, statusText: errorMessage })
			}
		} catch (error) {
			// If Arcjet fails, log error but continue with login process
			console.error('Arcjet protection failed:', error)
		}
	}
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, session: null }

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
			{ result: submission.reply({ hideFields: ['password'] }) },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { session, remember, redirectTo } = submission.value

	return handleNewSession({
		request,
		session,
		remember: remember ?? false,
		redirectTo,
	})
}

export default function LoginPage({ actionData }: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')
	const isBanned = searchParams.get('banned') === 'true'

	const [form, fields] = useForm({
		id: 'login-form',
		constraint: getZodConstraint(LoginFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card className="bg-muted/80 border-0 shadow-2xl">
			<CardHeader>
				<CardTitle className="text-xl">Welcome back</CardTitle>
				<CardDescription>
					Login with your social account or email
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isBanned && (
					<div className="border-destructive bg-destructive/10 mb-4 rounded-lg border p-4">
						<div className="text-destructive flex items-center gap-2">
							<Icon name="lock" className="h-5 w-5" />
							<h3 className="font-semibold">Account Suspended</h3>
						</div>
						<p className="text-destructive/80 mt-2 text-sm">
							Your account has been suspended. Please contact support if you
							believe this is an error.
						</p>
					</div>
				)}
				<div className="grid gap-6">
					{/* Social Login Buttons */}
					<div className="flex flex-col gap-4">
						{providerNames.map((providerName) => (
							<ProviderConnectionForm
								key={providerName}
								type="Login"
								providerName={providerName}
								redirectTo={redirectTo}
							/>
						))}
					</div>

					{/* Passkey Login */}
					<PasskeyLogin
						redirectTo={redirectTo}
						remember={fields.remember.value === 'on'}
					/>

					{/* Divider */}
					<div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
						<span className="bg-card text-muted-foreground relative z-10 px-2">
							Or continue with
						</span>
					</div>

					<Form method="POST" {...getFormProps(form)}>
						<HoneypotInputs />

						{/* Email/Username Login Form */}
						<div className="grid gap-6">
							<div className="grid gap-3">
								<Label htmlFor={fields.username.id}>Username</Label>
								<Input
									{...getInputProps(fields.username, { type: 'text' })}
									autoFocus
									className="lowercase"
									autoComplete="username"
									placeholder="Enter your username"
								/>
								<ErrorList errors={fields.username.errors} />
							</div>
							<div className="grid gap-3">
								<div className="flex items-center">
									<Label htmlFor={fields.password.id}>Password</Label>
									<Link
										to="/forgot-password"
										className="ml-auto text-sm underline-offset-4 hover:underline"
									>
										Forgot your password?
									</Link>
								</div>
								<Input
									{...getInputProps(fields.password, {
										type: 'password',
									})}
									autoComplete="current-password"
									placeholder="Enter your password"
								/>
								<ErrorList errors={fields.password.errors} />
							</div>

							<div className="flex items-center space-x-2">
								<CheckboxField
									labelProps={{
										htmlFor: fields.remember.id,
										children: 'Remember me',
									}}
									buttonProps={getInputProps(fields.remember, {
										type: 'checkbox',
									})}
									errors={fields.remember.errors}
								/>
							</div>

							<input
								{...getInputProps(fields.redirectTo, { type: 'hidden' })}
							/>
							<ErrorList errors={form.errors} id={form.errorId} />

							<StatusButton
								className="w-full"
								status={isPending ? 'pending' : (form.status ?? 'idle')}
								type="submit"
								disabled={isPending}
							>
								Login
							</StatusButton>
						</div>
					</Form>
				</div>
			</CardContent>
			<CardFooter className="block rounded-lg p-4 text-center text-sm">
				Don&apos;t have an account?{' '}
				<Link
					to={
						redirectTo
							? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
							: '/signup'
					}
					className="font-medium underline underline-offset-4"
				>
					Create account
				</Link>
			</CardFooter>
		</Card>
	)
}

const VerificationResponseSchema = z.discriminatedUnion('status', [
	z.object({
		status: z.literal('success'),
		location: z.string(),
	}),
	z.object({
		status: z.literal('error'),
		error: z.string(),
	}),
])

function PasskeyLogin({
	redirectTo,
	remember,
}: {
	redirectTo: string | null
	remember: boolean
}) {
	const [isPending] = useTransition()
	const [error, setError] = useState<string | null>(null)
	const [passkeyMessage, setPasskeyMessage] = useOptimistic<string | null>(
		'Login with a passkey',
	)
	const navigate = useNavigate()

	async function handlePasskeyLogin() {
		try {
			setPasskeyMessage('Generating Authentication Options')
			// Get authentication options from the server
			const optionsResponse = await fetch('/webauthn/authentication')
			const json = await optionsResponse.json()
			const { options } = AuthenticationOptionsSchema.parse(json)

			setPasskeyMessage('Requesting your authorization')
			const authResponse = await startAuthentication({ optionsJSON: options })
			setPasskeyMessage('Verifying your passkey')

			// Verify the authentication with the server
			const verificationResponse = await fetch('/webauthn/authentication', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ authResponse, remember, redirectTo }),
			})

			const verificationJson = await verificationResponse.json().catch(() => ({
				status: 'error',
				error: 'Unknown error',
			}))

			const parsedResult =
				VerificationResponseSchema.safeParse(verificationJson)
			if (!parsedResult.success) {
				throw new Error(parsedResult.error.message)
			} else if (parsedResult.data.status === 'error') {
				throw new Error(parsedResult.data.error)
			}
			const { location } = parsedResult.data

			setPasskeyMessage("You're logged in! Navigating...")
			await navigate(location ?? '/')
		} catch (e) {
			const errorMessage = getErrorMessage(e)
			setError(`Failed to authenticate with passkey: ${errorMessage}`)
		}
	}

	return (
		<form action={handlePasskeyLogin}>
			<StatusButton
				id="passkey-login-button"
				aria-describedby="passkey-login-button-error"
				className="w-full"
				status={isPending ? 'pending' : error ? 'error' : 'idle'}
				type="submit"
				disabled={isPending}
			>
				<span className="inline-flex items-center gap-1.5">
					<Icon name="passkey" />
					<span>{passkeyMessage}</span>
				</span>
			</StatusButton>
			<div className="mt-2">
				<ErrorList errors={[error]} id="passkey-login-button-error" />
			</div>
		</form>
	)
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Login to Epic Notes' }]
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
