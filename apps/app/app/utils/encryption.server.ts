import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Validate and get encryption key
function getEncryptionKey(): Buffer {
	const key = process.env.ENCRYPTION_KEY
	if (!key) {
		throw new Error('ENCRYPTION_KEY environment variable is required')
	}

	// Check if key is valid hex and correct length (32 bytes = 64 hex chars for AES-256)
	if (!/^[0-9a-fA-F]{64}$/.test(key)) {
		throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
	}

	return Buffer.from(key, 'hex')
}

const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
	if (!text) return text

	try {
		const encryptionKey = getEncryptionKey()
		const iv = randomBytes(16)
		const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)

		let encrypted = cipher.update(text, 'utf8', 'hex')
		encrypted += cipher.final('hex')

		const authTag = cipher.getAuthTag()

		// Combine iv, authTag, and encrypted data
		return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
	} catch (error) {
		console.error('Encryption error:', error)
		// Don't return plaintext if encryption fails for security reasons
		throw new Error('Encryption failed')
	}
}

export function decrypt(encryptedText: string): string {
	if (!encryptedText || !encryptedText.includes(':')) return encryptedText

	try {
		const [ivHex, authTagHex, encrypted] = encryptedText.split(':')

		if (!ivHex || !authTagHex || !encrypted) {
			throw new Error('Invalid encrypted text format')
		}

		const encryptionKey = getEncryptionKey()
		const iv = Buffer.from(ivHex, 'hex')
		const authTag = Buffer.from(authTagHex, 'hex')
		const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv)

		decipher.setAuthTag(authTag)

		let decrypted = decipher.update(encrypted, 'hex', 'utf8')
		decrypted += decipher.final('utf8')

		return decrypted
	} catch (error) {
		console.error('Decryption error:', error)
		// Don't return encrypted data if decryption fails for security reasons
		throw new Error('Decryption failed')
	}
}
