import { useLoaderData } from 'react-router'
import { AdminOrganizationsTable } from '#app/components/admin-organizations-table'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	const url = new URL(request.url)
	const searchQuery = url.searchParams.get('search') || ''
	const subscriptionStatusFilter =
		url.searchParams.get('subscriptionStatus') || ''
	const planFilter = url.searchParams.get('plan') || ''
	const page = parseInt(url.searchParams.get('page') || '1', 10)
	const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)

	// Build where clause for filtering
	const where: any = {}

	if (searchQuery) {
		where.OR = [
			{ name: { contains: searchQuery } },
			{ slug: { contains: searchQuery } },
			{ description: { contains: searchQuery } },
		]
	}

	if (subscriptionStatusFilter) {
		where.subscriptionStatus = subscriptionStatusFilter
	}

	if (planFilter) {
		where.planName = planFilter
	}

	// Get organizations with pagination
	const [organizations, totalCount, subscriptionStatuses, planNames] =
		await Promise.all([
			prisma.organization.findMany({
				where,
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
					image: {
						select: {
							id: true,
							altText: true,
						},
					},
					_count: {
						select: {
							users: true,
							notes: true,
							integrations: true,
						},
					},
					users: {
						select: {
							active: true,
						},
					},
					integrations: {
						select: {
							isActive: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			prisma.organization.count({ where }),
			// Get unique subscription statuses
			prisma.organization.findMany({
				select: { subscriptionStatus: true },
				where: { subscriptionStatus: { not: null } },
				distinct: ['subscriptionStatus'],
			}),
			// Get unique plan names
			prisma.organization.findMany({
				select: { planName: true },
				where: { planName: { not: null } },
				distinct: ['planName'],
			}),
		])

	const totalPages = Math.ceil(totalCount / pageSize)

	return {
		organizations: organizations.map((org) => ({
			...org,
			memberCount: org.users.filter((u) => u.active).length,
			totalMembers: org._count.users,
			noteCount: org._count.notes,
			activeIntegrations: org.integrations.filter((i) => i.isActive).length,
			totalIntegrations: org._count.integrations,
		})),
		pagination: {
			page,
			pageSize,
			totalCount,
			totalPages,
		},
		subscriptionStatuses: subscriptionStatuses
			.map((s) => s.subscriptionStatus)
			.filter(Boolean)
			.sort(),
		planNames: planNames
			.map((p) => p.planName)
			.filter(Boolean)
			.sort(),
		filters: {
			search: searchQuery,
			subscriptionStatus: subscriptionStatusFilter,
			plan: planFilter,
		},
	}
}

export default function AdminOrganizationsPage() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
				<p className="text-muted-foreground">
					Manage all organizations in the system
				</p>
			</div>

			<AdminOrganizationsTable
				organizations={data.organizations}
				subscriptionStatuses={data.subscriptionStatuses}
				planNames={data.planNames}
				pagination={data.pagination}
				filters={data.filters}
			/>
		</div>
	)
}
