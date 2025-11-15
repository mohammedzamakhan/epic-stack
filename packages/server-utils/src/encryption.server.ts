import crypto from 'node:crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // For GCM, this is always 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derives a key from the master key and salt using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
	return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512')
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text - The text to encrypt
 * @param masterKey - The master encryption key
 * @returns Base64 encoded encrypted data with salt, IV, and auth tag
 */
export function encrypt(text: string, masterKey: string): string {
	if (!text) {
		throw new Error('Text to encrypt cannot be empty')
	}
	if (!masterKey) {
		throw new Error('Master key cannot be empty')
	}

	// Generate random salt and IV
	const salt = crypto.randomBytes(SALT_LENGTH)
	const iv = crypto.randomBytes(IV_LENGTH)

	// Derive key from master key and salt
	const key = deriveKey(masterKey, salt)

	// Create cipher
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
	cipher.setAAD(salt) // Use salt as additional authenticated data

	// Encrypt the text
	let encrypted = cipher.update(text, 'utf8', 'hex')
	encrypted += cipher.final('hex')

	// Get the authentication tag
	const tag = cipher.getAuthTag()

	// Combine salt + iv + tag + encrypted data
	const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')])

	return combined.toString('base64')
}

/**
 * Decrypts data encrypted with the encrypt function
 * @param encryptedData - Base64 encoded encrypted data
 * @param masterKey - The master encryption key
 * @returns The decrypted text
 */
export function decrypt(encryptedData: string, masterKey: string): string {
	if (!encryptedData) {
		throw new Error('Encrypted data cannot be empty')
	}
	if (!masterKey) {
		throw new Error('Master key cannot be empty')
	}

	try {
		// Decode from base64
		const combined = Buffer.from(encryptedData, 'base64')

		// Extract components
		const salt = combined.subarray(0, SALT_LENGTH)
		const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
		const tag = combined.subarray(
			SALT_LENGTH + IV_LENGTH,
			SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
		)
		const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

		// Derive key from master key and salt
		const key = deriveKey(masterKey, salt)

		// Create decipher
		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
		decipher.setAAD(salt) // Use salt as additional authenticated data
		decipher.setAuthTag(tag)

		// Decrypt the data
		let decrypted = decipher.update(encrypted, undefined, 'utf8')
		decrypted += decipher.final('utf8')

		return decrypted
	} catch (error) {
		throw new Error(
			`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		)
	}
}

/**
 * Generates a secure random encryption key
 * @param length - The length of the key in bytes (default: 32 for AES-256)
 * @returns A hex-encoded random key
 */
export function generateEncryptionKey(length: number = KEY_LENGTH): string {
	return crypto.randomBytes(length).toString('hex')
}

/**
 * Validates that an encryption key is properly formatted
 * @param key - The key to validate
 * @returns True if the key is valid
 */
export function isValidEncryptionKey(key: string): boolean {
	if (!key || typeof key !== 'string') {
		return false
	}

	// Check if it's a valid hex string of the correct length
	const hexRegex = /^[0-9a-fA-F]+$/
	return hexRegex.test(key) && key.length === KEY_LENGTH * 2 // *2 because hex encoding
}

/**
 * Gets the encryption key from environment variables
 * @returns The encryption key for SSO configuration
 */
export function getSSOMasterKey(): string {
	const key = process.env.SSO_ENCRYPTION_KEY
	if (!key) {
		throw new Error('SSO_ENCRYPTION_KEY environment variable is not set')
	}

	if (!isValidEncryptionKey(key)) {
		throw new Error('SSO_ENCRYPTION_KEY is not a valid encryption key')
	}

	return key
}
