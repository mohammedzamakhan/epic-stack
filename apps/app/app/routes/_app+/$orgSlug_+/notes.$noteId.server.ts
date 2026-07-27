import { parseWithZod } from '@conform-to/zod'
import { logNoteActivity } from '@repo/audit'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
} from '@repo/auth'
import { prisma } from '@repo/database'
import { noteHooks, integrationManager } from '@repo/integrations'
import { data, type ActionFunctionArgs } from 'react-router'
import { invariantResponse } from '@epic-web/invariant'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { sanitizeCommentContent } from '#app/utils/content-sanitization.server.ts'
import { notifyCommentMentions, notifyNoteOwner } from '#app/utils/comment-notifications.server.ts'
import {
	DeleteFormSchema,
	ConnectNoteSchema,
	DisconnectNoteSchema,
	GetChannelsSchema,
	ShareNoteSchema,
	AddNoteAccessSchema,
	RemoveNoteAccessSchema,
	BatchUpdateNoteAccessSchema,
	AddCommentSchema,
	DeleteCommentSchema,
	ToggleFavoriteSchema,
} from './notes.$noteId'

export interface IntentContext extends ActionFunctionArgs {
	formData: FormData
	userId: string
}

export async function userHasOrgAccess(request: Request, organizationId: string) {
	await requireUserWithOrganizationPermission(
		request,
		organizationId,
		ORG_PERMISSIONS.READ_NOTE_OWN,
	)
}

export async function handleDeleteNoteIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: DeleteFormSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { noteId } = submission.value
	const note = await prisma.organizationNote.findFirst({
		select: {
			id: true,
			title: true,
			organizationId: true,
			createdById: true,
			organization: { select: { slug: true } },
		},
		where: { id: noteId },
	})
	invariantResponse(note, 'Not found', { status: 404 })

	let canDelete = false
	try {
		await requireUserWithOrganizationPermission(
			request,
			note.organizationId,
			ORG_PERMISSIONS.DELETE_NOTE_ANY,
		)
		canDelete = true
	} catch {
		if (note.createdById === userId) {
			try {
				await requireUserWithOrganizationPermission(
					request,
					note.organizationId,
					ORG_PERMISSIONS.DELETE_NOTE_OWN,
				)
				canDelete = true
			} catch {
				// No permissions
			}
		}
	}

	if (!canDelete) {
		throw new Response('Not authorized - insufficient delete permissions', {
			status: 403,
		})
	}

	await logNoteActivity({
		noteId: note.id,
		userId,
		action: 'deleted',
		metadata: { title: note.title || 'Untitled' },
	})

	await noteHooks.beforeNoteDeleted(note.id, userId)
	await prisma.organizationNote.delete({ where: { id: note.id } })

	return redirectWithToast(`/${note.organization.slug}/notes`, {
		type: 'success',
		title: 'Success',
		description: 'The note has been deleted.',
	})
}

export async function handleConnectChannelIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: ConnectNoteSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { noteId, integrationId, channelId } = submission.value
	const note = await prisma.organizationNote.findFirst({
		select: { organizationId: true },
		where: { id: noteId },
	})
	invariantResponse(note, 'Note not found', { status: 404 })
	await userHasOrgAccess(request, note.organizationId)

	try {
		await integrationManager.connectNoteToChannel({
			noteId,
			integrationId,
			externalId: channelId,
		})

		await logNoteActivity({
			noteId,
			userId,
			action: 'integration_connected',
			integrationId,
			metadata: { externalId: channelId },
		})

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to connect note to channel' } },
			{ status: 500 },
		)
	}
}

export async function handleDisconnectChannelIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: DisconnectNoteSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { connectionId } = submission.value
	const connection = await prisma.noteIntegrationConnection.findFirst({
		select: { note: { select: { organizationId: true } } },
		where: { id: connectionId },
	})
	invariantResponse(connection, 'Connection not found', { status: 404 })
	await userHasOrgAccess(request, connection.note.organizationId)

	try {
		const connectionDetails = await prisma.noteIntegrationConnection.findFirst({
			where: { id: connectionId },
			include: { integration: { select: { id: true, providerName: true } } },
		})

		await integrationManager.disconnectNoteFromChannel(connectionId)

		if (connectionDetails) {
			await logNoteActivity({
				noteId: connectionDetails.noteId,
				userId,
				action: 'integration_disconnected',
				integrationId: connectionDetails.integration.id,
				metadata: {
					externalId: connectionDetails.externalId,
					providerName: connectionDetails.integration.providerName,
				},
			})
		}

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to disconnect note from channel' } },
			{ status: 500 },
		)
	}
}

