import { db, eq, Role } from './db.server'

export async function setupRoles() {
	console.log('Setting up roles...')

	// Create user role if it doesn't exist
	const [existingUserRole] = await db
		.select({ id: Role.id })
		.from(Role)
		.where(eq(Role.name, 'user'))
		.limit(1)

	if (!existingUserRole) {
		await db.insert(Role).values({
			name: 'user',
			description: 'Regular user with basic permissions',
		})
		console.log('Created user role')
	}

	// Create admin role if it doesn't exist
	const [existingAdminRole] = await db
		.select({ id: Role.id })
		.from(Role)
		.where(eq(Role.name, 'admin'))
		.limit(1)

	if (!existingAdminRole) {
		await db.insert(Role).values({
			name: 'admin',
			description: 'Admin with full permissions',
		})
		console.log('Created admin role')
	}

	console.log('Roles setup complete')
}

// This function is called by seed.ts - do not run standalone
