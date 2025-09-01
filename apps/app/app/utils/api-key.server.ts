import { randomBytes } from 'crypto'

export function generateApiKey(): string {
	// Generate a secure random API key
	const prefix = 'epic_'
	const randomPart = randomBytes(32).toString('hex')
	return `${prefix}${randomPart}`
}

export function validateApiKeyFormat(key: string): boolean {
	// Check if the key has the expected format
	return key.startsWith('epic_') && key.length === 69 // epic_ (5) + 64 hex chars
}
