import {
	getFormProps,
	getInputProps,
	useForm,
	type SubmissionResult,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import {
	redirect,
	data,
	type Params,
	Form,
	useSearchParams,
} from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'
import { CheckboxField, ErrorList } from '#app/components/forms.tsx'

import {
	sessionKey,
	signupWithConnection,
	requireAnonymous,
} from '#app/utils/auth.server.ts'
import { ProviderNameSchema } from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { NameSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { type Route } from './+types/onboarding_.$provider.ts'
import { onboardingEmailSessionKey } from './onboarding'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	StatusButton,
} from '@repo/ui'

export const providerIdKey = 'providerId'
export const prefilledProfileKey = 'prefilledProfile'

const SignupFormSchema = z.object({
	imageUrl: z.string().optional(),
	username: UsernameSchema,
	name: NameSchema,
	agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
		required_error: 'You must agree to the terms of service and privacy policy',
	}),
	remember: z.boolean().optional(),
	redirectTo: z.string().optional(),
})

async function requireData({
	request,
	params,
}: {
	request: Request
	params: Params
}) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	const providerId = verifySession.get(providerIdKey)
	const result = z
		.object({
			email: z.string(),
			providerName: ProviderNameSchema,
			providerId: z.string().or(z.number()),
		})
		.safeParse({ email, providerName: params.provider, providerId })
	if (result.success) {
		return result.data
	} else {
		console.error(result.error)
		throw redirect('/signup')
	}
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const { email } = await requireData({ request, params })

	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const prefilledProfile = verifySession.get(prefilledProfileKey)

	return {
		email,
		status: 'idle',
		submission: {
			initialValue: prefilledProfile ?? {},
		} as SubmissionResult,
	}
}

export async function action({ request, params }: Route.ActionArgs) {
	const { email, providerId, providerName } = await requireData({
		request,
		params,
	})
	const formData = await request.formData()
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)

	const submission = await parseWithZod(formData, {
		schema: SignupFormSchema.superRefine(async (data, ctx) => {
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
		}).transform(async (data) => {
			const session = await signupWithConnection({
				...data,
				email,
				providerId: String(providerId),
				providerName,
			})
			return { ...data, session }
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { session, remember, redirectTo } = submission.value

	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	authSession.set(sessionKey, session.id)
	const headers = new Headers()
	headers.append(
		'set-cookie',
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	)
	headers.append(
		'set-cookie',
		await verifySessionStorage.destroySession(verifySession),
	)

	return redirectWithToast(
		'/organizations',
		{ title: 'Welcome', description: 'Thanks for signing up!' },
		{ headers },
	)
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Setup Epic Startup Account' }]
}

export default function OnboardingProviderRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'onboarding-provider-form',
		constraint: getZodConstraint(SignupFormSchema),
		lastResult: actionData?.result ?? loaderData.submission,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div
			className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4"
			style={{
				backgroundImage: `url('/assets/images/background_1.webp')`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
			}}
		>
			<div className="w-full max-w-md">
				<div className="flex flex-col gap-6">
					<Card className="bg-muted/80 border-0 shadow-2xl">
						<CardHeader className="text-center">
							<CardTitle className="text-xl">Complete your profile</CardTitle>
							<CardDescription>
								Hi {loaderData.email}, just a few more details to get started.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Form method="POST" {...getFormProps(form)}>
								<div className="grid gap-6">
									{fields.imageUrl.initialValue ? (
										<div className="flex flex-col items-center justify-center gap-4">
											<img
												src={fields.imageUrl.initialValue}
												alt="Profile"
												className="size-24 rounded-full"
											/>
											<p className="text-muted-foreground text-sm">
												You can change your photo later
											</p>
											<input
												{...getInputProps(fields.imageUrl, { type: 'hidden' })}
											/>
										</div>
									) : null}

									<div className="grid gap-3">
										<Label htmlFor={fields.username.id}>Username</Label>
										<Input
											{...getInputProps(fields.username, { type: 'text' })}
											autoComplete="username"
											className="lowercase"
											placeholder="Enter your username"
											required
										/>
										<ErrorList errors={fields.username.errors} />
									</div>

									<div className="grid gap-3">
										<Label htmlFor={fields.name.id}>Full Name</Label>
										<Input
											{...getInputProps(fields.name, { type: 'text' })}
											autoComplete="name"
											placeholder="Enter your full name"
											required
										/>
										<ErrorList errors={fields.name.errors} />
									</div>

									<div className="flex items-center space-x-2">
										<CheckboxField
											labelProps={{
												htmlFor:
													fields.agreeToTermsOfServiceAndPrivacyPolicy.id,
												children:
													'I agree to the Terms of Service and Privacy Policy',
											}}
											buttonProps={getInputProps(
												fields.agreeToTermsOfServiceAndPrivacyPolicy,
												{ type: 'checkbox' },
											)}
											errors={
												fields.agreeToTermsOfServiceAndPrivacyPolicy.errors
											}
										/>
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

									{redirectTo ? (
										<input type="hidden" name="redirectTo" value={redirectTo} />
									) : null}

									<ErrorList errors={form.errors} id={form.errorId} />

									<StatusButton
										className="w-full"
										status={isPending ? 'pending' : (form.status ?? 'idle')}
										type="submit"
										disabled={isPending}
									>
										Create account
									</StatusButton>
								</div>
							</Form>
						</CardContent>
					</Card>
					<div className="text-center text-xs text-balance text-white/80 *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-white">
						By creating an account, you agree to our{' '}
						<a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
					</div>
				</div>
			</div>
		</div>
	)
}
