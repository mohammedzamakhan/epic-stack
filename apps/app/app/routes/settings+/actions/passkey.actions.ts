import { prisma } from '@repo/database'

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
	const user = await prisma.user.findUnique({
		select: {
			password: { select: { userId: true } },
			_count: { select: { passkey: true, connections: true } },
		},
		where: { id: userId },
	})

	if (!user) return false

	// Allow deletion if user has a password
	if (user.password) return true

	// Allow deletion if user has OAuth connections
	if (user._count.connections > 0) return true

	// Allow deletion only if user has more than one passkey
	return user._count.passkey > 1
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

	await prisma.passkey.delete({
		where: {
			id: passkeyId,
			userId, // Ensure the passkey belongs to the user
		},
	})

	return Response.json({ status: 'success' })
}
