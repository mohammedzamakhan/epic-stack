/**
 * Grant the platform `admin` role to a user by username.
 *
 * Usage (from repo root):
 *   npx tsx packages/database/scripts/grant-platform-admin.ts <username>
 */
import { and, db, eq, Role, User, _RoleToUser } from '../db.server.ts'

async function main() {
	const username = process.argv[2]
	if (!username) {
		console.error('Usage: grant-platform-admin.ts <username>')
		process.exit(1)
	}

	const [user] = await db
		.select({ id: User.id, username: User.username, email: User.email })
		.from(User)
		.where(eq(User.username, username))
		.limit(1)

	if (!user) {
		console.error(`User not found: ${username}`)
		process.exit(1)
	}

	const [adminRole] = await db
		.select({ id: Role.id })
		.from(Role)
		.where(eq(Role.name, 'admin'))
		.limit(1)

	if (!adminRole) {
		console.error('Platform admin role is missing. Run npm run db:seed first.')
		process.exit(1)
	}

	const [existing] = await db
		.select()
		.from(_RoleToUser)
		.where(and(eq(_RoleToUser.A, adminRole.id), eq(_RoleToUser.B, user.id)))
		.limit(1)

	if (!existing) {
		await db.insert(_RoleToUser).values({ A: adminRole.id, B: user.id })
		console.log(`Granted platform admin role to ${user.username}`)
	} else {
		console.log(`${user.username} already has platform admin role`)
	}

	const roles = await db
		.select({ name: Role.name })
		.from(_RoleToUser)
		.innerJoin(Role, eq(_RoleToUser.A, Role.id))
		.where(eq(_RoleToUser.B, user.id))

	console.log(`User: ${user.username} (${user.email})`)
	console.log(`Roles: ${roles.map((r) => r.name).join(', ')}`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
