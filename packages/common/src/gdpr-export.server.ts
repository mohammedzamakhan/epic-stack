import { getDomainUrl, getUserImgSrc, getNoteImgSrc } from './misc.js'
import { prisma } from '@repo/database'

export interface UserDataExport {
	exportedAt: string
	userId: string
	schemaVersion: number
	user: {
		id: string
		email: string
		username: string
		name: string | null
		createdAt: Date
		updatedAt: Date
	}
	relations: {
		notes: Array<{
			id: string
			title: string
			content: string
			createdAt: Date
			updatedAt: Date
			images: Array<{
				id: string
				altText: string | null
				url: string
				createdAt: Date
			}>
		}>
		connections: Array<{
			id: string
			providerName: string
			createdAt: Date
		}>
		organizations: Array<{
			organizationId: string
			organizationName: string
			role: string
			joinedAt: Date
		}>
		sessions: Array<{
			id: string
			createdAt: Date
			expirationDate: Date
			ipAddress: string | null
			userAgent: string | null
		}>
		feedback: Array<{
			id: string
			type: string
			message: string
			createdAt: Date
		}>
	}
	files: {
		userImage: { objectKey: string; url: string } | null
		noteImages: Array<{ noteId: string; objectKey: string; url: string }>
	}
	statistics: {
		totalNotes: number
		totalConnections: number
		totalOrganizations: number
		totalSessions: number
		totalFeedback: number
	}
	redactions: string[]
}

/**
 * Gathers all user data for GDPR export.
 * This is a pure data-gathering function with no side effects (no audit logging, no status updates).
 * Callers are responsible for their own logging and status management.
 */
export async function gatherUserDataForExport(
	userId: string,
	request: Request,
): Promise<UserDataExport> {
	const domain = getDomainUrl(request)

	const [user, notes, connections, organizations, sessions, feedback] =
		await Promise.all([
			prisma.user.findUniqueOrThrow({
				where: { id: userId },
				select: {
					id: true,
					email: true,
					username: true,
					name: true,
					createdAt: true,
					updatedAt: true,
					image: {
						select: {
							objectKey: true,
						},
					},
				},
			}),
			prisma.note.findMany({
				where: { ownerId: userId },
				select: {
					id: true,
					title: true,
					content: true,
					createdAt: true,
					updatedAt: true,
					images: {
						select: {
							id: true,
							altText: true,
							objectKey: true,
							createdAt: true,
						},
					},
				},
			}),
			prisma.connection.findMany({
				where: { userId },
				select: {
					id: true,
					providerName: true,
					createdAt: true,
				},
			}),
			prisma.userOrganization.findMany({
				where: { userId },
				select: {
					organizationId: true,
					organization: {
						select: { name: true },
					},
					organizationRole: {
						select: { name: true },
					},
					createdAt: true,
				},
			}),
			prisma.session.findMany({
				where: { userId },
				select: {
					id: true,
					createdAt: true,
					expirationDate: true,
					ipAddress: true,
					userAgent: true,
				},
			}),
			prisma.feedback.findMany({
				where: { userId },
				select: {
					id: true,
					type: true,
					message: true,
					createdAt: true,
				},
			}),
		])

	const noteImages: Array<{ noteId: string; objectKey: string; url: string }> =
		[]
	const notesWithUrls = notes.map((note) => ({
		id: note.id,
		title: note.title,
		content: note.content,
		createdAt: note.createdAt,
		updatedAt: note.updatedAt,
		images: note.images.map((image) => {
			const url = domain + getNoteImgSrc(image.objectKey)
			noteImages.push({ noteId: note.id, objectKey: image.objectKey, url })
			return {
				id: image.id,
				altText: image.altText,
				url,
				createdAt: image.createdAt,
			}
		}),
	}))

	return {
		exportedAt: new Date().toISOString(),
		userId,
		schemaVersion: 1,
		user: {
			id: user.id,
			email: user.email,
			username: user.username,
			name: user.name,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		},
		relations: {
			notes: notesWithUrls,
			connections: connections.map((c) => ({
				id: c.id,
				providerName: c.providerName,
				createdAt: c.createdAt,
			})),
			organizations: organizations.map((org) => ({
				organizationId: org.organizationId,
				organizationName: org.organization.name,
				role: org.organizationRole.name,
				joinedAt: org.createdAt,
			})),
			sessions: sessions.map((s) => ({
				id: s.id,
				createdAt: s.createdAt,
				expirationDate: s.expirationDate,
				ipAddress: s.ipAddress,
				userAgent: s.userAgent,
			})),
			feedback: feedback.map((f) => ({
				id: f.id,
				type: f.type,
				message: f.message,
				createdAt: f.createdAt,
			})),
		},
		files: {
			userImage: user.image
				? {
						objectKey: user.image.objectKey,
						url: domain + getUserImgSrc(user.image.objectKey),
					}
				: null,
			noteImages,
		},
		statistics: {
			totalNotes: notes.length,
			totalConnections: connections.length,
			totalOrganizations: organizations.length,
			totalSessions: sessions.length,
			totalFeedback: feedback.length,
		},
		redactions: [
			'password.hash',
			'refreshTokens.tokenHash',
			'apiKeys.key',
			'backupCodes.codeHash',
			'passkeys.publicKey',
			'ssoSessions.accessToken',
			'ssoSessions.refreshToken',
		],
	}
}
