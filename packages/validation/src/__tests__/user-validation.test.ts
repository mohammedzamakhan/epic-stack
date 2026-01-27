import { describe, it, expect } from 'vitest'
import {
	UsernameSchema,
	PasswordSchema,
	PASSWORD_MIN_LENGTH,
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
	it('should accept valid passwords with complexity requirements', () => {
		const validPasswords = [
			'MySecureP@ss1', // 13 chars, has upper, lower, number, special
			'Abcdefghijk1!', // 13 chars, meets all requirements
			'A1b2c3d4e5f6!', // 13 chars, meets all requirements
		]

		validPasswords.forEach((password) => {
			const result = PasswordSchema.safeParse(password)
			expect(result.success).toBe(true)
		})
	})

	it('should reject passwords that are too short', () => {
		const result = PasswordSchema.safeParse('Short1!')
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain(
				`at least ${PASSWORD_MIN_LENGTH} characters`,
			)
		}
	})

	it('should reject passwords that are too long', () => {
		const result = PasswordSchema.safeParse('A1!' + 'a'.repeat(70))
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe('Password is too long')
		}
	})

	it('should reject passwords without lowercase letters', () => {
		const result = PasswordSchema.safeParse('ABCDEFGHIJK1!')
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(
				result.error.issues.some((i) => i.message.includes('lowercase')),
			).toBe(true)
		}
	})

	it('should reject passwords without uppercase letters', () => {
		const result = PasswordSchema.safeParse('abcdefghijk1!')
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(
				result.error.issues.some((i) => i.message.includes('uppercase')),
			).toBe(true)
		}
	})

	it('should reject passwords without numbers', () => {
		const result = PasswordSchema.safeParse('Abcdefghijkl!')
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(
				result.error.issues.some((i) => i.message.includes('number')),
			).toBe(true)
		}
	})

	it('should reject passwords without special characters', () => {
		const result = PasswordSchema.safeParse('Abcdefghijk12')
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(
				result.error.issues.some((i) =>
					i.message.includes('special character'),
				),
			).toBe(true)
		}
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
		const data = {
			password: 'MySecureP@ss1',
			confirmPassword: 'MySecureP@ss1',
		}
		const result = PasswordAndConfirmPasswordSchema.safeParse(data)
		expect(result.success).toBe(true)
	})

	it('should reject non-matching passwords', () => {
		const data = {
			password: 'MySecureP@ss1',
			confirmPassword: 'DifferentP@ss1',
		}
		const result = PasswordAndConfirmPasswordSchema.safeParse(data)
		expect(result.success).toBe(false)
		if (!result.success) {
			const mismatchIssue = result.error.issues.find(
				(i) => i.message === 'The passwords must match',
			)
			expect(mismatchIssue).toBeDefined()
			expect(mismatchIssue?.path).toEqual(['confirmPassword'])
		}
	})
})
