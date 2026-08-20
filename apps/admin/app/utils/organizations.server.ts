import {
	Permission,
	UserOrganization,
	_OrganizationPermissionToRole,
	and,
	count,
	db,
	desc,
	eq,
	inArray,
} from '@repo/database'
import { type User } from '@repo/database/types'

type OrganizationWithImage = {
	id: string
	name: string
	slug: string
	image?: { id: string; altText?: string | null; objectKey: string } | null
	userCount?: number
}

type UserOrganizationWithRole = {
	organization: OrganizationWithImage
	organizationRole: {
		id: string
		name: string
		level: number
		permissions?: {
			action: string
			entity: string
			access: string
		}[]
	}
	isDefault: boolean
	role?: string
}

async function getMemberships(userId: string, includePermissions = false) {
	const memberships = await db.query.UserOrganization.findMany({
		where: and(
			eq(UserOrganization.userId, userId),
			eq(UserOrganization.active, true),
		),
		with: {
			organization: { with: { images: { limit: 1 } } },
			organizationRole: true,
		},
		orderBy: desc(UserOrganization.createdAt),
	})

	const roleIds = memberships.map(
		(membership) => membership.organizationRole.id,
	)
	const permissions =
		includePermissions && roleIds.length
			? await db
					.select({
						roleId: _OrganizationPermissionToRole.A,
						action: Permission.action,
						entity: Permission.entity,
						access: Permission.access,
					})
					.from(_OrganizationPermissionToRole)
					.innerJoin(
						Permission,
						eq(_OrganizationPermissionToRole.B, Permission.id),
					)
					.where(
						and(
							inArray(_OrganizationPermissionToRole.A, roleIds),
							eq(Permission.context, 'organization'),
						),
					)
			: []

	return memberships.map((membership) => ({
		...membership,
		organization: {
			...membership.organization,
			image: membership.organization.images[0] ?? null,
		},
		organizationRole: {
			...membership.organizationRole,
			...(includePermissions
				? {
						permissions: permissions
							.filter(
								(permission) =>
									permission.roleId === membership.organizationRole.id,
							)
							.map(({ action, entity, access }) => ({
								action,
								entity,
								access,
							})),
					}
				: {}),
		},
	})) as UserOrganizationWithRole[]
}

export async function getUserOrganizations(
	userId: User['id'],
	includePermissions = false,
) {
	return getMemberships(userId, includePermissions)
}

export async function getUserDefaultOrganization(userId: User['id']) {
	const [defaultMembership] = await db.query.UserOrganization.findMany({
		where: and(
			eq(UserOrganization.userId, userId),
			eq(UserOrganization.isDefault, true),
			eq(UserOrganization.active, true),
		),
		with: {
			organization: { with: { images: { limit: 1 } } },
			organizationRole: true,
		},
		limit: 1,
	})
	const membership =
		defaultMembership ??
		(await db.query.UserOrganization.findFirst({
			where: and(
				eq(UserOrganization.userId, userId),
				eq(UserOrganization.active, true),
			),
			with: {
				organization: { with: { images: { limit: 1 } } },
				organizationRole: true,
			},
		}))

	if (!membership) return null

	const [userCount] = await db
		.select({ count: count() })
		.from(UserOrganization)
		.where(
			and(
				eq(UserOrganization.organizationId, membership.organizationId),
				eq(UserOrganization.active, true),
			),
		)

	return {
		...membership,
		organization: {
			...membership.organization,
			image: membership.organization.images[0] ?? null,
			userCount: userCount?.count ?? 0,
		},
	} as UserOrganizationWithRole
}
