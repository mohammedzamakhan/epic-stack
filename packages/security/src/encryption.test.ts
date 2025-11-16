import { describe, expect, it } from 'vitest'
import {
	encrypt,
	decrypt,
	generateEncryptionKey,
	isValidEncryptionKey,
} from './encryption.js'

describe('encryption utilities', () => {
	const testKey = generateEncryptionKey()
	const testData = 'sensitive-client-secret-12345'

	it('should encrypt and decrypt data correctly', () => {
		const encrypted = encrypt(testData, testKey)
		const decrypted = decrypt(encrypted, testKey)

		expect(decrypted).toBe(testData)
		expect(encrypted).not.toBe(testData)
	})

	it('should generate valid encryption keys', () => {
		const key = generateEncryptionKey()
		expect(isValidEncryptionKey(key)).toBe(true)
		expect(key).toHaveLength(64) // 32 bytes * 2 (hex encoding)
	})

	it('should validate encryption keys correctly', () => {
		expect(isValidEncryptionKey(testKey)).toBe(true)
		expect(isValidEncryptionKey('invalid-key')).toBe(false)
		expect(isValidEncryptionKey('')).toBe(false)
		expect(isValidEncryptionKey('123')).toBe(false)
	})

	it('should throw error for empty inputs', () => {
		expect(() => encrypt('', testKey)).toThrow(
			'Text to encrypt cannot be empty',
		)
		expect(() => encrypt(testData, '')).toThrow('Master key cannot be empty')
		expect(() => decrypt('', testKey)).toThrow('Encrypted data cannot be empty')
		expect(() => decrypt('invalid-data', '')).toThrow(
			'Master key cannot be empty',
		)
	})

	it('should fail to decrypt with wrong key', () => {
		const encrypted = encrypt(testData, testKey)
		const wrongKey = generateEncryptionKey()

		expect(() => decrypt(encrypted, wrongKey)).toThrow('Decryption failed')
	})
})
