import { auditService, AuditAction } from '@repo/audit'
import { getDomainUrl, getUserImgSrc, getNoteImgSrc } from '@repo/common'
import { prisma } from '@repo/database'
import { getClientIp } from '@repo/security'

export const GDPR_DELETION_GRACE_PERIOD_DAYS = 7

export type DataSubjectRequestType = 'export' | 'erasure'

export type DataSubjectRequestStatus =
	| 'requested'
	| 'processing'
	| 'scheduled'
	| 'completed'
	| 'cancelled'
	| 'failed'

export interface GdprRequestResult {
	success: boolean
	requestId?: string
	error?: string
	scheduledFor?: Date
}

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

async function getActiveRequest(
	userId: string,
	type: DataSubjectRequestType,
): Promise<{ id: string; status: string; scheduledFor: Date | null } | null> {
	return prisma.dataSubjectRequest.findFirst({
		where: {
			userId,
			type,
			status: { in: ['requested', 'processing', 'scheduled'] },
		},
		select: { id: true, status: true, scheduledFor: true },
	})
}

export async function createExportRequest(
	userId: string,
	request?: Request,
): Promise<GdprRequestResult> {
	const existingRequest = await getActiveRequest(userId, 'export')
	if (existingRequest) {
		return {
			success: false,
			error: 'An export request is already in progress',
			requestId: existingRequest.id,
		}
	}

	const ipAddress = request
		? getClientIp(request, { returnUndefined: true })
		: undefined
	const userAgent = request?.headers.get('user-agent') || undefined

	const dsr = await prisma.dataSubjectRequest.create({
		data: {
			userId,
			type: 'export',
			status: 'processing',
			processedAt: new Date(),
			ipAddress,
			userAgent,
		},
	})

	await auditService.log({
		action: AuditAction.DATA_EXPORT_REQUESTED,
		userId,
		details: 'User requested data export (GDPR Article 20)',
		resourceType: 'data_subject_request',
		resourceId: dsr.id,
		request,
		severity: 'info',
	})

	return {
		success: true,
		requestId: dsr.id,
	}
}

