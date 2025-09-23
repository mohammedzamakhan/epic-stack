import { describe, it, expect } from 'vitest'
import {
	UsernameSchema,
	PasswordSchema,
	EmailSchema,
	NameSchema,
	PasswordAndConfirmPasswordSchema,
} from '../user-validation.js'

describe('UsernameSchema', () => {
	it('should accept valid usernames', () => {
		const validUsernames = ['user123', 'test_user', 'USERNAME', 'a_1']

		validUsernames.forEach((username) => {
			const result = UsernameSchema.safeParse(username)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toBe(username.toLowerCase())
			}
		})
	})

	it('should reject invalid usernames', () => {
		const invalidUsernames = [
			'', // empty
			'ab', // too short
			'a'.repeat(21), // too long
			'user-name', // contains dash
			'user name', // contains space
			'user@name', // contains special char
		]

		invalidUsernames.forEach((username) => {
			const result = UsernameSchema.safeParse(username)
			expect(result.success).toBe(false)
		})
	})

	it('should transform username to lowercase', () => {
		const result = UsernameSchema.safeParse('USERNAME')
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe('username')
		}
	})
})

describe('PasswordSchema', () => {
	it('should accept valid passwords', () => {
		const validPasswords = ['password123', 'mySecureP@ss', 'a'.repeat(72)]

		validPasswords.forEach((password) => {
			const result = PasswordSchema.safeParse(password)
			expect(result.success).toBe(true)
		})
	})

	it('should reject invalid passwords', () => {
		const invalidPasswords = [
			'', // empty
			'12345', // too short
			'a'.repeat(73), // too long (over 72 bytes)
		]

		invalidPasswords.forEach((password) => {
			const result = PasswordSchema.safeParse(password)
			expect(result.success).toBe(false)
		})
	})
})

describe('EmailSchema', () => {
	it('should accept valid emails', () => {
		const validEmails = [
			'test@example.com',
			'user.name@domain.co.uk',
			'user+tag@example.org',
		]

		validEmails.forEach((email) => {
			const result = EmailSchema.safeParse(email)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toBe(email.toLowerCase())
			}
		})
	})

	it('should reject invalid emails', () => {
		const invalidEmails = [
			'', // empty
			'ab', // too short
			'invalid-email',
			'@example.com',
			'user@',
			'a'.repeat(101) + '@example.com', // too long
		]

		invalidEmails.forEach((email) => {
			const result = EmailSchema.safeParse(email)
			expect(result.success).toBe(false)
		})
	})

	it('should transform email to lowercase', () => {
		const result = EmailSchema.safeParse('TEST@EXAMPLE.COM')
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe('test@example.com')
		}
	})
})

describe('NameSchema', () => {
	it('should accept valid names', () => {
		const validNames = ['John Doe', 'Jane', 'A'.repeat(40)]

		validNames.forEach((name) => {
			const result = NameSchema.safeParse(name)
			expect(result.success).toBe(true)
		})
	})

	it('should reject invalid names', () => {
		const invalidNames = [
			'', // empty
			'Jo', // too short
			'A'.repeat(41), // too long
		]

		invalidNames.forEach((name) => {
			const result = NameSchema.safeParse(name)
			expect(result.success).toBe(false)
		})
	})
})

describe('PasswordAndConfirmPasswordSchema', () => {
	it('should accept matching passwords', () => {
		const data = { password: 'password123', confirmPassword: 'password123' }
		const result = PasswordAndConfirmPasswordSchema.safeParse(data)
		expect(result.success).toBe(true)
	})

	it('should reject non-matching passwords', () => {
		const data = { password: 'password123', confirmPassword: 'different123' }
		const result = PasswordAndConfirmPasswordSchema.safeParse(data)
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues).toHaveLength(1)
			expect(result.error.issues[0]?.path).toEqual(['confirmPassword'])
			expect(result.error.issues[0]?.message).toBe('The passwords must match')
		}
	})
})
