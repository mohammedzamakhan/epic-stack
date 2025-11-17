import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Trans, t } from '@lingui/macro'
import { i18n } from '@lingui/core'
import { data, redirect, Form, Link } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'

import {
	Button,
	Icon,
	StatusButton,
	Field,
	FieldLabel,
	FieldError,
	FieldGroup,
	Input,
} from '@repo/ui'
import {
	checkIsCommonPassword,
	getPasswordHash,
	requireUserId,
	verifyUserPassword,
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { PasswordSchema } from '@repo/validation'
import { type Route } from './+types/profile.password.ts'
import { BreadcrumbHandle } from './profile.change-email.tsx'

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: (
		<Icon name="more-horizontal">
			<Trans>Password</Trans>
		</Icon>
	),
	getSitemapEntries: () => null,
}

const ChangePasswordForm = z
	.object({
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
		confirmNewPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				path: ['confirmNewPassword'],
				code: z.ZodIssueCode.custom,
				message: i18n._(t`The passwords must match`),
			})
		}
	})

async function requirePassword(userId: string) {
	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})
	if (!password) {
		throw redirect('/settings/profile/password/create')
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	await requirePassword(userId)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	await requirePassword(userId)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ChangePasswordForm.superRefine(
			async ({ currentPassword, newPassword }, ctx) => {
				if (currentPassword && newPassword) {
					const user = await verifyUserPassword({ id: userId }, currentPassword)
					if (!user) {
						ctx.addIssue({
							path: ['currentPassword'],
							code: z.ZodIssueCode.custom,
							message: i18n._(t`Incorrect password.`),
						})
					}
					const isCommonPassword = await checkIsCommonPassword(newPassword)
					if (isCommonPassword) {
						ctx.addIssue({
							path: ['newPassword'],
							code: 'custom',
							message: i18n._(t`Password is too common`),
						})
					}
				}
			},
		),
	})
	if (submission.status !== 'success') {
		return data(
			{
				result: submission.reply({
					hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { newPassword } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				update: {
					hash: await getPasswordHash(newPassword),
				},
			},
		},
	})

	return redirectWithToast(
		`/settings/profile`,
		{
			type: 'success',
			title: i18n._(t`Password Changed`),
			description: i18n._(t`Your password has been changed.`),
		},
		{ status: 302 },
	)
}

export default function ChangePasswordRoute({
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'password-change-form',
		constraint: getZodConstraint(ChangePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangePasswordForm })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Form method="POST" {...getFormProps(form)} className="mx-auto max-w-md">
			<FieldGroup>
				<Field
					data-invalid={
						fields.currentPassword.errors?.length ? true : undefined
					}
				>
					<FieldLabel htmlFor={fields.currentPassword.id}>
						<Trans>Current Password</Trans>
					</FieldLabel>
					<Input
						{...getInputProps(fields.currentPassword, { type: 'password' })}
						autoComplete="current-password"
						aria-invalid={
							fields.currentPassword.errors?.length ? true : undefined
						}
					/>
					<FieldError
						errors={convertErrorsToFieldFormat(fields.currentPassword.errors)}
					/>
				</Field>

				<Field
					data-invalid={fields.newPassword.errors?.length ? true : undefined}
				>
					<FieldLabel htmlFor={fields.newPassword.id}>
						<Trans>New Password</Trans>
					</FieldLabel>
					<Input
						{...getInputProps(fields.newPassword, { type: 'password' })}
						autoComplete="new-password"
						aria-invalid={fields.newPassword.errors?.length ? true : undefined}
					/>
					<FieldError
						errors={convertErrorsToFieldFormat(fields.newPassword.errors)}
					/>
				</Field>

				<Field
					data-invalid={
						fields.confirmNewPassword.errors?.length ? true : undefined
					}
				>
					<FieldLabel htmlFor={fields.confirmNewPassword.id}>
						<Trans>Confirm New Password</Trans>
					</FieldLabel>
					<Input
						{...getInputProps(fields.confirmNewPassword, { type: 'password' })}
						autoComplete="new-password"
						aria-invalid={
							fields.confirmNewPassword.errors?.length ? true : undefined
						}
					/>
					<FieldError
						errors={convertErrorsToFieldFormat(
							fields.confirmNewPassword.errors,
						)}
					/>
				</Field>

				<ErrorList id={form.errorId} errors={form.errors} />
				<div className="grid w-full grid-cols-2 gap-6">
					<Button variant="secondary" asChild>
						<Link to="..">
							<Trans>Cancel</Trans>
						</Link>
					</Button>
					<StatusButton
						type="submit"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
					>
						<Trans>Change Password</Trans>
					</StatusButton>
				</div>
			</FieldGroup>
		</Form>
	)
}
