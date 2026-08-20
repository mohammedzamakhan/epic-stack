import {
	and,
	count,
	db,
	eq,
	Password,
	Passkey,
	Connection,
} from '@repo/database'

type PasskeyActionArgs = {
	request?: Request
	userId: string
	formData: FormData
}

// Mock function for passkey registration - in a real app, you'd use your passkey API
export async function registerPasskeyAction(_deps: PasskeyActionArgs) {
	return Response.json({ status: 'success' })
}

/**
 * Check if user can safely delete a passkey without locking themselves out.
 * User can delete a passkey if they have:
 * - A password set, OR
 * - At least one OAuth connection, OR
 * - More than one passkey
 */
async function userCanDeletePasskey(userId: string): Promise<boolean> {
	const [password, passkeys, connections] = await Promise.all([
		db
			.select({ userId: Password.userId })
			.from(Password)
			.where(eq(Password.userId, userId))
			.limit(1),
		db
			.select({ value: count() })
			.from(Passkey)
			.where(eq(Passkey.userId, userId)),
		db
			.select({ value: count() })
			.from(Connection)
			.where(eq(Connection.userId, userId)),
	])

	if (!password[0] && !passkeys[0] && !connections[0]) return false

	// Allow deletion if user has a password
	if (password[0]) return true

	// Allow deletion if user has OAuth connections
	if ((connections[0]?.value ?? 0) > 0) return true

	// Allow deletion only if user has more than one passkey
	return (passkeys[0]?.value ?? 0) > 1
}

export async function deletePasskeyAction({
	formData,
	userId,
}: PasskeyActionArgs) {
	const passkeyId = formData.get('passkeyId')
	if (typeof passkeyId !== 'string') {
		return Response.json(
			{ status: 'error', error: 'Invalid passkey ID' },
			{ status: 400 },
		)
	}

	// SECURITY: Check if user can delete passkey without locking themselves out
	const canDelete = await userCanDeletePasskey(userId)
	if (!canDelete) {
		return Response.json(
			{
				status: 'error',
				error:
					'Cannot delete your last authentication method. Please add a password or another login method first.',
			},
			{ status: 400 },
		)
	}

	await db
		.delete(Passkey)
		.where(and(eq(Passkey.id, passkeyId), eq(Passkey.userId, userId)))

	return Response.json({ status: 'success' })
}
