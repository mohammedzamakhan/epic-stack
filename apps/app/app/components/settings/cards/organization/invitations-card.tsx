import { OrganizationInvitations } from '#app/components/organization-invitations'
import { type OrganizationRoleName } from '#app/utils/organizations.server'

interface OrganizationInvitation {
	id: string
	email: string
	organizationRole: {
		id: string
		name: string
	}
	createdAt: Date
	inviter?: { name: string | null; email: string } | null
}

interface OrganizationInviteLink {
	id: string
	token: string
	organizationRole: {
		id: string
		name: string
	}
	isActive: boolean
	createdAt: Date
}

export function InvitationsCard({
	pendingInvitations,
	inviteLink,
	actionData,
	availableRoles,
}: {
	pendingInvitations: OrganizationInvitation[]
	inviteLink?: OrganizationInviteLink | null
	actionData?: any
	availableRoles?: OrganizationRoleName[]
}) {
	return (
		<OrganizationInvitations
			pendingInvitations={pendingInvitations}
			inviteLink={inviteLink}
			actionData={actionData}
			availableRoles={availableRoles}
		/>
	)
}
