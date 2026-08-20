import { faker } from '@faker-js/faker'
import { db, Organization, UserOrganization } from '@repo/database'

export async function createTestOrganization(
	userId: string,
	role: 'admin' | 'member' | 'viewer' | 'guest' = 'admin',
) {
	const name = faker.company.name()
	const [organization] = await db
		.insert(Organization)
		.values({
			name,
			slug: `${faker.helpers.slugify(name).toLowerCase()}-${Date.now()}-${faker.string.alphanumeric(4)}`,
			description: faker.company.catchPhrase(),
		})
		.returning()
	if (!organization) throw new Error('Failed to create test organization')
	await db.insert(UserOrganization).values({
		userId,
		organizationId: organization.id,
		organizationRoleId: `org_role_${role}`,
	})
	return organization
}

export async function createTestOrganizationWithMultipleUsers(
	users: Array<{
		userId: string
		role?: 'admin' | 'member' | 'viewer' | 'guest'
	}>,
) {
	const organization = await createTestOrganization(
		users[0]?.userId ?? '',
		users[0]?.role ?? 'member',
	)
	if (users.length > 1) {
		await db.insert(UserOrganization).values(
			users.slice(1).map((user) => ({
				userId: user.userId,
				organizationId: organization.id,
				organizationRoleId: `org_role_${user.role || 'member'}`,
			})),
		)
	}
	return organization
}