export async function handleGetChannelsIntent({ request, formData }: IntentContext) {
	const submission = parseWithZod(formData, { schema: GetChannelsSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { integrationId } = submission.value
	try {
		const integration = await integrationManager.getIntegration(integrationId)
		if (!integration) {
			return data({ error: 'Integration not found' }, { status: 404 })
		}

		await userHasOrgAccess(request, integration.organizationId)
		const channels = await integrationManager.getAvailableChannels(integrationId)
		return data({ channels })
	} catch (error) {
		return data({
			channels: [],
			error: error instanceof Error ? error.message : 'Failed to fetch channels',
		})
	}
}

export async function handleUpdateSharingIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: ShareNoteSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { noteId, isPublic } = submission.value
	const note = await prisma.organizationNote.findFirst({
		select: { organizationId: true, createdById: true },
		where: { id: noteId },
	})
	invariantResponse(note, 'Note not found', { status: 404 })
	await userHasOrgAccess(request, note.organizationId)

	if (note.createdById !== userId) {
		throw new Response('Not authorized', { status: 403 })
	}

	try {
		await prisma.organizationNote.update({
			where: { id: noteId },
			data: { isPublic },
		})

		if (isPublic) {
			await prisma.noteAccess.deleteMany({ where: { noteId } })
		}

		await logNoteActivity({
			noteId,
			userId,
			action: 'sharing_changed',
			metadata: { isPublic },
		})

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to update note sharing' } },
			{ status: 500 },
		)
	}
}

export async function handleAddAccessIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: AddNoteAccessSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { noteId, userId: targetUserId } = submission.value
	const note = await prisma.organizationNote.findFirst({
		select: { organizationId: true, createdById: true },
		where: { id: noteId },
	})
	invariantResponse(note, 'Note not found', { status: 404 })
	await userHasOrgAccess(request, note.organizationId)

	if (note.createdById !== userId) {
		throw new Response('Not authorized', { status: 403 })
	}

	const targetUserInOrg = await prisma.userOrganization.findFirst({
		where: {
			userId: targetUserId,
			organizationId: note.organizationId,
			active: true,
		},
	})

	if (!targetUserInOrg) {
		return data(
			{ result: { status: 'error', error: 'User is not a member of this organization' } },
			{ status: 400 },
		)
	}

	try {
		await prisma.noteAccess.upsert({
			where: { noteId_userId: { noteId, userId: targetUserId } },
			update: {},
			create: { noteId, userId: targetUserId },
		})

		await logNoteActivity({
			noteId,
			userId,
			action: 'access_granted',
			targetUserId,
		})

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to add note access' } },
			{ status: 500 },
		)
	}
}

export async function handleRemoveAccessIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: RemoveNoteAccessSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { noteId, userId: targetUserId } = submission.value
	const note = await prisma.organizationNote.findFirst({
		select: { organizationId: true, createdById: true },
		where: { id: noteId },
	})
	invariantResponse(note, 'Note not found', { status: 404 })
	await userHasOrgAccess(request, note.organizationId)

	if (note.createdById !== userId) {
		throw new Response('Not authorized', { status: 403 })
	}

	try {
		await prisma.noteAccess.deleteMany({
			where: { noteId, userId: targetUserId },
		})

		await logNoteActivity({
			noteId,
			userId,
			action: 'access_revoked',
			targetUserId,
		})

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to remove note access' } },
			{ status: 500 },
		)
	}
}