export async function generateUserDataExport(
	userId: string,
	requestId: string,
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

	const exportData: UserDataExport = {
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

	await prisma.dataSubjectRequest.update({
		where: { id: requestId },
		data: {
			status: 'completed',
			completedAt: new Date(),
			metadata: JSON.stringify({
				statistics: exportData.statistics,
				schemaVersion: exportData.schemaVersion,
			}),
		},
	})

	await auditService.log({
		action: AuditAction.DATA_EXPORT_COMPLETED,
		userId,
		details: 'Data export completed successfully',
		resourceType: 'data_subject_request',
		resourceId: requestId,
		request,
		metadata: {
			statistics: exportData.statistics,
		},
		severity: 'info',
	})

	return exportData
}

export async function createErasureRequest(
	userId: string,
	request?: Request,
): Promise<GdprRequestResult> {
	const existingRequest = await getActiveRequest(userId, 'erasure')
	if (existingRequest) {
		return {
			success: false,
			error: 'A deletion request is already pending',
			requestId: existingRequest.id,
			scheduledFor: existingRequest.scheduledFor || undefined,
		}
	}

	const userOrgsWithAdminRole = await prisma.userOrganization.findMany({
		where: {
			userId,
			organizationRole: {
				name: 'admin',
			},
		},
		include: {
			organization: {
				include: {
					users: {
						where: {
							organizationRole: {
								name: 'admin',
							},
						},
					},
				},
			},
		},
	})

	const blockingOrgs = userOrgsWithAdminRole.filter(
		(uo) => uo.organization.users.length === 1,
	)

	if (blockingOrgs.length > 0) {
		const orgNames = blockingOrgs.map((uo) => uo.organization.name).join(', ')
		return {
			success: false,
			error: `You are the sole admin of the following organizations: ${orgNames}. Please assign another admin before requesting account deletion.`,
		}
	}

	const scheduledFor = new Date()
	scheduledFor.setDate(scheduledFor.getDate() + GDPR_DELETION_GRACE_PERIOD_DAYS)

	const ipAddress = request
		? getClientIp(request, { returnUndefined: true })
		: undefined
	const userAgent = request?.headers.get('user-agent') || undefined

	const dsr = await prisma.dataSubjectRequest.create({
		data: {
			userId,
			type: 'erasure',
			status: 'scheduled',
			scheduledFor,
			ipAddress,
			userAgent,
		},
	})

	await prisma.session.deleteMany({
		where: {
			userId,
		},
	})

	await prisma.refreshToken.updateMany({
		where: { userId },
		data: { revoked: true },
	})

	await auditService.log({
		action: AuditAction.DATA_DELETION_REQUESTED,
		userId,
		details: `User requested account deletion (GDPR Article 17). Scheduled for ${scheduledFor.toISOString()}`,
		resourceType: 'data_subject_request',
		resourceId: dsr.id,
		request,
		metadata: {
			scheduledFor: scheduledFor.toISOString(),
			gracePeriodDays: GDPR_DELETION_GRACE_PERIOD_DAYS,
		},
		severity: 'warning',
	})

	return {
		success: true,
		requestId: dsr.id,
		scheduledFor,
	}
}

export async function cancelErasureRequest(
	userId: string,
	request?: Request,
): Promise<GdprRequestResult> {
	const activeRequest = await prisma.dataSubjectRequest.findFirst({
		where: {
			userId,
			type: 'erasure',
			status: 'scheduled',
			scheduledFor: { gt: new Date() },
		},
	})

	if (!activeRequest) {
		return {
			success: false,
			error: 'No active deletion request found to cancel',
		}
	}

	await prisma.dataSubjectRequest.update({
		where: { id: activeRequest.id },
		data: {
			status: 'cancelled',
			cancelledAt: new Date(),
		},
	})

	await auditService.log({
		action: AuditAction.DATA_DELETION_CANCELLED,
		userId,
		details: 'User cancelled account deletion request',
		resourceType: 'data_subject_request',
		resourceId: activeRequest.id,
		request,
		severity: 'info',
	})

	return {
		success: true,
		requestId: activeRequest.id,
	}
}

export async function getActiveErasureRequest(userId: string): Promise<{
	id: string
	status: string
	scheduledFor: Date | null
	requestedAt: Date
} | null> {
	return prisma.dataSubjectRequest.findFirst({
		where: {
			userId,
			type: 'erasure',
			status: { in: ['requested', 'processing', 'scheduled'] },
		},
		select: {
			id: true,
			status: true,
			scheduledFor: true,
			requestedAt: true,
		},
	})
}

export async function getLatestExportRequest(userId: string): Promise<{
	id: string
	status: string
	completedAt: Date | null
	requestedAt: Date
} | null> {
	return prisma.dataSubjectRequest.findFirst({
		where: {
			userId,
			type: 'export',
		},
		orderBy: { requestedAt: 'desc' },
		select: {
			id: true,
			status: true,
			completedAt: true,
			requestedAt: true,
		},
	})
}

export async function processDueErasureRequests(): Promise<{
	processed: number
	failed: number
	errors: Array<{ requestId: string; error: string }>
}> {
	const now = new Date()
	const dueRequests = await prisma.dataSubjectRequest.findMany({
		where: {
			type: 'erasure',
			status: 'scheduled',
			scheduledFor: { lte: now },
		},
		include: {
			user: {
				select: { id: true, email: true },
			},
		},
	})

	const results = {
		processed: 0,
		failed: 0,
		errors: [] as Array<{ requestId: string; error: string }>,
	}

	for (const dsr of dueRequests) {
		try {
			await prisma.dataSubjectRequest.update({
				where: { id: dsr.id },
				data: {
					status: 'processing',
					processedAt: new Date(),
				},
			})

			await prisma.user.delete({
				where: { id: dsr.userId },
			})

			await prisma.dataSubjectRequest.update({
				where: { id: dsr.id },
				data: {
					status: 'completed',
					completedAt: new Date(),
					executedAt: new Date(),
				},
			})

			await auditService.log({
				action: AuditAction.DATA_DELETION_COMPLETED,
				details: `User account deleted (GDPR Article 17). User ID: ${dsr.userId}`,
				resourceType: 'data_subject_request',
				resourceId: dsr.id,
				metadata: {
					userId: dsr.userId,
					requestedAt: dsr.requestedAt.toISOString(),
					scheduledFor: dsr.scheduledFor?.toISOString(),
				},
				severity: 'warning',
			})

			results.processed++
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			await prisma.dataSubjectRequest.update({
				where: { id: dsr.id },
				data: {
					status: 'failed',
					failureReason: errorMessage,
				},
			})

			await auditService.log({
				action: AuditAction.DATA_DELETION_FAILED,
				details: `Failed to delete user account: ${errorMessage}`,
				resourceType: 'data_subject_request',
				resourceId: dsr.id,
				metadata: {
					userId: dsr.userId,
					error: errorMessage,
				},
				severity: 'error',
			})

			results.failed++
			results.errors.push({ requestId: dsr.id, error: errorMessage })
		}
	}

	return results
}
