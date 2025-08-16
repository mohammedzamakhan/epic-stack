import { useState } from 'react'
import { Form } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '#app/components/ui/avatar'
import { Badge } from '#app/components/ui/badge'
import { Button } from '#app/components/ui/button'
import { Card, CardContent } from '#app/components/ui/card'
import { Icon } from '#app/components/ui/icon'
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '#app/components/ui/select'
import { getUserImgSrc } from '#app/utils/misc'

interface OrganizationMember {
	userId: string
	role: string
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
	const isAdmin = currentMember?.role === 'admin' && currentMember.active
	const isSelf = member.userId === currentUserId
	const [role, setRole] = useState(member.role)

	if (!isAdmin || isSelf) {
		return (
			<Badge
				variant={member.role === 'admin' ? 'default' : 'secondary'}
				className="text-xs"
			>
				{member.role === 'admin' && (
					<Icon name="settings" className="mr-1 h-3 w-3" />
				)}
				{member.role === 'member' && (
					<Icon name="user" className="mr-1 h-3 w-3" />
				)}
				{member.role}
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
				defaultValue={member.role}
				value={role}
				onValueChange={setRole}
			>
				<SelectTrigger size="sm" className="w-28">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="admin">Admin</SelectItem>
					<SelectItem value="member">Member</SelectItem>
				</SelectContent>
			</Select>
			<Button type="submit" variant="outline" size="sm">
				Save
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
					<p className="text-muted-foreground text-sm">No members found.</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardContent>
				<div className="space-y-3">
					{members.map((member) => (
						<div
							key={member.userId}
							className="flex items-center justify-between rounded-lg border p-3"
						>
							<div className="flex w-full items-center justify-between gap-3">
								<div className="flex items-center gap-3">
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

									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium">
												{member.user.name || member.user.email}
											</span>
											{member.userId === currentUserId && (
												<Badge variant="outline" className="text-xs">
													You
												</Badge>
											)}
										</div>
										{member.user.name && (
											<p className="text-muted-foreground text-xs">
												{member.user.email}
											</p>
										)}
									</div>
								</div>

								<div className="flex items-center gap-2">
									<OrganizationMemberRoleEditor
										member={member}
										currentUserId={currentUserId}
										members={members}
									/>
									{member.userId !== currentUserId && (
										<Form method="POST">
											<input
												type="hidden"
												name="intent"
												value="remove-member"
											/>
											<input
												type="hidden"
												name="userId"
												value={member.userId}
											/>
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
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
