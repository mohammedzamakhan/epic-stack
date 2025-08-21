import { invariant } from '@epic-web/invariant'
import { useLoaderData } from 'react-router'
import { AdminOrganizationDetail } from '#app/components/admin-organization-detail'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/$organizationId.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	invariant(params.organizationId, 'Organization ID is required')

	// Get organization with detailed information
	const organization = await prisma.organization.findUnique({
		where: { id: params.organizationId },
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			active: true,
			createdAt: true,
			updatedAt: true,
			planName: true,
			subscriptionStatus: true,
			size: true,
			stripeCustomerId: true,
			stripeSubscriptionId: true,
			stripeProductId: true,
			image: {
				select: {
					id: true,
					altText: true,
				},
			},
			users: {
				select: {
					organizationId: true,
					userId: true,
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
					updatedAt: true,
					department: true,
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							username: true,
							image: {
								select: {
									id: true,
									altText: true,
								},
							},
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			},
			notes: {
				select: {
					id: true,
					title: true,
					createdAt: true,
					updatedAt: true,
					isPublic: true,
					createdBy: {
						select: {
							id: true,
							name: true,
							username: true,
						},
					},
				},
				orderBy: { updatedAt: 'desc' },
				take: 10, // Show recent 10 notes
			},
			integrations: {
				select: {
					id: true,
					providerName: true,
					providerType: true,
					isActive: true,
					lastSyncAt: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: { createdAt: 'desc' },
			},
			invitations: {
				select: {
					id: true,
					email: true,
					organizationRole: {
						select: {
							id: true,
							name: true,
							level: true,
						},
					},
					createdAt: true,
					expiresAt: true,
					inviter: {
						select: {
							id: true,
							name: true,
							username: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			},
			_count: {
				select: {
					users: true,
					notes: true,
					integrations: true,
					invitations: true,
				},
			},
		},
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	// Get recent activity (last 20 activities)
	const recentActivity = await prisma.noteActivityLog.findMany({
		where: {
			note: {
				organizationId: params.organizationId,
			},
		},
		select: {
			id: true,
			action: true,
			createdAt: true,
			metadata: true,
			user: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
			note: {
				select: {
					id: true,
					title: true,
				},
			},
		},
		orderBy: { createdAt: 'desc' },
		take: 20,
	})

	return {
		organization: {
			...organization,
			memberCount: organization.users.filter((u) => u.active).length,
			totalMembers: organization._count.users,
			activeIntegrations: organization.integrations.filter((i) => i.isActive)
				.length,
			totalIntegrations: organization._count.integrations,
			pendingInvitations: organization.invitations.filter(
				(i) => !i.expiresAt || i.expiresAt > new Date(),
			).length,
		},
		recentActivity: recentActivity.map((activity) => ({
			...activity,
			metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
		})),
	}
}

export default function AdminOrganizationDetailPage() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="space-y-6">
			<AdminOrganizationDetail
				organization={data.organization}
				recentActivity={data.recentActivity}
			/>
		</div>
	)
}
