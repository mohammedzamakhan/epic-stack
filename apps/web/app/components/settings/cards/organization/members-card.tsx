import { OrganizationMembers } from '#app/components/organization-members'

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

export function MembersCard({
	members,
	currentUserId,
}: {
	members: OrganizationMember[]
	currentUserId: string
}) {
	return <OrganizationMembers members={members} currentUserId={currentUserId} />
}
