import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/dialog'
import { Field, FieldLabel, FieldError, FieldGroup } from '@repo/ui/field'
import { Input } from '@repo/ui/input'
import { StatusButton } from '@repo/ui/status-button'
import { NameSchema, UsernameSchema } from '@repo/validation'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'
import { EmailChangeForm } from '#app/components/settings/email-form.tsx'
import { ProfilePhoto } from './profile-photo'

export const ProfileFormSchema = z.object({
	name: NameSchema.nullable().default(null),
	username: UsernameSchema,
})

export const profileUpdateActionIntent = 'update-profile'
export const changeEmailActionIntent = 'change-email'

interface ProfileCardProps {
	user: {
		username: string
		name: string | null
		email: string
	}
}

export function ProfileCard({ user }: ProfileCardProps) {
	const fetcher = useFetcher()
	const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
	const { _: ignored_ } = useLingui()

	const [form, fields] = useForm({
		id: 'edit-profile',
		constraint: getZodConstraint(ProfileFormSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProfileFormSchema })
		},
		defaultValue: {
			username: user.username,
			name: user.name,
		},
	})

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle><Trans>Profile Settings</Trans></CardTitle>
				<CardDescription>
					<Trans>Update your photo and personal details here.</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-6 pb-0">
				<div className="mb-6 flex flex-col gap-6 md:flex-row">
					<div className="w-32 flex-shrink-0">
						<ProfilePhoto user={user} size="small" />
					</div>
					<div className="flex-grow">
						<fetcher.Form method="POST" {...getFormProps(form)}>
							<FieldGroup>
								<Field
									data-invalid={fields.name.errors?.length ? true : undefined}
								>
									<FieldLabel htmlFor={fields.name.id}><Trans>Name</Trans></FieldLabel>
									<Input
										{...getInputProps(fields.name, { type: 'text' })}
										aria-invalid={fields.name.errors?.length ? true : undefined}
									/>
									<FieldError
										errors={convertErrorsToFieldFormat(fields.name.errors)}
									/>
								</Field>

								<Field
									data-invalid={
										fields.username.errors?.length ? true : undefined
									}
								>
									<FieldLabel htmlFor={fields.username.id}><Trans>Username</Trans></FieldLabel>
									<Input
										{...getInputProps(fields.username, { type: 'text' })}
										aria-invalid={
											fields.username.errors?.length ? true : undefined
										}
									/>
									<FieldError
										errors={convertErrorsToFieldFormat(fields.username.errors)}
									/>
								</Field>

								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="email"
										className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										<Trans>Email</Trans>
									</label>
									<div className="relative">
										<Input
											id="email"
											type="text"
											disabled
											value={user.email}
											className="pr-[100px]"
										/>
										<Dialog
											open={isEmailModalOpen}
											onOpenChange={setIsEmailModalOpen}
										>
											<DialogTrigger asChild>
												<Button
													variant="outline"
													size="sm"
													className="absolute top-1/2 right-1 -translate-y-1/2"
												>
													<Trans>Change</Trans>
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle><Trans>Change Email</Trans></DialogTitle>
												</DialogHeader>
												<EmailChangeForm setIsOpen={setIsEmailModalOpen} />
											</DialogContent>
										</Dialog>
									</div>
									<p className="text-muted-foreground mt-1 text-sm">
										<Trans>
											If you change your email, you'll need to verify the new
											address
										</Trans>
									</p>
								</div>

								<ErrorList errors={form.errors} id={form.errorId} />
							</FieldGroup>
						</fetcher.Form>
					</div>
				</div>
			</CardContent>
			<CardFooter className="justify-end">
				<StatusButton
					size="sm"
					form="edit-profile"
					type="submit"
					name="intent"
					value={profileUpdateActionIntent}
					status={
						fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')
					}
				>
					<Trans>Save changes</Trans>
				</StatusButton>
			</CardFooter>
		</Card>
	)
}