export async function handleBatchUpdateAccessIntent({ request, formData, userId }: IntentContext) {
	const usersToAdd = formData.getAll('usersToAdd') as string[]
	const usersToRemove = formData.getAll('usersToRemove') as string[]

	const parsedData = {
		intent: formData.get('intent') as 'batch-update-note-access',
		noteId: formData.get('noteId') as string,
		isPublic: formData.get('isPublic') as string,
		usersToAdd,
		usersToRemove,
	}

	const validationResult = BatchUpdateNoteAccessSchema.safeParse(parsedData)
	if (!validationResult.success) {
		return data(
			{ result: { status: 'error', error: 'Invalid form data' } },
			{ status: 400 },
		)
	}

	const { noteId, isPublic, usersToAdd: validUsersToAdd, usersToRemove: validUsersToRemove } = validationResult.data

	const note = await prisma.organizationNote.findFirst({
		select: { organizationId: true, createdById: true, isPublic: true },
		where: { id: noteId },
	})
	invariantResponse(note, 'Note not found', { status: 404 })
	await userHasOrgAccess(request, note.organizationId)

	if (note.createdById !== userId) {
		throw new Response('Not authorized', { status: 403 })
	}

	let confirmedUserIdsToAdd: string[] = []
	if (validUsersToAdd.length > 0 && !isPublic) {
		const orgMembers = await prisma.userOrganization.findMany({
			where: {
				userId: { in: validUsersToAdd },
				organizationId: note.organizationId,
				active: true,
			},
			select: { userId: true },
		})
		confirmedUserIdsToAdd = orgMembers.map((member) => member.userId)
		const invalidUsers = validUsersToAdd.filter(
			(id) => !confirmedUserIdsToAdd.includes(id),
		)
		if (invalidUsers.length > 0) {
			return data(
				{
					result: {
						status: 'error',
						error: `Some users are not members of this organization: ${invalidUsers.join(', ')}`,
					},
				},
				{ status: 400 },
			)
		}
	}

	try {
		let sharingChanged = false
		await prisma.$transaction(async (tx) => {
			if (isPublic !== note.isPublic) {
				await tx.organizationNote.update({
					where: { id: noteId },
					data: { isPublic },
				})
				sharingChanged = true
				if (isPublic) {
					await tx.noteAccess.deleteMany({ where: { noteId } })
					return
				}
			}

			if (validUsersToRemove.length > 0) {
				await tx.noteAccess.deleteMany({
					where: { noteId, userId: { in: validUsersToRemove } },
				})
				const revokedLogs = validUsersToRemove.map((targetUserId) => ({
					noteId,
					userId,
					action: 'access_revoked' as const,
					targetUserId,
				}))
				if (revokedLogs.length > 0) {
					await tx.noteActivityLog.createMany({ data: revokedLogs })
				}
			}

			if (confirmedUserIdsToAdd.length > 0 && !isPublic) {
				for (const targetUserId of confirmedUserIdsToAdd) {
					await tx.noteAccess.upsert({
						where: { noteId_userId: { noteId, userId: targetUserId } },
						update: {},
						create: { noteId, userId: targetUserId },
					})
				}

				const grantedLogs = confirmedUserIdsToAdd.map((targetUserId) => ({
					noteId,
					userId,
					action: 'access_granted' as const,
					targetUserId,
				}))
				if (grantedLogs.length > 0) {
					await tx.noteActivityLog.createMany({ data: grantedLogs })
				}
			}
		})

		if (sharingChanged) {
			await logNoteActivity({
				noteId,
				userId,
				action: 'sharing_changed',
				metadata: { isPublic },
			})
		}

		return data({ result: { status: 'success' } })
	} catch (error) {
		return data(
			{
				result: {
					status: 'error',
					error: error instanceof Error ? error.message : 'Failed to update note access',
				},
			},
			{ status: 500 },
		)
	}
}

