import { auditService, AuditAction } from '@repo/audit'
import { requireUserWithRole } from '@repo/auth'
import { getDomainUrl, getUserImgSrc, getNoteImgSrc } from '@repo/common'
import { prisma } from '@repo/database'
import { type LoaderFunctionArgs } from 'react-router'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const adminId = await requireUserWithRole(request, 'admin')
	const { userId } = params

	if (!userId) {
		throw new Response('User ID required', { status: 400 })
	}

	const targetUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, email: true },
	})

	if (!targetUser) {
		throw new Response('User not found', { status: 404 })
	}

	const dsr = await prisma.dataSubjectRequest.create({
		data: {
			userId,
			type: 'export',
			status: 'processing',
			processedAt: new Date(),
			metadata: JSON.stringify({ adminInitiated: true, adminId }),
		},
	})

	await auditService.log({
		action: AuditAction.DATA_EXPORT_REQUESTED,
		userId: adminId,
		targetUserId: userId,
		details: `Admin initiated data export for user ${targetUser.email}`,
		resourceType: 'data_subject_request',
		resourceId: dsr.id,
		request,
		metadata: { adminAction: true },
		severity: 'info',
	})

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

	const exportData = {
		exportedAt: new Date().toISOString(),
		exportedBy: {
			adminId,
			reason: 'Admin-initiated GDPR data export',
		},
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

	await prisma.dataSubjectRequest.update({
		where: { id: dsr.id },
		data: {
			status: 'completed',
			completedAt: new Date(),
			metadata: JSON.stringify({
				adminInitiated: true,
				adminId,
				statistics: exportData.statistics,
			}),
		},
	})

	await auditService.log({
		action: AuditAction.DATA_EXPORT_COMPLETED,
		userId: adminId,
		targetUserId: userId,
		details: `Admin completed data export for user ${targetUser.email}`,
		resourceType: 'data_subject_request',
		resourceId: dsr.id,
		request,
		metadata: {
			adminAction: true,
			statistics: exportData.statistics,
		},
		severity: 'info',
	})

	const timestamp = new Date().toISOString().split('T')[0]
	const filename = `user-data-export-${user.username}-${timestamp}.json`

	return new Response(JSON.stringify(exportData, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store, no-cache, must-revalidate',
		},
	})
}
