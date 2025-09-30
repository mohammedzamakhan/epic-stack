import { beforeEach, describe, expect, test, vi } from 'vitest'
import crypto from 'crypto'

describe('encryption module', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	test('throws error when ENCRYPTION_KEY is invalid (default value)', async () => {
		// Set invalid encryption key
		vi.stubEnv('ENCRYPTION_KEY', 'your-32-character-secret-key-here')

		await expect(async () => {
			await import('./encryption.server.ts')
		}).rejects.toThrow(
			'ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)',
		)
	})

	test('throws error when ENCRYPTION_KEY is too short', async () => {
		vi.stubEnv('ENCRYPTION_KEY', '0123456789abcdef') // Only 16 chars

		await expect(async () => {
			await import('./encryption.server.ts')
		}).rejects.toThrow(
			'ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)',
		)
	})

	test('throws error when ENCRYPTION_KEY contains non-hex characters', async () => {
		vi.stubEnv(
			'ENCRYPTION_KEY',
			'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
		)

		await expect(async () => {
			await import('./encryption.server.ts')
		}).rejects.toThrow(
			'ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)',
		)
	})

	test('accepts valid 64-character hex encryption key', async () => {
		const validKey = crypto.randomBytes(32).toString('hex')
		vi.stubEnv('ENCRYPTION_KEY', validKey)

		// Should not throw
		const module = await import('./encryption.server.ts')
		expect(module.encrypt).toBeDefined()
		expect(module.decrypt).toBeDefined()
	})

	test('encrypt and decrypt work correctly with valid key', async () => {
		const validKey = crypto.randomBytes(32).toString('hex')
		vi.stubEnv('ENCRYPTION_KEY', validKey)

		const { encrypt, decrypt } = await import('./encryption.server.ts')

		const plaintext = 'sensitive data'
		const encrypted = encrypt(plaintext)

		expect(encrypted).not.toBe(plaintext)
		expect(encrypted).toContain(':') // Should have format iv:authTag:encrypted

		const decrypted = decrypt(encrypted)
		expect(decrypted).toBe(plaintext)
	})

	test('encrypt returns empty string for empty input', async () => {
		const validKey = crypto.randomBytes(32).toString('hex')
		vi.stubEnv('ENCRYPTION_KEY', validKey)

		const { encrypt } = await import('./encryption.server.ts')

		expect(encrypt('')).toBe('')
	})

	test('decrypt returns input if format is invalid', async () => {
		const validKey = crypto.randomBytes(32).toString('hex')
		vi.stubEnv('ENCRYPTION_KEY', validKey)

		const { decrypt } = await import('./encryption.server.ts')

		const invalidFormat = 'not:encrypted'
		expect(decrypt(invalidFormat)).toBe(invalidFormat)
	})
})
