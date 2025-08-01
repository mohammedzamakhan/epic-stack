import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
	getFieldsetProps,
	type FieldMetadata,
	FormProvider,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms'
import { Badge } from '#app/components/ui/badge'
import { Button } from '#app/components/ui/button'
import { Card, CardContent } from '#app/components/ui/card'
import { Icon } from '#app/components/ui/icon'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { Separator } from '#app/components/ui/separator'

const roles = [
	{
		value: 'admin',
		label: 'Admin',
		description: 'Full access to organization settings and member management.',
	},
	{
		value: 'member',
		label: 'Member',
		description: 'Standard organization member with basic permissions.',
	},
]

const InviteSchema = z.object({
	invites: z
		.array(
			z.object({
				email: z.string().email('Invalid email address'),
				role: z.enum(['admin', 'member']),
			}),
		)
		.min(1, 'At least one invite is required'),
})

export function OrganizationInvitations({
	pendingInvitations = [],
	actionData,
}: {
	pendingInvitations?: Array<{
		id: string
		email: string
		role: string
		createdAt: Date
		inviter?: { name: string | null; email: string } | null
	}>
	actionData?: any
}) {
	const [form, fields] = useForm({
		id: 'invite-form',
		constraint: getZodConstraint(InviteSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: InviteSchema })
		},
		defaultValue: {
			invites: [{ email: '', role: 'member' }],
		},
		shouldRevalidate: 'onBlur',
	})

	const invitesList = fields.invites.getFieldList()

	return (
		<Card>
			<CardContent className="space-y-6">
				{/* Invitation Form */}
				<FormProvider context={form.context}>
					<Form method="POST" {...getFormProps(form)}>
						<input type="hidden" name="intent" value="send-invitations" />
						<div className="space-y-1">
							{invitesList.map((invite, index) => (
								<InviteFieldset
									key={invite.key}
									meta={invite}
									fields={fields}
									form={form}
									index={index}
								/>
							))}

							<Button
								variant="outline"
								className="w-full"
								{...form.insert.getButtonProps({
									name: fields.invites.name,
									defaultValue: { email: '', role: 'member' },
								})}
							>
								<Icon name="plus" className="mr-2 h-4 w-4" />
								Add another invitation
							</Button>
						</div>

						<div className="mt-6 space-y-2">
							<ErrorList id={form.errorId} errors={form.errors} />
							<Button type="submit" className="w-full">
								Send Invitations
							</Button>
						</div>
					</Form>
				</FormProvider>

				{/* Pending Invitations */}
				{pendingInvitations.length > 0 && (
					<>
						<Separator />
						<div>
							<h4 className="mb-3 text-sm font-medium">Pending Invitations</h4>
							<div className="space-y-2">
								{pendingInvitations.map((invitation) => (
									<div
										key={invitation.id}
										className="flex items-center justify-between rounded-lg border p-3"
									>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium">
													{invitation.email}
												</span>
												<Badge variant="secondary" className="text-xs">
													{invitation.role}
												</Badge>
											</div>
											{invitation.inviter && (
												<p className="text-muted-foreground mt-1 text-xs">
													Invited by{' '}
													{invitation.inviter.name || invitation.inviter.email}
												</p>
											)}
										</div>
										<Form method="POST">
											<input
												type="hidden"
												name="intent"
												value="remove-invitation"
											/>
											<input
												type="hidden"
												name="invitationId"
												value={invitation.id}
											/>
											<Button type="submit" variant="ghost" size="sm">
												<Icon name="trash" className="h-4 w-4" />
											</Button>
										</Form>
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}

function InviteFieldset({
	meta,
	fields,
	form,
	index,
}: {
	meta: FieldMetadata<
		{
			email: string
			role: string
		},
		{
			invites: {
				email: string
				role: string
			}[]
		},
		string[]
	>
	fields: Required<{
		invites: FieldMetadata<
			{
				email: string
				role: string
			}[],
			{
				invites: {
					email: string
					role: string
				}[]
			},
			string[]
		>
	}>
	form: any
	index: number
}) {
	const inviteFields = meta.getFieldset()
	const role = useInputControl(inviteFields.role)
	const { key, ...emailProps } = getInputProps(inviteFields.email, {
		type: 'email',
	})

	return (
		<div>
			<fieldset className="w-full" {...getFieldsetProps(meta)}>
				<div className="flex w-full items-start space-x-2">
					<Field
						labelProps={{ children: '', 'aria-label': 'Email' }}
						inputProps={{
							...emailProps,
							placeholder: 'Enter email address',
							className: 'flex-1',
						}}
						className="w-full"
						errors={inviteFields.email.errors}
					/>

					<div className="min-w-[120px]">
						<Select
							name={inviteFields.role.name}
							value={role.value}
							onValueChange={(value) => {
								role.change(value)
							}}
							onOpenChange={(open) => {
								if (!open) {
									role.blur()
								}
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue>
									{roles.find((r) => r.value === role.value)?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{roles.map((roleOption) => (
									<SelectItem key={roleOption.value} value={roleOption.value}>
										<div className="flex flex-col">
											<span className="font-medium">{roleOption.label}</span>
											<span className="text-muted-foreground text-xs">
												{roleOption.description}
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{index > 0 && (
						<Button
							variant="ghost"
							size="icon"
							{...form.remove.getButtonProps({
								name: fields.invites.name,
								index,
							})}
						>
							<Icon name="trash" className="h-4 w-4" />
						</Button>
					)}
				</div>
				<ErrorList id={meta.errorId} errors={meta.errors} />
			</fieldset>
		</div>
	)
}
