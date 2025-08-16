import { useLoaderData } from 'react-router'
import { type User, type Organization, type Image } from '@prisma/client'
import { AdminUsersTable } from '#app/components/admin-users-table'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	const url = new URL(request.url)
	const searchQuery = url.searchParams.get('search') || ''
	const organizationFilter = url.searchParams.get('organization') || ''
	const page = parseInt(url.searchParams.get('page') || '1', 10)
	const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)

	// Build where clause for filtering
	const where: any = {}

	if (searchQuery) {
		where.OR = [
			{ name: { contains: searchQuery } },
			{ email: { contains: searchQuery } },
			{ username: { contains: searchQuery } },
		]
	}

	if (organizationFilter) {
		where.organizations = {
			some: {
				organization: {
					name: { contains: organizationFilter },
				},
			},
		}
	}

	// Get users with pagination
	const [users, totalCount, organizations] = await Promise.all([
		prisma.user.findMany({
			where,
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
				image: {
					select: {
						id: true,
						altText: true,
					},
				},
				organizations: {
					select: {
						organization: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
				sessions: {
					select: {
						createdAt: true,
					},
					orderBy: {
						createdAt: 'desc',
					},
					take: 1,
				},
			},
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		prisma.user.count({ where }),
		prisma.organization.findMany({
			select: {
				id: true,
				name: true,
			},
			orderBy: { name: 'asc' },
		}),
	])

	const totalPages = Math.ceil(totalCount / pageSize)

	return Response.json({
		users: users.map((user) => ({
			...user,
			organizationCount: user.organizations.length,
			lastLoginAt: user.sessions[0]?.createdAt || null,
		})),
		pagination: {
			page,
			pageSize,
			totalCount,
			totalPages,
		},
		organizations,
		filters: {
			search: searchQuery,
			organization: organizationFilter,
		},
	})
}

type LoaderData = {
	users: (Omit<User, 'createdAt' | 'updatedAt' | 'banExpiresAt' | 'bannedAt'> & {
		createdAt: string
		updatedAt: string
		banExpiresAt: string | null
		bannedAt: string | null
		image: Pick<Image, 'id' | 'altText'> | null
		organizations: {
			organization: Pick<Organization, 'id' | 'name'>
		}[]
		organizationCount: number
		lastLoginAt: string | null
	})[]
	pagination: {
		page: number
		pageSize: number
		totalCount: number
		totalPages: number
	}
	organizations: Pick<Organization, 'id' | 'name'>[]
	filters: {
		search: string
		organization: string
	}
}

export default function AdminUsersPage() {
	const data = useLoaderData() as LoaderData

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Users</h1>
				<p className="text-muted-foreground">Manage all users in the system</p>
			</div>

			<AdminUsersTable
				users={data.users}
				organizations={data.organizations}
				pagination={data.pagination}
				filters={data.filters}
			/>
		</div>
	)
}
