import { Trans } from '@lingui/macro'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from '@repo/ui/item'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import { useState } from 'react'
import { Form } from 'react-router'

import { getUserImgSrc } from '#app/utils/misc.tsx'

interface OrganizationMember {
	userId: string
	organizationRole: {
		id: string
		name: string
		level: number
	}
	active: boolean
	user: {
		id: string
		name: string | null
		email: string
		image?: {
			id: string
			altText: string | null
		} | null
	}
}

function OrganizationMemberRoleEditor({
	member,
	currentUserId,
	members,
}: {
	member: OrganizationMember
	currentUserId: string
	members: OrganizationMember[]
}) {
	const currentMember = members.find((m) => m.userId === currentUserId)
	const isAdmin =
		currentMember?.organizationRole.name === 'admin' && currentMember.active
	const isSelf = member.userId === currentUserId
	const [role, setRole] = useState(member.organizationRole.name)

	if (!isAdmin || isSelf) {
		return (
			<Badge
				variant={
					member.organizationRole.name === 'admin' ? 'default' : 'secondary'
				}
				className="text-xs"
			>
				{member.organizationRole.name === 'admin' && (
					<Icon name="settings" className="mr-1 h-3 w-3" />
				)}
				{member.organizationRole.name === 'member' && (
					<Icon name="user" className="mr-1 h-3 w-3" />
				)}
				{member.organizationRole.name}
			</Badge>
		)
	}

	return (
		<Form method="POST" className="flex items-center gap-2">
			<input type="hidden" name="intent" value="update-member-role" />
			<input type="hidden" name="userId" value={member.userId} />
			<input type="hidden" name="role" value={role} />
			<Select
				name="role"
				defaultValue={member.organizationRole.name}
				value={role}
				onValueChange={(value) => setRole(value as string)}
			>
				<SelectTrigger size="sm" className="w-28">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="admin">
						<Trans>Admin</Trans>
					</SelectItem>
					<SelectItem value="member">
						<Trans>Member</Trans>
					</SelectItem>
				</SelectContent>
			</Select>
			<Button type="submit" variant="outline" size="sm">
				<Trans>Save</Trans>
			</Button>
		</Form>
	)
}

export function OrganizationMembers({
	members = [],
	currentUserId,
}: {
	members?: OrganizationMember[]
	currentUserId: string
}) {
	if (members.length === 0) {
		return (
			<Card>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						<Trans>No members found.</Trans>
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Trans>Members</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>Manage your organization's members.</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{members.map((member) => (
						<Item key={member.userId} variant="outline" size="sm">
							<ItemMedia>
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={getUserImgSrc(member.user.image?.id)}
										alt={member.user.name ?? member.user.email}
									/>
									<AvatarFallback>
										{(member.user.name ?? member.user.email)
											.charAt(0)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</ItemMedia>
							<ItemContent>
								<ItemTitle>
									{member.user.name || member.user.email}
									{member.userId === currentUserId && (
										<Badge variant="outline" className="text-xs">
											<Trans>You</Trans>
										</Badge>
									)}
								</ItemTitle>
								{member.user.name && (
									<ItemDescription>{member.user.email}</ItemDescription>
								)}
							</ItemContent>
							<ItemActions>
								<OrganizationMemberRoleEditor
									member={member}
									currentUserId={currentUserId}
									members={members}
								/>
								{member.userId !== currentUserId && (
									<Form method="POST">
										<input type="hidden" name="intent" value="remove-member" />
										<input type="hidden" name="userId" value={member.userId} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											className="text-destructive hover:text-destructive"
										>
											<Icon name="trash-2" className="h-4 w-4" />
										</Button>
									</Form>
								)}
							</ItemActions>
						</Item>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