export async function handleAddCommentIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: AddCommentSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { noteId, content, parentId } = submission.value
	const note = await prisma.organizationNote.findFirst({
		select: {
			organizationId: true,
			isPublic: true,
			createdById: true,
			noteAccess: { select: { userId: true } },
		},
		where: { id: noteId },
	})
	invariantResponse(note, 'Note not found', { status: 404 })

	await requireUserWithOrganizationPermission(
		request,
		note.organizationId,
		ORG_PERMISSIONS.CREATE_NOTE_OWN,
	)

	if (!note.isPublic) {
		try {
			await requireUserWithOrganizationPermission(
				request,
				note.organizationId,
				ORG_PERMISSIONS.READ_NOTE_ANY,
			)
		} catch {
			const hasPersonalAccess =
				note.createdById === userId ||
				note.noteAccess.some((access) => access.userId === userId)

			if (!hasPersonalAccess) {
				throw new Response('Not authorized - cannot comment on this note', {
					status: 403,
				})
			}
		}
	}

	if (parentId) {
		const parentComment = await prisma.noteComment.findFirst({
			where: { id: parentId, noteId },
		})
		if (!parentComment) {
			return data(
				{ result: { status: 'error', error: 'Parent comment not found' } },
				{ status: 404 },
			)
		}
	}

	try {
		const sanitizedContent = sanitizeCommentContent(content)
		const comment = await prisma.noteComment.create({
			data: {
				content: sanitizedContent,
				noteId,
				userId,
				parentId,
			},
		})

		const imageCount = parseInt(formData.get('imageCount') as string) || 0
		if (imageCount < 0 || imageCount > 10) {
			return data(
				{
					result: submission.reply({
						fieldErrors: {
							imageCount: ['Invalid image count. Maximum 10 images allowed.'],
						},
					}),
				},
				{ status: 400 },
			)
		}
		if (imageCount > 0) {
			const { uploadCommentImage } = await import('#app/utils/storage.server.ts')
			const imagePromises = []
			for (let i = 0; i < imageCount; i++) {
				const imageFile = formData.get(`image-${i}`) as File
				if (imageFile && imageFile.size > 0) {
					imagePromises.push(
						uploadCommentImage(
							userId,
							comment.id,
							imageFile,
							note.organizationId,
						).then((objectKey) => ({
							commentId: comment.id,
							objectKey,
							altText: null,
						})),
					)
				}
			}

			if (imagePromises.length > 0) {
				const uploadedImages = await Promise.all(imagePromises)
				await prisma.noteCommentImage.createMany({ data: uploadedImages })
			}
		}

		await logNoteActivity({
			noteId,
			userId,
			action: 'comment_added',
			commentId: comment.id,
			metadata: { parentId, hasImages: imageCount > 0 },
		})

		const [commenter, noteWithTitle, organization] = await Promise.all([
			prisma.user.findUnique({
				where: { id: userId },
				select: { name: true, username: true },
			}),
			prisma.organizationNote.findUnique({
				where: { id: noteId },
				select: { title: true, createdById: true },
			}),
			prisma.organization.findUnique({
				where: { id: note.organizationId },
				select: { slug: true },
			}),
		])

		if (commenter && noteWithTitle && organization) {
			const commenterName = commenter.name || commenter.username
			const noteTitle = noteWithTitle.title || 'Untitled Note'

			await notifyCommentMentions({
				commentContent: content,
				commentId: comment.id,
				noteId,
				noteTitle,
				commenterUserId: userId,
				commenterName,
				organizationId: note.organizationId,
				organizationSlug: organization.slug,
			})

			await notifyNoteOwner({
				noteId,
				noteTitle,
				noteOwnerId: noteWithTitle.createdById,
				commentId: comment.id,
				commenterUserId: userId,
				commenterName,
				commentContent: content,
				organizationId: note.organizationId,
				organizationSlug: organization.slug,
			})
		}

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to add comment' } },
			{ status: 500 },
		)
	}
}

export async function handleDeleteCommentIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: DeleteCommentSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { commentId } = submission.value
	const comment = await prisma.noteComment.findFirst({
		select: {
			userId: true,
			note: { select: { organizationId: true } },
		},
		where: { id: commentId },
	})
	invariantResponse(comment, 'Comment not found', { status: 404 })
	await userHasOrgAccess(request, comment.note.organizationId)

	if (comment.userId !== userId) {
		throw new Response('Not authorized', { status: 403 })
	}

	try {
		const commentToDelete = await prisma.noteComment.findFirst({
			where: { id: commentId },
			select: { noteId: true },
		})

		await prisma.noteComment.delete({ where: { id: commentId } })

		if (commentToDelete) {
			await logNoteActivity({
				noteId: commentToDelete.noteId,
				userId,
				action: 'comment_deleted',
				commentId,
			})
		}

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to delete comment' } },
			{ status: 500 },
		)
	}
}

export async function handleToggleFavoriteIntent({ request, formData, userId }: IntentContext) {
	const submission = parseWithZod(formData, { schema: ToggleFavoriteSchema })
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { noteId } = submission.value
	const note = await prisma.organizationNote.findFirst({
		select: {
			organizationId: true,
			isPublic: true,
			createdById: true,
			noteAccess: { select: { userId: true } },
		},
		where: { id: noteId },
	})
	invariantResponse(note, 'Note not found', { status: 404 })

	await requireUserWithOrganizationPermission(
		request,
		note.organizationId,
		ORG_PERMISSIONS.READ_NOTE_OWN,
	)

	if (!note.isPublic) {
		try {
			await requireUserWithOrganizationPermission(
				request,
				note.organizationId,
				ORG_PERMISSIONS.READ_NOTE_ANY,
			)
		} catch {
			const hasPersonalAccess =
				note.createdById === userId ||
				note.noteAccess.some((access) => access.userId === userId)

			if (!hasPersonalAccess) {
				throw new Response('Not authorized - cannot favorite this note', {
					status: 403,
				})
			}
		}
	}

	try {
		const existingFavorite = await prisma.organizationNoteFavorite.findFirst({
			where: { userId, noteId },
		})

		if (existingFavorite) {
			await prisma.organizationNoteFavorite.delete({
				where: { id: existingFavorite.id },
			})
		} else {
			await prisma.organizationNoteFavorite.create({
				data: { userId, noteId },
			})
		}

		return data({ result: { status: 'success' } })
	} catch {
		return data(
			{ result: { status: 'error', error: 'Failed to toggle favorite' } },
			{ status: 500 },
		)
	}
}
