import { invariantResponse } from '@epic-web/invariant'
import { getIpAddressesByUser } from '@repo/common/ip-tracking'
import { prisma } from '@repo/database'
import { useLoaderData } from 'react-router'
import {
	UserDetailView,
	type AdminUserDetail,
	type RecentActivity,
} from '#app/components/admin-user-detail.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

export async function loader({
	request,
	params,
}: {
	request: Request
	params: { userId: string }
}) {
	await requireUserWithRole(request, 'admin')

	const { userId } = params
	invariantResponse(userId, 'User ID is required')

	// Get comprehensive user data
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			username: true,
			createdAt: true,
			updatedAt: true,
			isBanned: true,
			banReason: true,
			banExpiresAt: true,
			bannedAt: true,
			bannedBy: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
			image: {
				select: {
					id: true,
					altText: true,
				},
			},
			organizations: {
				select: {
					organizationRole: {
						select: {
							id: true,
							name: true,
							level: true,
						},
					},
					active: true,
					isDefault: true,
					createdAt: true,
					department: true,
					organization: {
						select: {
							id: true,
							name: true,
							slug: true,
							description: true,
							active: true,
							subscriptionStatus: true,
							planName: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
			},
			sessions: {
				select: {
					id: true,
					createdAt: true,
					expirationDate: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				take: 10,
			},
			connections: {
				select: {
					id: true,
					providerName: true,
					providerId: true,
					createdAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
			},
			roles: {
				select: {
					id: true,
					name: true,
					description: true,
				},
			},
			notes: {
				select: {
					id: true,
					title: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: {
					updatedAt: 'desc',
				},
				take: 5,
			},
			password: {
				select: {
					hash: true,
				},
			},
		},
	})

	invariantResponse(user, 'User not found', { status: 404 })

	// Get activity data (recent notes, comments, etc.)
	const [recentNoteComments, recentActivityLogs] = await Promise.all([
		prisma.noteComment.findMany({
			where: { userId: user.id },
			select: {
				id: true,
				content: true,
				createdAt: true,
				note: {
					select: {
						id: true,
						title: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: 5,
		}),
		prisma.noteActivityLog.findMany({
			where: { userId: user.id },
			select: {
				id: true,
				action: true,
				createdAt: true,
				note: {
					select: {
						id: true,
						title: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: 10,
		}),
	])

	// Get IP addresses used by this user
	const userIpAddresses = await getIpAddressesByUser(user.id)

	return Response.json({
		user: {
			...user,
			hasPassword: !!user.password,
		},
		recentActivity: {
			comments: recentNoteComments,
			activityLogs: recentActivityLogs,
		},
		ipAddresses: userIpAddresses,
	})
}

type LoaderData = {
	user: AdminUserDetail
	recentActivity: RecentActivity
	ipAddresses: Awaited<ReturnType<typeof getIpAddressesByUser>>
}

export default function AdminUserDetailPage() {
	const data = useLoaderData() as LoaderData

	return (
		<div className="space-y-6">
			<UserDetailView
				user={data.user}
				recentActivity={data.recentActivity}
				ipAddresses={data.ipAddresses}
			/>
		</div>
	)
}
