import { describe, it, expect } from 'vitest'
import {
	LoginFormSchema,
	SignupSchema,
	MobileLoginFormSchema,
	MobileSignupSchema,
	OAuthCallbackSchema,
	SocialAuthSchema,
} from '../auth-validation.js'

describe('LoginFormSchema', () => {
	it('should accept valid login data', () => {
		const validData = {
			username: 'testuser',
			password: 'MySecureP@ss1',
			redirectTo: '/dashboard',
			remember: true,
		}

		const result = LoginFormSchema.safeParse(validData)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.username).toBe('testuser')
			expect(result.data.password).toBe('MySecureP@ss1')
			expect(result.data.redirectTo).toBe('/dashboard')
			expect(result.data.remember).toBe(true)
		}
	})

	it('should accept minimal login data', () => {
		const minimalData = {
			username: 'testuser',
			password: 'MySecureP@ss1',
		}

		const result = LoginFormSchema.safeParse(minimalData)
		expect(result.success).toBe(true)
	})

	it('should reject invalid login data', () => {
		const invalidData = {
			username: '', // empty username
			password: 'password123',
		}

		const result = LoginFormSchema.safeParse(invalidData)
		expect(result.success).toBe(false)
	})
})

describe('SignupSchema', () => {
	it('should accept valid signup data', () => {
		const validData = {
			email: 'test@example.com',
		}

		const result = SignupSchema.safeParse(validData)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.email).toBe('test@example.com')
		}
	})

	it('should reject invalid email', () => {
		const invalidData = {
			email: 'invalid-email',
		}

		const result = SignupSchema.safeParse(invalidData)
		expect(result.success).toBe(false)
	})
})

describe('MobileLoginFormSchema', () => {
	it('should accept valid mobile login data', () => {
		const validData = {
			username: 'testuser',
			password: 'password123',
			remember: true,
		}

		const result = MobileLoginFormSchema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	it('should have simplified validation for mobile', () => {
		// Mobile schema should be more lenient for UX
		const data = {
			username: 'u', // shorter than web validation
			password: 'p', // shorter than web validation
		}

		const result = MobileLoginFormSchema.safeParse(data)
		expect(result.success).toBe(true)
	})

	it('should reject empty fields', () => {
		const invalidData = {
			username: '',
			password: '',
		}

		const result = MobileLoginFormSchema.safeParse(invalidData)
		expect(result.success).toBe(false)
	})
})

describe('MobileSignupSchema', () => {
	it('should accept valid mobile signup data', () => {
		const validData = {
			email: 'test@example.com',
		}

		const result = MobileSignupSchema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	it('should reject invalid email', () => {
		const invalidData = {
			email: 'invalid-email',
		}

		const result = MobileSignupSchema.safeParse(invalidData)
		expect(result.success).toBe(false)
	})
})

describe('OAuthCallbackSchema', () => {
	it('should accept valid OAuth callback data', () => {
		const validData = {
			code: 'auth_code_123',
			state: 'random_state',
		}

		const result = OAuthCallbackSchema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	it('should accept OAuth error response', () => {
		const errorData = {
			code: 'auth_code_123',
			error: 'access_denied',
			error_description: 'User denied access',
		}

		const result = OAuthCallbackSchema.safeParse(errorData)
		expect(result.success).toBe(true)
	})

	it('should require code field', () => {
		const invalidData = {
			state: 'random_state',
		}

		const result = OAuthCallbackSchema.safeParse(invalidData)
		expect(result.success).toBe(false)
	})
})

describe('SocialAuthSchema', () => {
	it('should accept valid social auth data', () => {
		const validProviders = ['google', 'github', 'discord']

		validProviders.forEach((provider) => {
			const data = {
				provider,
				redirectTo: '/dashboard',
			}

			const result = SocialAuthSchema.safeParse(data)
			expect(result.success).toBe(true)
		})
	})

	it('should reject invalid provider', () => {
		const invalidData = {
			provider: 'facebook', // not in enum
			redirectTo: '/dashboard',
		}

		const result = SocialAuthSchema.safeParse(invalidData)
		expect(result.success).toBe(false)
	})

	it('should accept minimal data', () => {
		const minimalData = {
			provider: 'google',
		}

		const result = SocialAuthSchema.safeParse(minimalData)
		expect(result.success).toBe(true)
	})
})
