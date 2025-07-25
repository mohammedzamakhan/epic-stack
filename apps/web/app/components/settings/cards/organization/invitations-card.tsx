import { OrganizationInvitations } from '#app/components/organization-invitations'

interface OrganizationInvitation {
	id: string
	email: string
	role: string
	createdAt: Date
	inviter?: { name: string | null; email: string } | null
}

export function InvitationsCard({
	pendingInvitations,
	actionData,
}: {
	pendingInvitations: OrganizationInvitation[]
	actionData?: any
}) {
	return (
		<OrganizationInvitations
			pendingInvitations={pendingInvitations}
			actionData={actionData}
		/>
	)
}
