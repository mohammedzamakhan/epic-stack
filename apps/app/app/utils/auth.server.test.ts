import { faker } from '@faker-js/faker'
import { verifyUserPassword } from '@repo/auth'
import {
	Connection,
	db,
	eq,
	Password,
	Role,
	Session,
	User,
	_RoleToUser,
} from '@repo/database'
import { describe, expect, it } from 'vitest'
import {
	login,
	loginWithSSO,
	resetUserPassword,
	signup,
	signupWithConnection,
	SESSION_EXPIRATION_TIME_LONG,
	SESSION_EXPIRATION_TIME_SHORT,
} from '#app/utils/auth.server.ts'
import { createTestUser } from '#tests/test-utils.ts'

describe('auth.server integration', () => {
	describe('login()', () => {
		it('authenticates valid user by username and creates a session', async () => {
			const password = 'CorrectPassword123!'
			const user = await createTestUser({ password })

			const request = new Request('http://localhost:3000/login', {
				headers: {
					'x-forwarded-for': '198.51.100.42',
					'user-agent': 'TestBrowser/1.0',
				},
			})

			const session = await login({
				username: user.username,
				password,
				request,
				remember: false,
			})

			expect(session).toBeDefined()
			expect(session?.userId).toBe(user.id)

			// Verify session in SQLite database
			const [dbSession] = await db
				.select()
				.from(Session)
				.where(eq(Session.id, session!.id))
				.limit(1)

			expect(dbSession).toBeDefined()
			expect(dbSession?.userId).toBe(user.id)
			expect(dbSession?.ipAddress).toBe('198.51.100.42')
			expect(dbSession?.userAgent).toBe('TestBrowser/1.0')

			// Verify default session expiration is approximately 24h away
			const timeDiff = dbSession!.expirationDate.getTime() - Date.now()
			expect(timeDiff).toBeGreaterThan(SESSION_EXPIRATION_TIME_SHORT - 10000)
			expect(timeDiff).toBeLessThanOrEqual(
				SESSION_EXPIRATION_TIME_SHORT + 10000,
			)
		})

		it('authenticates valid user by email', async () => {
			const password = 'EmailPassword123!'
			const user = await createTestUser({ password })

			const session = await login({
				username: user.email,
				password,
				remember: false,
			})

			expect(session).toBeDefined()
			expect(session?.userId).toBe(user.id)
		})

		it('supports remember=true with 30-day session expiration', async () => {
			const password = 'RememberPassword123!'
			const user = await createTestUser({ password })

			const session = await login({
				username: user.username,
				password,
				remember: true,
			})

			expect(session).toBeDefined()
			const [dbSession] = await db
				.select()
				.from(Session)
				.where(eq(Session.id, session!.id))
				.limit(1)

			const timeDiff = dbSession!.expirationDate.getTime() - Date.now()
			expect(timeDiff).toBeGreaterThan(SESSION_EXPIRATION_TIME_LONG - 10000)
			expect(timeDiff).toBeLessThanOrEqual(SESSION_EXPIRATION_TIME_LONG + 10000)
		})

		it('returns null on wrong password', async () => {
			const user = await createTestUser({ password: 'RealPassword123!' })

			const session = await login({
				username: user.username,
				password: 'WrongPassword456!',
			})

			expect(session).toBeNull()
		})

		it('returns null for non-existent username', async () => {
			const session = await login({
				username: 'completely_nonexistent_user_' + Date.now(),
				password: 'SomePassword123!',
			})

			expect(session).toBeNull()
		})
	})

	describe('signup()', () => {
		it('creates user, password, role, and active session in database', async () => {
			// Ensure default 'user' role exists
			let [userRole] = await db
				.select({ id: Role.id })
				.from(Role)
				.where(eq(Role.name, 'user'))
				.limit(1)
			if (!userRole) {
				;[userRole] = await db
					.insert(Role)
					.values({ name: 'user', description: 'User role' })
					.returning({ id: Role.id })
			}

			const username =
				`signup_${Date.now()}_${faker.string.alphanumeric(4)}`.toLowerCase()
			const email = `${username}@example.com`
			const password = 'SignupPass123!'
			const name = 'New Signup User'

			const request = new Request('http://localhost:3000/signup', {
				headers: {
					'x-forwarded-for': '203.0.113.10',
					'user-agent': 'SignupBrowser/2.0',
				},
			})

			const session = await signup({
				email,
				username,
				password,
				name,
				request,
			})

			expect(session).toBeDefined()
			expect(session.userId).toBeDefined()

			// Verify user created in DB
			const [dbUser] = await db
				.select()
				.from(User)
				.where(eq(User.id, session.userId))
				.limit(1)

			expect(dbUser).toBeDefined()
			expect(dbUser?.email).toBe(email)
			expect(dbUser?.username).toBe(username)
			expect(dbUser?.name).toBe(name)

			// Verify password was hashed and verified
			const verifiedUser = await verifyUserPassword({ username }, password)
			expect(verifiedUser?.id).toBe(dbUser?.id)

			// Verify session created in DB
			const [dbSession] = await db
				.select()
				.from(Session)
				.where(eq(Session.id, session.id))
				.limit(1)

			expect(dbSession).toBeDefined()
			expect(dbSession?.userId).toBe(dbUser?.id)
			expect(dbSession?.ipAddress).toBe('203.0.113.10')
		})
	})

	describe('resetUserPassword()', () => {
		it('updates user password hash in database', async () => {
			const initialPassword = 'OldPassword123!'
			const newPassword = 'BrandNewPassword456!'
			const user = await createTestUser({ password: initialPassword })

			// Verify old password works
			const beforeReset = await verifyUserPassword(
				{ username: user.username },
				initialPassword,
			)
			expect(beforeReset?.id).toBe(user.id)

			// Reset password
			await resetUserPassword({
				username: user.username,
				password: newPassword,
			})

			// Verify old password no longer works
			const oldVerify = await verifyUserPassword(
				{ username: user.username },
				initialPassword,
			)
			expect(oldVerify).toBeNull()

			// Verify new password works
			const newVerify = await verifyUserPassword(
				{ username: user.username },
				newPassword,
			)
			expect(newVerify?.id).toBe(user.id)

			// Verify password table updated
			const [dbPassword] = await db
				.select()
				.from(Password)
				.where(eq(Password.userId, user.id))
				.limit(1)

			expect(dbPassword?.hash).toBeDefined()
		})

		it('throws error when user does not exist', async () => {
			await expect(
				resetUserPassword({
					username: 'nonexistent_user_' + Date.now(),
					password: 'SomeNewPassword123!',
				}),
			).rejects.toThrow('User not found')
		})
	})

	describe('signupWithConnection()', () => {
		it('creates user with provider connection and returns active session', async () => {
			const email = faker.internet.email().toLowerCase()
			const username = faker.internet.username().toLowerCase()
			const name = faker.person.fullName()
			const providerId = `google-oauth-${Date.now()}-${faker.string.alphanumeric(6)}`

			const session = await signupWithConnection({
				email,
				username,
				name,
				providerId,
				providerName: 'google',
			})

			expect(session).toBeDefined()
			expect(session.id).toBeDefined()

			const [user] = await db
				.select()
				.from(User)
				.where(eq(User.email, email))
				.limit(1)

			expect(user).toBeDefined()
			expect(user?.username).toBe(username)

			const [connection] = await db
				.select()
				.from(Connection)
				.where(eq(Connection.userId, user!.id))
				.limit(1)

			expect(connection).toBeDefined()
			expect(connection?.providerName).toBe('google')
			expect(connection?.providerId).toBe(providerId)
		})
	})

	describe('loginWithSSO()', () => {
		it('creates session for SSO user', async () => {
			const user = await createTestUser()

			const session = await loginWithSSO({
				user,
				_organizationId: 'org-test',
			})

			expect(session).toBeDefined()
			expect(session.userId).toBe(user.id)
			expect(session.expirationDate).toBeDefined()
		})
	})
})
