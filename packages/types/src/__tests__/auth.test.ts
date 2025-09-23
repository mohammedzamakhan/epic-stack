import { describe, it, expect } from 'vitest'
import {
	type User,
	type SessionData,
	type AuthState,
	type LoginCredentials,
	type SignupData,
	type AuthResponse,
	type AuthError,
	type ProviderName,
	type AuthContextType,
} from '../auth.js'

describe('Auth Types', () => {
	it('should define User interface correctly', () => {
		const user: User = {
			id: 'user123',
			email: 'test@example.com',
			username: 'testuser',
			name: 'Test User',
			createdAt: '2023-01-01T00:00:00Z',
			updatedAt: '2023-01-01T00:00:00Z',
			isBanned: false,
			banReason: null,
			banExpiresAt: null,
			bannedAt: null,
			image: {
				id: 'img123',
				altText: 'Profile picture',
				objectKey: 'profile/user123.jpg',
			},
		}

		expect(user.id).toBe('user123')
		expect(user.email).toBe('test@example.com')
		expect(user.isBanned).toBe(false)
		expect(user.image?.objectKey).toBe('profile/user123.jpg')
	})

	it('should define SessionData interface correctly', () => {
		const session: SessionData = {
			id: 'session123',
			userId: 'user123',
			expirationDate: '2023-12-31T23:59:59Z',
			createdAt: '2023-01-01T00:00:00Z',
			updatedAt: '2023-01-01T00:00:00Z',
		}

		expect(session.id).toBe('session123')
		expect(session.userId).toBe('user123')
		expect(session.expirationDate).toBe('2023-12-31T23:59:59Z')
	})

	it('should define AuthState interface correctly', () => {
		const authState: AuthState = {
			user: null,
			session: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,
		}

		expect(authState.isAuthenticated).toBe(false)
		expect(authState.user).toBeNull()
		expect(authState.session).toBeNull()
	})

	it('should define LoginCredentials interface correctly', () => {
		const credentials: LoginCredentials = {
			username: 'testuser',
			password: 'password123',
			redirectTo: '/dashboard',
			remember: true,
		}

		expect(credentials.username).toBe('testuser')
		expect(credentials.password).toBe('password123')
		expect(credentials.remember).toBe(true)
	})

	it('should define SignupData interface correctly', () => {
		const signupData: SignupData = {
			email: 'test@example.com',
			redirectTo: '/onboarding',
		}

		expect(signupData.email).toBe('test@example.com')
		expect(signupData.redirectTo).toBe('/onboarding')
	})

	it('should define AuthResponse interface correctly', () => {
		const response: AuthResponse = {
			success: true,
			user: {
				id: 'user123',
				email: 'test@example.com',
				username: 'testuser',
				name: 'Test User',
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z',
				isBanned: false,
				banReason: null,
				banExpiresAt: null,
				bannedAt: null,
			},
			session: {
				id: 'session123',
				userId: 'user123',
				expirationDate: '2023-12-31T23:59:59Z',
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z',
			},
			redirectTo: '/dashboard',
		}

		expect(response.success).toBe(true)
		expect(response.user?.id).toBe('user123')
		expect(response.session?.id).toBe('session123')
	})

	it('should define AuthError interface correctly', () => {
		const error: AuthError = {
			type: 'validation',
			message: 'Invalid email format',
			field: 'email',
			details: { code: 'INVALID_EMAIL' },
		}

		expect(error.type).toBe('validation')
		expect(error.message).toBe('Invalid email format')
		expect(error.field).toBe('email')
	})

	it('should define ProviderName type correctly', () => {
		const providers: ProviderName[] = ['github', 'google', 'discord']

		expect(providers).toContain('github')
		expect(providers).toContain('google')
		expect(providers).toContain('discord')
	})

	it('should define AuthContextType interface correctly', () => {
		const mockAuthContext: AuthContextType = {
			user: null,
			session: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,
			login: async () => ({ success: false }),
			signup: async () => ({ success: false }),
			socialLogin: async () => ({ success: false }),
			logout: async () => {},
			refreshSession: async () => {},
			clearError: () => {},
		}

		expect(typeof mockAuthContext.login).toBe('function')
		expect(typeof mockAuthContext.signup).toBe('function')
		expect(typeof mockAuthContext.logout).toBe('function')
		expect(mockAuthContext.isAuthenticated).toBe(false)
	})

	it('should allow optional fields in User interface', () => {
		const minimalUser: User = {
			id: 'user123',
			email: 'test@example.com',
			username: 'testuser',
			name: null,
			createdAt: '2023-01-01T00:00:00Z',
			updatedAt: '2023-01-01T00:00:00Z',
			isBanned: false,
			banReason: null,
			banExpiresAt: null,
			bannedAt: null,
		}

		expect(minimalUser.name).toBeNull()
		expect(minimalUser.image).toBeUndefined()
	})

	it('should allow optional fields in LoginCredentials', () => {
		const minimalCredentials: LoginCredentials = {
			username: 'testuser',
			password: 'password123',
		}

		expect(minimalCredentials.redirectTo).toBeUndefined()
		expect(minimalCredentials.remember).toBeUndefined()
	})
})
