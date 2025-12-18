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
import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@repo/ui/input-group'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from '@repo/ui/item'
import { Separator } from '@repo/ui/separator'
import { useState } from 'react'
import { Form } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { type OrganizationRoleName } from '#app/utils/organizations.server.ts'

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
					role: z.enum(
						availableRoles as [OrganizationRoleName, ...OrganizationRoleName[]],
					),
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
	const { _ } = useLingui()
	// Create dynamic schema and roles based on available roles
	const InviteSchema = createInviteSchema(availableRoles)
	const roles = availableRoles.map((role) => ({
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
					<CardTitle className="text-lg">
						<Trans>Your personal invite link</Trans>
					</CardTitle>
					<p className="text-muted-foreground text-sm">
						<Trans>
							Anyone with this link can join your organization and will know you
							invited them. By default, they will have the Member role.
						</Trans>
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							value={inviteUrl || _(msg`No active invite link`)}
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
										<Trans>Copied</Trans>
									</>
								) : (
									<>
										<Icon name="copy" className="h-4 w-4" />
										<Trans>Copy</Trans>
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
									<Trans>Create Link</Trans>
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
										<Trans>Reset</Trans>
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
										<Trans>Disable</Trans>
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
					<CardTitle className="text-lg">
						<Trans>Invite by email</Trans>
					</CardTitle>
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
									onClick={() => {
										form.insert({
											name: fields.invites.name,
											defaultValue: { email: '', role: 'member' },
										})
									}}
								>
									<Icon name="plus" className="h-4 w-4" />
									<Trans>Add another invitation</Trans>
								</Button>
							</div>

							<div className="mt-6 space-y-2">
								<ErrorList id={form.errorId} errors={form.errors} />
								<Button type="submit" className="w-full">
									<Trans>Send Invitations</Trans>
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
									<Trans>Pending Invitations</Trans>
								</h4>
								<ItemGroup>
									{pendingInvitations.map((invitation) => (
										<Item key={invitation.id} variant="outline" size="sm">
											<ItemContent>
												<ItemTitle>
													<span>{invitation.email}</span>
													<Badge variant="secondary" className="text-xs">
														{invitation.organizationRole.name}
													</Badge>
												</ItemTitle>
												{invitation.inviter && (
													<ItemDescription>
														<Trans>
															Invited by{' '}
															{invitation.inviter.name ||
																invitation.inviter.email}
														</Trans>
													</ItemDescription>
												)}
											</ItemContent>
											<ItemActions>
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
											</ItemActions>
										</Item>
									))}
								</ItemGroup>
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
	const { _ } = useLingui()
	const inviteFields = meta.getFieldset()
	const role = useInputControl(inviteFields.role)
	const { key: _key, ...emailProps } = getInputProps(inviteFields.email, {
		type: 'email',
	})

	return (
		<div>
			<fieldset className="mb-2 w-full" {...getFieldsetProps(meta)}>
				<InputGroup className="w-full">
					<InputGroupInput
						{...emailProps}
						placeholder={_(msg`Enter email address`)}
						aria-label={_(msg`Email`)}
						aria-invalid={
							inviteFields.email.errors?.length ? 'true' : undefined
						}
					/>

					<InputGroupAddon
						className="gap-0 rounded-r-lg py-1 pr-1.5"
						align="inline-end"
					>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<InputGroupButton variant="ghost">
										{roles.find((r) => r.value === role.value)?.label}
										<Icon name="chevron-down" />
									</InputGroupButton>
								}
							></DropdownMenuTrigger>
							<DropdownMenuContent className="w-[250px]" side="top" align="end">
								{roles.map((roleOption) => (
									<DropdownMenuItem
										key={roleOption.value}
										onClick={() => role.change(roleOption.value)}
										className="group"
									>
										<div className="flex flex-col">
											<span className="font-medium">{roleOption.label}</span>
											<span className="text-muted-foreground group-data-[highlighted]:text-accent-foreground text-xs">
												{roleOption.description}
											</span>
										</div>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						{index > 0 && (
							<InputGroupButton
								variant="ghost"
								size="icon-sm"
								type="button"
								onClick={() =>
									form.remove({ name: fields.invites.name, index })
								}
							>
								<Icon name="trash-2" className="h-4 w-4" />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
				<ErrorList id={meta.errorId} errors={meta.errors} />
			</fieldset>
		</div>
	)
}
