import { getDomainUrl, getUserImgSrc, getNoteImgSrc } from './misc.js'
import {
	Connection,
	db,
	eq,
	Feedback,
	Note,
	NoteImage,
	Organization,
	OrganizationRole,
	Session,
	User,
	UserImage,
	UserOrganization,
} from '@repo/database'

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

	const [
		[user],
		notes,
		noteImagesRows,
		connections,
		organizations,
		sessions,
		feedback,
	] = await Promise.all([
		db
			.select({
				id: User.id,
				email: User.email,
				username: User.username,
				name: User.name,
				createdAt: User.createdAt,
				updatedAt: User.updatedAt,
				image: { objectKey: UserImage.objectKey },
			})
			.from(User)
			.leftJoin(UserImage, eq(UserImage.userId, User.id))
			.where(eq(User.id, userId))
			.limit(1),
		db
			.select({
				id: Note.id,
				title: Note.title,
				content: Note.content,
				createdAt: Note.createdAt,
				updatedAt: Note.updatedAt,
			})
			.from(Note)
			.where(eq(Note.ownerId, userId)),
		db
			.select({
				noteId: NoteImage.noteId,
				id: NoteImage.id,
				altText: NoteImage.altText,
				objectKey: NoteImage.objectKey,
				createdAt: NoteImage.createdAt,
			})
			.from(NoteImage)
			.innerJoin(Note, eq(NoteImage.noteId, Note.id))
			.where(eq(Note.ownerId, userId)),
		db
			.select({
				id: Connection.id,
				providerName: Connection.providerName,
				createdAt: Connection.createdAt,
			})
			.from(Connection)
			.where(eq(Connection.userId, userId)),
		db
			.select({
				organizationId: UserOrganization.organizationId,
				organizationName: Organization.name,
				role: OrganizationRole.name,
				createdAt: UserOrganization.createdAt,
			})
			.from(UserOrganization)
			.innerJoin(
				Organization,
				eq(UserOrganization.organizationId, Organization.id),
			)
			.innerJoin(
				OrganizationRole,
				eq(UserOrganization.organizationRoleId, OrganizationRole.id),
			)
			.where(eq(UserOrganization.userId, userId)),
		db
			.select({
				id: Session.id,
				createdAt: Session.createdAt,
				expirationDate: Session.expirationDate,
				ipAddress: Session.ipAddress,
				userAgent: Session.userAgent,
			})
			.from(Session)
			.where(eq(Session.userId, userId)),
		db
			.select({
				id: Feedback.id,
				type: Feedback.type,
				message: Feedback.message,
				createdAt: Feedback.createdAt,
			})
			.from(Feedback)
			.where(eq(Feedback.userId, userId)),
	])

	if (!user) throw new Error(`User ${userId} not found`)

	const noteImages: Array<{ noteId: string; objectKey: string; url: string }> =
		[]
	const notesWithUrls = notes.map((note) => ({
		id: note.id,
		title: note.title,
		content: note.content,
		createdAt: note.createdAt,
		updatedAt: note.updatedAt,
		images: noteImagesRows
			.filter((image) => image.noteId === note.id)
			.map((image) => {
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
				organizationName: org.organizationName,
				role: org.role,
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
			userImage: user.image?.objectKey
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
