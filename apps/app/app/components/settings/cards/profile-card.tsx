import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState } from 'react'
import { useFetcher } from 'react-router'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { EmailChangeForm } from '#app/components/settings/email-form.tsx'

import { NameSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { ProfilePhoto } from './profile-photo'
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	StatusButton,
} from '@repo/ui'

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
				<CardTitle>Profile Settings</CardTitle>
				<CardDescription>
					Update your photo and personal details here.
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-6 pb-0">
				<div className="mb-6 flex flex-col gap-6 md:flex-row">
					<div className="w-32 flex-shrink-0">
						<ProfilePhoto user={user} size="small" />
					</div>
					<div className="flex-grow">
						<fetcher.Form method="POST" {...getFormProps(form)}>
							<div className="flex flex-col">
								<Field
									labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
									inputProps={getInputProps(fields.name, { type: 'text' })}
									errors={fields.name.errors}
								/>
								<Field
									labelProps={{
										htmlFor: fields.username.id,
										children: 'Username',
									}}
									inputProps={getInputProps(fields.username, { type: 'text' })}
									errors={fields.username.errors}
								/>
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="email"
										className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Email
									</label>
									<div className="relative">
										<input
											id="email"
											type="text"
											disabled
											value={user.email}
											className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 pr-[100px] text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
													Change
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Change Email</DialogTitle>
												</DialogHeader>
												<EmailChangeForm setIsOpen={setIsEmailModalOpen} />
											</DialogContent>
										</Dialog>
									</div>
									<p className="text-muted-foreground mt-1 text-sm">
										If you change your email, you'll need to verify the new
										address
									</p>
								</div>
							</div>
							<ErrorList errors={form.errors} id={form.errorId} />
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
					Save changes
				</StatusButton>
			</CardFooter>
		</Card>
	)
}
