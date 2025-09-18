import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { data, redirect, Form } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'

import {
	checkIsCommonPassword,
	requireAnonymous,
	resetUserPassword,
} from '#app/utils/auth.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { PasswordAndConfirmPasswordSchema } from '#app/utils/user-validation.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { type Route } from './+types/reset-password.ts'
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

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export const resetPasswordUsernameSessionKey = 'resetPasswordUsername'

const ResetPasswordSchema = PasswordAndConfirmPasswordSchema

async function requireResetPasswordUsername(request: Request) {
	await requireAnonymous(request)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const resetPasswordUsername = verifySession.get(
		resetPasswordUsernameSessionKey,
	)
	if (typeof resetPasswordUsername !== 'string' || !resetPasswordUsername) {
		throw redirect('/login')
	}
	return resetPasswordUsername
}

export async function loader({ request }: Route.LoaderArgs) {
	const resetPasswordUsername = await requireResetPasswordUsername(request)
	return { resetPasswordUsername }
}

export async function action({ request }: Route.ActionArgs) {
	const resetPasswordUsername = await requireResetPasswordUsername(request)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		schema: ResetPasswordSchema.superRefine(async ({ password }, ctx) => {
			const isCommonPassword = await checkIsCommonPassword(password)
			if (isCommonPassword) {
				ctx.addIssue({
					path: ['password'],
					code: 'custom',
					message: 'Password is too common',
				})
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
	const { password } = submission.value

	await resetUserPassword({ username: resetPasswordUsername, password })
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	return redirect('/login', {
		headers: {
			'set-cookie': await verifySessionStorage.destroySession(verifySession),
		},
	})
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Reset Password | Epic Startup' }]
}

export default function ResetPasswordPage({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'reset-password',
		constraint: getZodConstraint(ResetPasswordSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ResetPasswordSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Card className="bg-muted/80 border-0 shadow-2xl">
			<CardHeader>
				<CardTitle className="text-xl">Reset Password</CardTitle>
				<CardDescription>
					Hi, {loaderData.resetPasswordUsername}. Enter your new password below.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form method="POST" {...getFormProps(form)}>
					<div className="grid gap-6">
						<div className="grid gap-3">
							<Label htmlFor={fields.password.id}>New Password</Label>
							<Input
								{...getInputProps(fields.password, { type: 'password' })}
								autoComplete="new-password"
								autoFocus
								placeholder="Enter your new password"
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
								placeholder="Confirm your new password"
								required
							/>
							<ErrorList errors={fields.confirmPassword.errors} />
						</div>

						<ErrorList errors={form.errors} id={form.errorId} />

						<StatusButton
							className="w-full"
							status={isPending ? 'pending' : (form.status ?? 'idle')}
							type="submit"
							disabled={isPending}
						>
							Reset password
						</StatusButton>
					</div>
				</Form>
			</CardContent>
		</Card>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
