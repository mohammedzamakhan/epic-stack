import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'

export async function createTestOrganization(
	userId: string,
	role: 'admin' | 'member' | 'viewer' | 'guest' = 'admin',
) {
	const roleId = `org_role_${role}`
	// Generate unique slug by adding timestamp and random string
	const baseName = faker.company.name()
	const uniqueSlug = `${faker.helpers.slugify(baseName).toLowerCase()}-${Date.now()}-${faker.string.alphanumeric(4)}`

	return await prisma.organization.create({
		data: {
			name: baseName,
			slug: uniqueSlug,
			description: faker.company.catchPhrase(),
			users: {
				create: {
					userId,
					organizationRoleId: roleId,
				},
			},
		},
	})
}

export async function createTestOrganizationWithMultipleUsers(
	users: Array<{
		userId: string
		role?: 'admin' | 'member' | 'viewer' | 'guest'
	}>,
) {
	return await prisma.organization.create({
		data: {
			name: faker.company.name(),
			slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
			description: faker.company.catchPhrase(),
			users: {
				create: users.map((user) => ({
					userId: user.userId,
					organizationRoleId: `org_role_${user.role || 'member'}`,
				})),
			},
		},
	})
}
