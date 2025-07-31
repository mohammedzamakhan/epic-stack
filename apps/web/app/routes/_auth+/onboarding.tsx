import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { data, redirect, Form, useSearchParams } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'
import { CheckboxField, ErrorList } from '#app/components/forms.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	checkIsCommonPassword,
	requireAnonymous,
	sessionKey,
	signup,
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import {
	NameSchema,
	PasswordAndConfirmPasswordSchema,
	UsernameSchema,
} from '#app/utils/user-validation.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { type Route } from './+types/onboarding.ts'

export const onboardingEmailSessionKey = 'onboardingEmail'

const SignupFormSchema = z
	.object({
		username: UsernameSchema,
		name: NameSchema,
		agreeToTermsOfServiceAndPrivacyPolicy: z.boolean({
			required_error:
				'You must agree to the terms of service and privacy policy',
		}),
		remember: z.boolean().optional(),
		redirectTo: z.string().optional(),
	})
	.and(PasswordAndConfirmPasswordSchema)

async function requireOnboardingEmail(request: Request) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const email = verifySession.get(onboardingEmailSessionKey)
	if (typeof email !== 'string' || !email) {
		throw redirect('/signup')
	}
	return email
}

export async function loader({ request }: Route.LoaderArgs) {
	const email = await requireOnboardingEmail(request)
	return { email }
}

export async function action({ request }: Route.ActionArgs) {
	const email = await requireOnboardingEmail(request)
	const formData = await request.formData()
	await checkHoneypot(formData)
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			SignupFormSchema.superRefine(async (data, ctx) => {
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
				const isCommonPassword = await checkIsCommonPassword(data.password)
				if (isCommonPassword) {
					ctx.addIssue({
						path: ['password'],
						code: 'custom',
						message: 'Password is too common',
					})
				}
			}).transform(async (data) => {
				if (intent !== null) return { ...data, session: null }

				// Pass the request to the signup function to capture UTM parameters
				const session = await signup({ ...data, email, request })
				return { ...data, session }
			}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.session) {
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
	const verifySession = await verifySessionStorage.getSession()
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

	// Check for pending organization invitations and accept them
	try {
		const { acceptInvitationByEmail } = await import('#app/utils/organization-invitation.server.ts')
		const invitationResults = await acceptInvitationByEmail(email, session.userId)

		if (invitationResults.length > 0) {
			const joinedOrganizations = invitationResults.filter(result => !result.alreadyMember)
			if (joinedOrganizations.length > 0) {
				const orgNames = joinedOrganizations.map(result => result.organization.name).join(', ')
				const firstOrgSlug = joinedOrganizations[0]?.organization.slug
				return redirectWithToast(
					`/app/${firstOrgSlug}`,
					{
						title: 'Welcome!',
						description: `Thanks for signing up! You've been added to: ${orgNames}`
					},
					{ headers },
				)
			}
		}
	} catch (error) {
		// Don't fail the signup if invitation processing fails
		console.error('Error processing organization invitations during signup:', error)
	}

	return redirectWithToast(
		'/organizations/create',
		{ title: 'Welcome', description: 'Thanks for signing up!' },
		{ headers },
	)
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Setup Epic Notes Account' }]
}

export default function OnboardingRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')

	const [form, fields] = useForm({
		id: 'onboarding-form',
		constraint: getZodConstraint(SignupFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SignupFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card className="border-0 shadow-2xl">
			<CardHeader className="text-center">
				<CardTitle className="text-xl">Welcome aboard!</CardTitle>
				<CardDescription>
					Hi {loaderData.email}, please complete your profile.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<div className="grid gap-6">
						<div className="grid gap-3">
							<Label htmlFor={fields.username.id}>Username</Label>
							<Input
								{...getInputProps(fields.username, { type: 'text' })}
								autoComplete="username"
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

						<div className="grid gap-3">
							<Label htmlFor={fields.password.id}>Password</Label>
							<Input
								{...getInputProps(fields.password, { type: 'password' })}
								autoComplete="new-password"
								placeholder="Create a password"
								required
							/>
							<ErrorList errors={fields.password.errors} />
						</div>

						<div className="grid gap-3">
							<Label htmlFor={fields.confirmPassword.id}>
								Confirm Password
							</Label>
							<Input
								{...getInputProps(fields.confirmPassword, {
									type: 'password',
								})}
								autoComplete="new-password"
								placeholder="Confirm your password"
								required
							/>
							<ErrorList errors={fields.confirmPassword.errors} />
						</div>

						<div className="flex items-center space-x-2">
							<CheckboxField
								labelProps={{
									htmlFor: fields.agreeToTermsOfServiceAndPrivacyPolicy.id,
									children:
										'I agree to the Terms of Service and Privacy Policy',
								}}
								buttonProps={getInputProps(
									fields.agreeToTermsOfServiceAndPrivacyPolicy,
									{ type: 'checkbox' },
								)}
								errors={fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
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

						<input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />
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
	)
}
