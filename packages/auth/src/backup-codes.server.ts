import crypto from 'node:crypto'
import { prisma } from '@repo/database'
import bcrypt from 'bcryptjs'

const BACKUP_CODE_LENGTH = 8
const BACKUP_CODE_COUNT = 10
const BACKUP_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous chars (0, O, I, 1)

/**
 * Generate a single random backup code using unbiased random selection
 */
function generateSingleCode(): string {
	let code = ''
	// Use rejection sampling to avoid modulo bias
	// The largest multiple of charset length that fits in a byte (0-255)
	const charsetLength = BACKUP_CODE_CHARSET.length
	const maxValid = Math.floor(256 / charsetLength) * charsetLength

	for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
		let randomByte: number
		// Keep generating random bytes until we get one in the unbiased range
		do {
			randomByte = crypto.randomBytes(1)[0]!
		} while (randomByte >= maxValid)

		code += BACKUP_CODE_CHARSET[randomByte % charsetLength]
	}
	// Format as XXXX-XXXX for readability
	return `${code.slice(0, 4)}-${code.slice(4)}`
}

/**
 * Hash a backup code using bcrypt
 */
export async function hashBackupCode(code: string): Promise<string> {
	// Normalize: remove dashes and convert to uppercase
	const normalizedCode = code.replace(/-/g, '').toUpperCase()
	return bcrypt.hash(normalizedCode, 10)
}

/**
 * Verify a backup code against its hash
 */
export async function verifyBackupCode(
	code: string,
	hash: string,
): Promise<boolean> {
	const normalizedCode = code.replace(/-/g, '').toUpperCase()
	return bcrypt.compare(normalizedCode, hash)
}

/**
 * Generate a set of backup codes for a user
 * Returns the plain text codes (to show to user) and stores hashes in DB
 */
export async function generateBackupCodes(
	userId: string,
	count: number = BACKUP_CODE_COUNT,
): Promise<string[]> {
	// Generate new codes
	const codes: string[] = []
	const codeHashes: string[] = []

	for (let i = 0; i < count; i++) {
		const code = generateSingleCode()
		codes.push(code)
		codeHashes.push(await hashBackupCode(code))
	}

	// Delete any existing backup codes for this user
	await prisma.backupCode.deleteMany({
		where: { userId },
	})

	// Store new hashed codes
	await prisma.backupCode.createMany({
		data: codeHashes.map((codeHash) => ({
			userId,
			codeHash,
		})),
	})

	return codes
}

/**
 * Get the count of unused backup codes for a user
 */
export async function getUnusedBackupCodeCount(
	userId: string,
): Promise<number> {
	return prisma.backupCode.count({
		where: {
			userId,
			usedAt: null,
		},
	})
}

/**
 * Check if a user has any backup codes (used or unused)
 */
export async function hasBackupCodes(userId: string): Promise<boolean> {
	const count = await prisma.backupCode.count({
		where: { userId },
	})
	return count > 0
}

/**
 * Validate a backup code and consume it if valid
 * Returns true if code was valid and consumed, false otherwise
 */
export async function validateAndConsumeBackupCode(
	userId: string,
	code: string,
): Promise<boolean> {
	// Get all unused backup codes for this user
	const unusedCodes = await prisma.backupCode.findMany({
		where: {
			userId,
			usedAt: null,
		},
		select: {
			id: true,
			codeHash: true,
		},
	})

	// Try to match the provided code against any of the hashes
	for (const backupCode of unusedCodes) {
		const isValid = await verifyBackupCode(code, backupCode.codeHash)
		if (isValid) {
			// Mark as used
			await prisma.backupCode.update({
				where: { id: backupCode.id },
				data: { usedAt: new Date() },
			})
			return true
		}
	}

	return false
}

/**
 * Delete all backup codes for a user (e.g., when disabling 2FA)
 */
export async function deleteBackupCodes(userId: string): Promise<void> {
	await prisma.backupCode.deleteMany({
		where: { userId },
	})
}
