import { prisma } from '@repo/database'
import { data } from 'react-router'
import { requireAuth } from '#app/utils/jwt.server.ts'
import { type Route } from './+types/organizations.ts'

export async function loader({ request }: Route.LoaderArgs) {
	try {
		// Verify JWT token and get user info
		const payload = requireAuth(request)

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: { id: payload.sub },
			select: { id: true, email: true, username: true },
		})

		if (!user) {
			return data(
				{
					success: false,
					error: 'user_not_found',
					message: 'User not found',
				},
				{ status: 404 },
			)
		}

		const userOrganizations = await prisma.userOrganization.findMany({
			where: {
				userId: payload.sub,
				active: true,
			},
			select: {
				isDefault: true,
				organization: {
					select: {
						id: true,
						name: true,
						slug: true,
						description: true,
						active: true,
						createdAt: true,
						updatedAt: true,
						image: {
							select: {
								id: true,
								objectKey: true,
							},
						},
					},
				},
				organizationRole: {
					select: {
						id: true,
						name: true,
						level: true,
					},
				},
			},
			orderBy: [{ isDefault: 'desc' }, { organization: { name: 'asc' } }],
		})

		const organizations = userOrganizations.map((userOrg) => ({
			id: userOrg.organization.id,
			name: userOrg.organization.name,
			slug: userOrg.organization.slug,
			description: userOrg.organization.description,
			active: userOrg.organization.active,
			isDefault: userOrg.isDefault,
			role: {
				id: userOrg.organizationRole.id,
				name: userOrg.organizationRole.name,
				level: userOrg.organizationRole.level,
			},
			image: userOrg.organization.image?.objectKey,
			createdAt: userOrg.organization.createdAt.toISOString(),
			updatedAt: userOrg.organization.updatedAt.toISOString(),
		}))

		return data({
			success: true,
			data: { organizations },
		})
	} catch (error) {
		if (error instanceof Error && error.message.includes('authorization')) {
			return data(
				{
					success: false,
					error: 'unauthorized',
					message: 'Authentication required',
				},
				{ status: 401 },
			)
		}

		console.error('Organizations API error:', error)
		return data(
			{
				success: false,
				error: 'internal_error',
				message: 'Failed to fetch organizations',
			},
			{ status: 500 },
		)
	}
}

export async function action() {
	return data(
		{
			success: false,
			error: 'method_not_allowed',
			message: 'Use GET method to fetch organizations',
		},
		{ status: 405 },
	)
}
