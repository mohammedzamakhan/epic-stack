import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { data, redirect, Form, useSearchParams } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

import { z } from 'zod'
import { CheckboxField, ErrorList } from '#app/components/forms.tsx'

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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	StatusButton,
	Icon,
} from '@repo/ui'

export const onboardingEmailSessionKey = 'onboardingEmail'
export const onboardingInviteTokenSessionKey = 'onboardingInviteToken'

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

async function getOnboardingInviteToken(request: Request) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const inviteToken = verifySession.get(onboardingInviteTokenSessionKey)
	return typeof inviteToken === 'string' ? inviteToken : null
}

export async function loader({ request }: Route.LoaderArgs) {
	const email = await requireOnboardingEmail(request)
	const inviteToken = await getOnboardingInviteToken(request)
	return { email, inviteToken }
}

export async function action({ request }: Route.ActionArgs) {
	const email = await requireOnboardingEmail(request)
	const inviteToken = await getOnboardingInviteToken(request)
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

	const { session, remember } = submission.value

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

	// Check for invite token first
	if (inviteToken) {
		try {
			const { createInvitationFromLink } = await import(
				'#app/utils/organization-invitation.server.ts'
			)
			// Create a pending invitation for this user
			const invitation = await createInvitationFromLink(inviteToken, email)

			const inviterName =
				invitation.inviter?.name || invitation.inviter?.email || 'Someone'
			return redirectWithToast(
				'/organizations',
				{
					title: 'Welcome!',
					description: `Thanks for signing up! ${inviterName} has invited you to join ${invitation.organization.name}. Review the invitation below.`,
				},
				{ headers },
			)
		} catch (error) {
			console.error('Error processing invite link during signup:', error)
			// If invite link processing fails, continue with normal flow
		}
	}

	// Check for pending organization invitations and accept them
	try {
		const { acceptInvitationByEmail } = await import(
			'#app/utils/organization-invitation.server.ts'
		)
		const invitationResults = await acceptInvitationByEmail(
			email,
			session.userId,
		)

		if (invitationResults.length > 0) {
			const joinedOrganizations = invitationResults.filter(
				(result) => !result.alreadyMember,
			)
			if (joinedOrganizations.length > 0) {
				// If user has pending invitations, redirect to settings/organizations to accept them
				return redirectWithToast(
					'/organizations',
					{
						title: 'Welcome!',
						description: `Thanks for signing up! You have pending organization invitations.`,
					},
					{ headers },
				)
			}
		}
	} catch (error) {
		// Don't fail the signup if invitation processing fails
		console.error(
			'Error processing organization invitations during signup:',
			error,
		)
	}

	// Check for organizations with verified domains matching the user's email
	try {
		const emailDomain = email.split('@')[1]
		if (emailDomain) {
			const [organizationsWithMatchingDomain, memberRole] = await Promise.all([
				prisma.organization.findMany({
					where: {
						verifiedDomain: emailDomain,
						users: {
							none: {
								userId: session.userId,
							},
						},
					},
					select: {
						id: true,
						name: true,
						slug: true,
					},
				}),
				// Get the default member role
				prisma.organizationRole.findUnique({
					where: { name: 'member' },
					select: { id: true },
				}),
			])

			if (organizationsWithMatchingDomain.length > 0 && memberRole) {
				// Auto-add user to organizations with matching verified domains
				await prisma.userOrganization.createMany({
					data: organizationsWithMatchingDomain.map((org) => ({
						userId: session.userId,
						organizationId: org.id,
						organizationRoleId: memberRole.id, // Use proper organization role
					})),
				})

				const orgNames = organizationsWithMatchingDomain
					.map((org) => org.name)
					.join(', ')

				// Redirect to organizations page to show the user they've been added
				return redirectWithToast(
					'/organizations',
					{
						title: 'Welcome!',
						description: `Thanks for signing up! You've been automatically added to ${orgNames} based on your email domain.`,
					},
					{ headers },
				)
			}
		}
	} catch (error) {
		// Don't fail the signup if domain-based organization joining fails
		console.error(
			'Error processing domain-based organization joining during signup:',
			error,
		)
	}

	return redirectWithToast(
		'/organizations/create',
		{ title: 'Welcome', description: 'Thanks for signing up!' },
		{ headers },
	)
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Setup Epic Startup Account' }]
}

export default function OnboardingRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()
	const [searchParams] = useSearchParams()
	const redirectTo = searchParams.get('redirectTo')
	const inviteToken = loaderData.inviteToken

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
		<Card className="bg-muted/80 border-0 shadow-2xl">
			<CardHeader>
				<CardTitle className="text-xl">
					{inviteToken ? 'Complete your profile' : 'Welcome aboard!'}
				</CardTitle>
				<CardDescription>
					Hi {loaderData.email}, please complete your profile
					{inviteToken ? ' to join the organization' : ''}.
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

						<div>
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
