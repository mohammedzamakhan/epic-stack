import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
	getFieldsetProps,
	type FieldMetadata,
	FormProvider,
} from '@conform-to/react'
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Icon,
	Input,
	Separator,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState } from 'react'
import { Form } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms'
import { type OrganizationRoleName } from '#app/utils/organizations.server'

// Create role descriptions map
const ROLE_DESCRIPTIONS: Record<string, string> = {
	admin: 'Full access to organization settings and member management.',
	member: 'Standard organization member with basic permissions.',
	viewer: 'Read-only access to organization content.',
	guest: 'Limited access for temporary collaborators.',
}

// Create dynamic invite schema based on available roles
function createInviteSchema(availableRoles: OrganizationRoleName[]) {
	return z.object({
		invites: z
			.array(
				z.object({
					email: z.string().email('Invalid email address'),
					role: z.enum(availableRoles as [OrganizationRoleName, ...OrganizationRoleName[]]),
				}),
			)
			.min(1, 'At least one invite is required'),
	})
}

export function OrganizationInvitations({
	pendingInvitations = [],
	inviteLink,
	actionData,
	availableRoles = ['admin', 'member'], // Default fallback for backwards compatibility
}: {
	pendingInvitations?: Array<{
		id: string
		email: string
		organizationRole: {
			id: string
			name: string
		}
		createdAt: Date
		inviter?: { name: string | null; email: string } | null
	}>
	inviteLink?: {
		id: string
		token: string
		organizationRole: {
			id: string
			name: string
		}
		isActive: boolean
		createdAt: Date
	} | null
	actionData?: any
	availableRoles?: OrganizationRoleName[]
}) {
	// Create dynamic schema and roles based on available roles
	const InviteSchema = createInviteSchema(availableRoles)
	const roles = availableRoles.map(role => ({
		value: role,
		label: role.charAt(0).toUpperCase() + role.slice(1),
		description: ROLE_DESCRIPTIONS[role] || `${role} role`,
	}))

	const [form, fields] = useForm({
		id: 'invite-form',
		constraint: getZodConstraint(InviteSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: InviteSchema })
		},
		defaultValue: {
			invites: [{ email: '', role: availableRoles[0] || 'member' }], // Use first available role as default
		},
		shouldRevalidate: 'onBlur',
	})

	const invitesList = fields.invites.getFieldList()
	const [linkCopied, setLinkCopied] = useState(false)

	const inviteUrl = inviteLink?.isActive
		? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteLink.token}`
		: ''

	const copyInviteLink = async () => {
		if (inviteUrl) {
			try {
				await navigator.clipboard.writeText(inviteUrl)
				setLinkCopied(true)
				setTimeout(() => setLinkCopied(false), 2000)
			} catch (error) {
				console.error('Failed to copy link:', error)
				// Fallback for browsers that don't support clipboard API
				const textArea = document.createElement('textarea')
				textArea.value = inviteUrl
				document.body.appendChild(textArea)
				textArea.select()
				document.execCommand('copy')
				document.body.removeChild(textArea)
				setLinkCopied(true)
				setTimeout(() => setLinkCopied(false), 2000)
			}
		}
	}

	return (
		<div className="space-y-6">
			{/* Invite Link Section */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Your personal invite link</CardTitle>
					<p className="text-muted-foreground text-sm">
						Anyone with this link can join your organization and will know you
						invited them. By default, they will have the Member role.
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							value={inviteUrl || 'No active invite link'}
							readOnly
							onClick={inviteUrl ? copyInviteLink : undefined}
							className={`flex-1 ${inviteUrl ? 'cursor-pointer' : 'cursor-not-allowed'}`}
						/>
						{inviteUrl && (
							<Button
								variant="outline"
								onClick={copyInviteLink}
								className="shrink-0"
							>
								{linkCopied ? (
									<>
										<Icon name="check" className="h-4 w-4" />
										Copied
									</>
								) : (
									<>
										<Icon name="copy" className="h-4 w-4" />
										Copy
									</>
								)}
							</Button>
						)}
					</div>
					<div className="flex gap-2">
						{!inviteLink?.isActive ? (
							<Form method="POST">
								<input type="hidden" name="intent" value="create-invite-link" />
								<Button type="submit" variant="outline">
									<Icon name="plus" className="h-4 w-4" />
									Create Link
								</Button>
							</Form>
						) : (
							<>
								<Form method="POST">
									<input
										type="hidden"
										name="intent"
										value="reset-invite-link"
									/>
									<Button type="submit" variant="outline">
										<Icon name="undo-2" className="h-4 w-4" />
										Reset
									</Button>
								</Form>
								<Form method="POST">
									<input
										type="hidden"
										name="intent"
										value="deactivate-invite-link"
									/>
									<Button type="submit" variant="outline">
										<Icon name="x" className="h-4 w-4" />
										Disable
									</Button>
								</Form>
							</>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Email Invitations Section */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Invite by email</CardTitle>
				</CardHeader>
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
										roles={roles}
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
									<Icon name="plus" className="h-4 w-4" />
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
								<h4 className="mb-3 text-sm font-medium">
									Pending Invitations
								</h4>
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
														{invitation.organizationRole.name}
													</Badge>
												</div>
												{invitation.inviter && (
													<p className="text-muted-foreground mt-1 text-xs">
														Invited by{' '}
														{invitation.inviter.name ||
															invitation.inviter.email}
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
													<Icon name="trash-2" className="h-4 w-4" />
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
		</div>
	)
}

function InviteFieldset({
	meta,
	fields,
	form,
	index,
	roles,
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
	roles: Array<{
		value: string
		label: string
		description: string
	}>
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
							<Icon name="trash-2" className="h-4 w-4" />
						</Button>
					)}
				</div>
				<ErrorList id={meta.errorId} errors={meta.errors} />
			</fieldset>
		</div>
	)
}
