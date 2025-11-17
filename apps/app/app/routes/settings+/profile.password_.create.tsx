import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Trans, t } from '@lingui/macro'
import { i18n } from '@lingui/core'
import { data, redirect, Form, Link } from 'react-router'
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
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { PasswordAndConfirmPasswordSchema } from '@repo/validation'
import { type Route } from './+types/profile.password_.create.ts'
import { BreadcrumbHandle } from './profile.change-email.tsx'

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: (
		<Icon name="more-horizontal">
			<Trans>Password</Trans>
		</Icon>
	),
	getSitemapEntries: () => null,
}

const CreatePasswordForm = PasswordAndConfirmPasswordSchema

async function requireNoPassword(userId: string) {
	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})
	if (password) {
		throw redirect('/settings/profile/password')
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	await requireNoPassword(userId)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	await requireNoPassword(userId)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		async: true,
		schema: CreatePasswordForm.superRefine(async ({ password }, ctx) => {
			const isCommonPassword = await checkIsCommonPassword(password)
			if (isCommonPassword) {
				ctx.addIssue({
					path: ['password'],
					code: 'custom',
					message: i18n._(t`Password is too common`),
				})
			}
		}),
	})
	if (submission.status !== 'success') {
		return data(
			{
				result: submission.reply({
					hideFields: ['password', 'confirmPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { password } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				create: {
					hash: await getPasswordHash(password),
				},
			},
		},
	})

	return redirect(`/settings/profile`, { status: 302 })
}

export default function CreatePasswordRoute({
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'password-create-form',
		constraint: getZodConstraint(CreatePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreatePasswordForm })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<Form method="POST" {...getFormProps(form)} className="mx-auto max-w-md">
			<FieldGroup>
				<Field data-invalid={fields.password.errors?.length ? true : undefined}>
					<FieldLabel htmlFor={fields.password.id}>
						<Trans>New Password</Trans>
					</FieldLabel>
					<Input
						{...getInputProps(fields.password, { type: 'password' })}
						autoComplete="new-password"
						aria-invalid={fields.password.errors?.length ? true : undefined}
					/>
					<FieldError
						errors={convertErrorsToFieldFormat(fields.password.errors)}
					/>
				</Field>

				<Field
					data-invalid={
						fields.confirmPassword.errors?.length ? true : undefined
					}
				>
					<FieldLabel htmlFor={fields.confirmPassword.id}>
						<Trans>Confirm New Password</Trans>
					</FieldLabel>
					<Input
						{...getInputProps(fields.confirmPassword, { type: 'password' })}
						autoComplete="new-password"
						aria-invalid={
							fields.confirmPassword.errors?.length ? true : undefined
						}
					/>
					<FieldError
						errors={convertErrorsToFieldFormat(fields.confirmPassword.errors)}
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
						<Trans>Create Password</Trans>
					</StatusButton>
				</div>
			</FieldGroup>
		</Form>
	)
}
