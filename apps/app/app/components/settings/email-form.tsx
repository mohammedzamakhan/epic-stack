import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'

import { changeEmailActionIntent } from '#app/routes/_app+/profile.tsx'
import { EmailSchema } from '@repo/validation'
import { Button } from '@repo/ui/button'
import { StatusButton } from '@repo/ui/status-button'
import { Field, FieldLabel, FieldError, FieldGroup } from '@repo/ui/field'
import { Input } from '@repo/ui/input'

export const ChangeEmailSchema = z.object({
	email: EmailSchema,
})

export function EmailChangeForm({
	setIsOpen,
}: {
	setIsOpen: (open: boolean) => void
}) {
	const fetcher = useFetcher()

	const [form, fields] = useForm({
		id: 'change-email-form',
		constraint: getZodConstraint(ChangeEmailSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangeEmailSchema })
		},
	})

	if (fetcher.data?.status === 'success') {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-sm">
					A verification email has been sent to{' '}
					<strong>{fetcher.data.verificationInfo.email}</strong>. Please check
					your inbox and follow the instructions to verify your new email
					address.
				</p>
				<p className="text-sm">
					Verification code:{' '}
					<strong>{fetcher.data.verificationInfo.otp}</strong>
				</p>
				<div className="mt-4 flex justify-end">
					<Button onClick={() => setIsOpen(false)}>Close</Button>
				</div>
			</div>
		)
	}

	return (
		<fetcher.Form method="POST" {...getFormProps(form)}>
			<input type="hidden" name="intent" value={changeEmailActionIntent} />
			<FieldGroup>
				<Field data-invalid={fields.email.errors?.length ? true : undefined}>
					<FieldLabel htmlFor={fields.email.id}>New Email</FieldLabel>
					<Input
						{...getInputProps(fields.email, { type: 'email' })}
						autoComplete="email"
						aria-invalid={fields.email.errors?.length ? true : undefined}
					/>
					<FieldError
						errors={convertErrorsToFieldFormat(fields.email.errors)}
					/>
				</Field>
				<ErrorList id={form.errorId} errors={form.errors} />
				<div className="mt-4 flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						onClick={() => setIsOpen(false)}
					>
						Cancel
					</Button>
					<StatusButton
						type="submit"
						status={
							fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')
						}
					>
						Save
					</StatusButton>
				</div>
			</FieldGroup>
		</fetcher.Form>
	)
}
