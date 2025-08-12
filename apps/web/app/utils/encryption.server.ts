import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENCRYPTION_KEY =
	process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here'
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text: string): string {
	if (!text) return text

	try {
		const iv = randomBytes(16)
		const cipher = createCipheriv(
			ALGORITHM,
			Buffer.from(ENCRYPTION_KEY, 'hex'),
			iv,
		)

		let encrypted = cipher.update(text, 'utf8', 'hex')
		encrypted += cipher.final('hex')

		const authTag = cipher.getAuthTag()

		// Combine iv, authTag, and encrypted data
		return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
	} catch (error) {
		console.error('Encryption error:', error)
		return text // Return original text if encryption fails
	}
}

export function decrypt(encryptedText: string): string {
	if (!encryptedText || !encryptedText.includes(':')) return encryptedText

	try {
		const [ivHex, authTagHex, encrypted] = encryptedText.split(':')

		if (!ivHex || !authTagHex || !encrypted) {
			return encryptedText // Return as-is if format is incorrect
		}

		const iv = Buffer.from(ivHex, 'hex')
		const authTag = Buffer.from(authTagHex, 'hex')
		const decipher = createDecipheriv(
			ALGORITHM,
			Buffer.from(ENCRYPTION_KEY, 'hex'),
			iv,
		)

		decipher.setAuthTag(authTag)

		let decrypted = decipher.update(encrypted, 'hex', 'utf8')
		decrypted += decipher.final('utf8')

		return decrypted
	} catch (error) {
		console.error('Decryption error:', error)
		return encryptedText // Return encrypted text if decryption fails
	}
}
