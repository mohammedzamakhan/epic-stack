import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { noteHooks, integrationManager } from '@repo/integrations'
import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useRef, useEffect } from 'react'
import {
	data,
	Form,
	Link,
	useLoaderData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { IntegrationControls } from '#app/components/note/integration-controls'
import { ShareNoteButton } from '#app/components/note/share-note-button.tsx'
import { CommentsSection } from '#app/components/note/comments-section.tsx'
import { ActivityLog } from '#app/components/note/activity-log.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { SheetHeader, SheetTitle } from '#app/components/ui/sheet.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId, getUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getNoteImgSrc, useIsPending } from '#app/utils/misc.tsx'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { logNoteActivity, getNoteActivityLogs } from '#app/utils/activity-log.server.ts'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const noteId = params.noteId

	const note = await prisma.organizationNote.findUnique({
		where: { id: noteId },
		select: {
			id: true,
			title: true,
			content: true,
			createdById: true,
			organizationId: true,
			updatedAt: true,
			isPublic: true,
			images: {
				select: {
					altText: true,
					objectKey: true,
				},
			},
			organization: {
				select: {
					slug: true,
				},
			},
			noteAccess: {
				select: {
					id: true,
					user: {
						select: {
							id: true,
							name: true,
							username: true,
						},
					},
				},
			},
		},
	})

	invariantResponse(note, 'Not found', { status: 404 })

	// Check if the user has access to this organization
	await userHasOrgAccess(request, note.organizationId)

	// Check if user has access to this specific note
	if (!note.isPublic) {
		const hasAccess = note.createdById === userId || 
			note.noteAccess.some(access => access.user.id === userId)
		
		if (!hasAccess) {
			throw new Response('Not authorized', { status: 403 })
		}
	}

	const date = new Date(note.updatedAt)
	const timeAgo = formatDistanceToNow(date)

	// Get organization members for sharing
	const organizationMembers = await prisma.userOrganization.findMany({
		where: {
			organizationId: note.organizationId,
			active: true,
		},
		select: {
			userId: true,
			user: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
		},
	})

	// Get integration data for this note
	const [connections, availableIntegrations, comments] = await Promise.all([
		integrationManager.getNoteConnections(note.id),
		integrationManager.getOrganizationIntegrations(note.organizationId),
		// Get comments for this note
		prisma.noteComment.findMany({
			where: { noteId: note.id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						username: true,
					},
				},
			},
			orderBy: { createdAt: 'asc' },
		}),
	])

	// Organize comments into a tree structure
	const organizeComments = (comments: any[]) => {
		const commentMap = new Map<string, any>()
		const rootComments: any[] = []

		// First pass: create map of all comments
		comments.forEach(comment => {
			commentMap.set(comment.id, { ...comment, replies: [] })
		})

		// Second pass: organize into tree structure
		comments.forEach(comment => {
			if (comment.parentId) {
				const parent = commentMap.get(comment.parentId)
				if (parent) {
					parent.replies.push(commentMap.get(comment.id))
				}
			} else {
				rootComments.push(commentMap.get(comment.id))
			}
		})

		return rootComments
	}

	const organizedComments = organizeComments(comments)

	// Get recent activity logs for this note
	const activityLogs = await getNoteActivityLogs(note.id, 20)

	return {
		note,
		timeAgo,
		currentUserId: userId,
		organizationMembers,
		comments: organizedComments,
		activityLogs,
		connections: connections.map((conn) => ({
			id: conn.id,
			externalId: conn.externalId,
			config: conn.config ? JSON.parse(conn.config as string) : {},
			integration: {
				id: conn.integration.id,
				providerName: conn.integration.providerName,
				providerType: conn.integration.providerType,
				isActive: conn.integration.isActive,
			},
		})),
		availableIntegrations: availableIntegrations.map((int) => ({
			id: int.id,
			providerName: int.providerName,
			providerType: int.providerType,
			isActive: int.isActive,
		})),
	}
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-note'),
	noteId: z.string(),
})

const ConnectNoteSchema = z.object({
	intent: z.literal('connect-note-to-channel'),
	noteId: z.string(),
	integrationId: z.string(),
	channelId: z.string(),
})

const DisconnectNoteSchema = z.object({
	intent: z.literal('disconnect-note-from-channel'),
	connectionId: z.string(),
})

const GetChannelsSchema = z.object({
	intent: z.literal('get-integration-channels'),
	integrationId: z.string(),
})

const ShareNoteSchema = z.object({
	intent: z.literal('update-note-sharing'),
	noteId: z.string(),
	isPublic: z
		.string()
		.transform((val) => val === 'true')
		.pipe(z.boolean()),
})

const AddNoteAccessSchema = z.object({
	intent: z.literal('add-note-access'),
	noteId: z.string(),
	userId: z.string(),
})

const RemoveNoteAccessSchema = z.object({
	intent: z.literal('remove-note-access'),
	noteId: z.string(),
	userId: z.string(),
})

const BatchUpdateNoteAccessSchema = z.object({
	intent: z.literal('batch-update-note-access'),
	noteId: z.string(),
	isPublic: z
		.string()
		.transform((val) => val === 'true')
		.pipe(z.boolean()),
	usersToAdd: z.array(z.string()).optional().default([]),
	usersToRemove: z.array(z.string()).optional().default([]),
})

const AddCommentSchema = z.object({
	intent: z.literal('add-comment'),
	noteId: z.string(),
	content: z.string().min(1, 'Comment cannot be empty'),
	parentId: z.string().optional(),
})

const DeleteCommentSchema = z.object({
	intent: z.literal('delete-comment'),
	commentId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	// Handle different intents
	if (intent === 'delete-note') {
		const submission = parseWithZod(formData, {
			schema: DeleteFormSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId } = submission.value

		// Get the organization note
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

		// Check if user has access to this organization
		await userHasOrgAccess(request, note.organizationId)

		// Only the note creator or organization admin can delete
		// Check if user is creator or admin
		const userOrg = await prisma.userOrganization.findFirst({
			where: {
				userId,
				organizationId: note.organizationId,
				OR: [{ role: 'admin' }, { userId: note.createdById }],
			},
		})

		if (!userOrg) {
			throw new Response('Not authorized', { status: 403 })
		}

		// Log deletion activity before deleting
		await logNoteActivity({
			noteId: note.id,
			userId,
			action: 'deleted',
			metadata: { title: note.title || 'Untitled' },
		})

		// Trigger deletion hook before deleting the note
		await noteHooks.beforeNoteDeleted(note.id, userId)

		// Delete the note
		await prisma.organizationNote.delete({ where: { id: note.id } })

		return redirectWithToast(`/app/${note.organization.slug}/notes`, {
			type: 'success',
			title: 'Success',
			description: 'The note has been deleted.',
		})
	}

	if (intent === 'connect-note-to-channel') {
		const submission = parseWithZod(formData, {
			schema: ConnectNoteSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId, integrationId, channelId } = submission.value

		// Get the note to verify access
		const note = await prisma.organizationNote.findFirst({
			select: { organizationId: true },
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, note.organizationId)

		try {
			await integrationManager.connectNoteToChannel({
				noteId,
				integrationId,
				externalId: channelId,
			})

			// Log integration connection activity
			await logNoteActivity({
				noteId,
				userId,
				action: 'integration_connected',
				integrationId,
				metadata: { externalId: channelId },
			})

			return data({ result: { status: 'success' } })
		} catch (error) {
			console.error('Error connecting note to channel:', error)
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to connect note to channel',
					},
				},
				{ status: 500 },
			)
		}
	}

	if (intent === 'disconnect-note-from-channel') {
		const submission = parseWithZod(formData, {
			schema: DisconnectNoteSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { connectionId } = submission.value

		// Get the connection to verify access
		const connection = await prisma.noteIntegrationConnection.findFirst({
			select: {
				note: {
					select: { organizationId: true },
				},
			},
			where: { id: connectionId },
		})
		invariantResponse(connection, 'Connection not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, connection.note.organizationId)

		try {
			// Get connection details before disconnecting for logging
			const connectionDetails = await prisma.noteIntegrationConnection.findFirst({
				where: { id: connectionId },
				include: {
					integration: {
						select: { id: true, providerName: true },
					},
				},
			})

			await integrationManager.disconnectNoteFromChannel(connectionId)

			// Log integration disconnection activity
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
		} catch (error) {
			console.error('Error disconnecting note from channel:', error)
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to disconnect note from channel',
					},
				},
				{ status: 500 },
			)
		}
	}

	if (intent === 'get-integration-channels') {
		const submission = parseWithZod(formData, {
			schema: GetChannelsSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { integrationId } = submission.value

		try {
			// Get the integration to verify access
			const integration = await integrationManager.getIntegration(integrationId)
			if (!integration) {
				return data({ error: 'Integration not found' }, { status: 404 })
			}

			// Check if user has access to this organization
			await userHasOrgAccess(request, integration.organizationId)

			// Get available channels for this integration
			const channels =
				await integrationManager.getAvailableChannels(integrationId)

			return data({ channels })
		} catch (error) {
			console.error('Error fetching integration channels:', error)

			// For demo purposes, return empty channels array instead of error
			// This allows the UI to show "No channels available" instead of crashing
			return data({
				channels: [],
				error:
					error instanceof Error ? error.message : 'Failed to fetch channels',
			})
		}
	}

	if (intent === 'update-note-sharing') {
		console.log('Received update-note-sharing intent', { formData: Object.fromEntries(formData) })
		
		const submission = parseWithZod(formData, {
			schema: ShareNoteSchema,
		})
		
		console.log('Submission result:', submission)
		
		if (submission.status !== 'success') {
			console.log('Submission failed:', submission)
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId, isPublic } = submission.value
		console.log('Parsed values:', { noteId, isPublic })

		// Get the note to verify access
		const note = await prisma.organizationNote.findFirst({
			select: { organizationId: true, createdById: true },
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, note.organizationId)

		// Only the note creator can change sharing settings
		if (note.createdById !== userId) {
			throw new Response('Not authorized', { status: 403 })
		}

		try {
			console.log('Updating note with:', { noteId, isPublic })
			await prisma.organizationNote.update({
				where: { id: noteId },
				data: { isPublic },
			})

			// If making note public, remove all specific access entries
			if (isPublic) {
				await prisma.noteAccess.deleteMany({
					where: { noteId },
				})
			}

			// Log sharing change activity
			await logNoteActivity({
				noteId,
				userId,
				action: 'sharing_changed',
				metadata: { isPublic },
			})

			console.log('Successfully updated note sharing')
			return data({ result: { status: 'success' } })
		} catch (error) {
			console.error('Error updating note sharing:', error)
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to update note sharing',
					},
				},
				{ status: 500 },
			)
		}
	}

	if (intent === 'add-note-access') {
		const submission = parseWithZod(formData, {
			schema: AddNoteAccessSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId, userId: targetUserId } = submission.value

		// Get the note to verify access
		const note = await prisma.organizationNote.findFirst({
			select: { organizationId: true, createdById: true },
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, note.organizationId)

		// Only the note creator can manage access
		if (note.createdById !== userId) {
			throw new Response('Not authorized', { status: 403 })
		}

		// Verify target user is in the organization
		const targetUserInOrg = await prisma.userOrganization.findFirst({
			where: {
				userId: targetUserId,
				organizationId: note.organizationId,
				active: true,
			},
		})

		if (!targetUserInOrg) {
			return data(
				{
					result: {
						status: 'error',
						error: 'User is not a member of this organization',
					},
				},
				{ status: 400 },
			)
		}

		try {
			await prisma.noteAccess.upsert({
				where: {
					noteId_userId: {
						noteId,
						userId: targetUserId,
					},
				},
				update: {},
				create: {
					noteId,
					userId: targetUserId,
				},
			})

			// Log access granted activity
			await logNoteActivity({
				noteId,
				userId,
				action: 'access_granted',
				targetUserId,
			})

			return data({ result: { status: 'success' } })
		} catch (error) {
			console.error('Error adding note access:', error)
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to add note access',
					},
				},
				{ status: 500 },
			)
		}
	}

	if (intent === 'remove-note-access') {
		const submission = parseWithZod(formData, {
			schema: RemoveNoteAccessSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId, userId: targetUserId } = submission.value

		// Get the note to verify access
		const note = await prisma.organizationNote.findFirst({
			select: { organizationId: true, createdById: true },
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, note.organizationId)

		// Only the note creator can manage access
		if (note.createdById !== userId) {
			throw new Response('Not authorized', { status: 403 })
		}

		try {
			await prisma.noteAccess.deleteMany({
				where: {
					noteId,
					userId: targetUserId,
				},
			})

			// Log access revoked activity
			await logNoteActivity({
				noteId,
				userId,
				action: 'access_revoked',
				targetUserId,
			})

			return data({ result: { status: 'success' } })
		} catch (error) {
			console.error('Error removing note access:', error)
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to remove note access',
					},
				},
				{ status: 500 },
			)
		}
	}

	if (intent === 'batch-update-note-access') {
		console.log('Received batch-update-note-access intent')
		
		// Manually parse the arrays since FormData can have multiple values with same key
		const usersToAdd = formData.getAll('usersToAdd') as string[]
		const usersToRemove = formData.getAll('usersToRemove') as string[]

		const parsedData = {
			intent: formData.get('intent') as 'batch-update-note-access',
			noteId: formData.get('noteId') as string,
			isPublic: formData.get('isPublic') as string,
			usersToAdd,
			usersToRemove,
		}

		console.log('Parsed form data:', parsedData)

		// Validate the parsed data
		const validationResult = BatchUpdateNoteAccessSchema.safeParse(parsedData)
		if (!validationResult.success) {
			console.log('Validation failed:', validationResult.error)
			return data(
				{ result: { status: 'error', error: 'Invalid form data' } },
				{ status: 400 },
			)
		}

		const { noteId, isPublic, usersToAdd: validUsersToAdd, usersToRemove: validUsersToRemove } = validationResult.data
		console.log('Validated data:', { noteId, isPublic, validUsersToAdd, validUsersToRemove })

		// Get the note to verify access
		const note = await prisma.organizationNote.findFirst({
			select: { organizationId: true, createdById: true, isPublic: true },
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, note.organizationId)

		// Only the note creator can manage access
		if (note.createdById !== userId) {
			throw new Response('Not authorized', { status: 403 })
		}

		try {
			// Use a transaction to ensure all operations succeed or fail together
			await prisma.$transaction(async (tx) => {
				console.log('Starting transaction. Current note.isPublic:', note.isPublic, 'New isPublic:', isPublic)
				
				// Update public/private status if changed
				if (isPublic !== note.isPublic) {
					console.log('Updating note public status to:', isPublic)
					await tx.organizationNote.update({
						where: { id: noteId },
						data: { isPublic },
					})

					// Log sharing change activity
					await logNoteActivity({
						noteId,
						userId,
						action: 'sharing_changed',
						metadata: { isPublic },
					})

					// If making note public, remove all specific access entries
					if (isPublic) {
						console.log('Making note public, removing all access entries')
						await tx.noteAccess.deleteMany({
							where: { noteId },
						})
						console.log('Successfully made note public and removed access entries')
						return // No need to process user additions/removals if making public
					}
				}

				// Remove users (do this first to avoid conflicts)
				if (validUsersToRemove.length > 0) {
					await tx.noteAccess.deleteMany({
						where: {
							noteId,
							userId: { in: validUsersToRemove },
						},
					})

					// Log access revoked for each user
					for (const targetUserId of validUsersToRemove) {
						await logNoteActivity({
							noteId,
							userId,
							action: 'access_revoked',
							targetUserId,
						})
					}
				}

				// Add users (only if note is private)
				if (validUsersToAdd.length > 0 && !isPublic) {
					// Verify all target users are in the organization
					const validOrgMembers = await tx.userOrganization.findMany({
						where: {
							userId: { in: validUsersToAdd },
							organizationId: note.organizationId,
							active: true,
						},
						select: { userId: true },
					})

					const validUserIds = validOrgMembers.map(member => member.userId)
					const invalidUsers = validUsersToAdd.filter(id => !validUserIds.includes(id))

					if (invalidUsers.length > 0) {
						throw new Error(`Some users are not members of this organization: ${invalidUsers.join(', ')}`)
					}

					// Create access entries for valid users
					const accessEntries = validUserIds.map(userId => ({
						noteId,
						userId,
					}))

					// Create access entries for valid users, handling duplicates manually
					for (const targetUserId of validUserIds) {
						await tx.noteAccess.upsert({
							where: {
								noteId_userId: {
									noteId,
									userId: targetUserId,
								},
							},
							update: {},
							create: {
								noteId,
								userId: targetUserId,
							},
						})

						// Log access granted for each user
						await logNoteActivity({
							noteId,
							userId,
							action: 'access_granted',
							targetUserId,
						})
					}
				}
			})

			console.log('Batch update completed successfully')
			return data({ result: { status: 'success' } })
		} catch (error) {
			console.error('Error in batch update note access:', error)
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

	if (intent === 'add-comment') {
		const submission = parseWithZod(formData, {
			schema: AddCommentSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId, content, parentId } = submission.value

		// Get the note to verify access
		const note = await prisma.organizationNote.findFirst({
			select: { 
				organizationId: true, 
				isPublic: true, 
				createdById: true,
				noteAccess: {
					select: { userId: true }
				}
			},
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, note.organizationId)

		// Check if user has access to this specific note
		if (!note.isPublic) {
			const hasAccess = note.createdById === userId || 
				note.noteAccess.some(access => access.userId === userId)
			
			if (!hasAccess) {
				throw new Response('Not authorized', { status: 403 })
			}
		}

		// If parentId is provided, verify the parent comment exists and belongs to this note
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
			const comment = await prisma.noteComment.create({
				data: {
					content,
					noteId,
					userId,
					parentId,
				},
			})

			// Log comment added activity
			await logNoteActivity({
				noteId,
				userId,
				action: 'comment_added',
				commentId: comment.id,
				metadata: { parentId },
			})

			return data({ result: { status: 'success' } })
		} catch (error) {
			console.error('Error adding comment:', error)
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to add comment',
					},
				},
				{ status: 500 },
			)
		}
	}

	if (intent === 'delete-comment') {
		const submission = parseWithZod(formData, {
			schema: DeleteCommentSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { commentId } = submission.value

		// Get the comment to verify access
		const comment = await prisma.noteComment.findFirst({
			select: { 
				userId: true,
				note: {
					select: { organizationId: true }
				}
			},
			where: { id: commentId },
		})
		invariantResponse(comment, 'Comment not found', { status: 404 })

		// Check if user has access to this organization
		await userHasOrgAccess(request, comment.note.organizationId)

		// Only the comment author can delete their comment
		if (comment.userId !== userId) {
			throw new Response('Not authorized', { status: 403 })
		}

		try {
			// Get note ID before deleting comment
			const commentToDelete = await prisma.noteComment.findFirst({
				where: { id: commentId },
				select: { noteId: true },
			})

			await prisma.noteComment.delete({
				where: { id: commentId },
			})

			// Log comment deleted activity
			if (commentToDelete) {
				await logNoteActivity({
					noteId: commentToDelete.noteId,
					userId,
					action: 'comment_deleted',
					commentId,
				})
			}

			return data({ result: { status: 'success' } })
		} catch (error) {
			console.error('Error deleting comment:', error)
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to delete comment',
					},
				},
				{ status: 500 },
			)
		}
	}

	return data(
		{ result: { status: 'error', error: 'Invalid intent' } },
		{ status: 400 },
	)
}

type NoteLoaderData = {
	note: {
		id: string
		title: string
		content: string
		createdById: string
		isPublic: boolean
		images: { altText: string | null; objectKey: string }[]
		organization: { slug: string }
		noteAccess: Array<{
			id: string
			user: {
				id: string
				name: string | null
				username: string
			}
		}>
	}
	timeAgo: string
	currentUserId: string
	organizationMembers: Array<{
		userId: string
		user: {
			id: string
			name: string | null
			username: string
		}
	}>
	comments: Array<{
		id: string
		content: string
		createdAt: string
		user: {
			id: string
			name: string | null
			username: string
		}
		replies: any[]
	}>
	activityLogs: Array<{
		id: string
		action: string
		metadata: string | null
		createdAt: Date
		user: {
			id: string
			name: string | null
			username: string
		}
		targetUser?: {
			id: string
			name: string | null
			username: string
		} | null
		integration?: {
			id: string
			providerName: string
			providerType: string
		} | null
	}>
	connections: Array<{
		id: string
		externalId: string
		config: any
		integration: {
			id: string
			providerName: string
			providerType: string
			isActive: boolean
		}
	}>
	availableIntegrations: Array<{
		id: string
		providerName: string
		providerType: string
		isActive: boolean
	}>
}

export default function NoteRoute() {
	const { note, timeAgo, currentUserId, organizationMembers, comments, activityLogs, connections, availableIntegrations } =
		useLoaderData() as NoteLoaderData

	// Add ref for auto-focusing
	const sectionRef = useRef<HTMLElement>(null)

	// Focus the section when the note ID changes
	useEffect(() => {
		if (sectionRef.current) {
			sectionRef.current.focus()
		}
	}, [note.id])

	// Convert organization members to mention users format
	const mentionUsers = organizationMembers.map(member => ({
		id: member.user.id,
		name: member.user.name || member.user.username,
		email: member.user.username, // Using username as email placeholder
	}))

	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle>{note.title}</SheetTitle>
			</SheetHeader>
			<section
				ref={sectionRef}
				className="flex h-full flex-col"
				aria-labelledby="note-title"
				tabIndex={-1} // Make the section focusable without keyboard navigation
			>
				<div className="overflow-y-auto px-6 pb-8">
					<ul className="flex flex-wrap gap-5 py-5">
						{note.images.map((image) => (
							<li key={image.objectKey}>
								<a href={getNoteImgSrc(image.objectKey)}>
									<Img
										src={getNoteImgSrc(image.objectKey)}
										alt={image.altText ?? ''}
										className="size-32 rounded-lg object-cover"
										width={512}
										height={512}
									/>
								</a>
							</li>
						))}
					</ul>
					<p className="text-sm whitespace-break-spaces md:text-lg">
						{note.content}
					</p>

					{/* Comments Section */}
					<CommentsSection
						noteId={note.id}
						comments={comments}
						currentUserId={currentUserId}
						users={mentionUsers}
					/>

					{/* Activity Log Section */}
					<ActivityLog activityLogs={activityLogs} />
				</div>
				<div className={floatingToolbarClassName}>
					<span className="text-foreground/90 text-sm max-[524px]:hidden">
						<Icon name="clock" className="scale-125">
							{timeAgo} ago
						</Icon>
					</span>
					<div className="flex flex-1 justify-end gap-2 md:gap-4">
						<ShareNoteButton
							noteId={note.id}
							isPublic={note.isPublic}
							noteAccess={note.noteAccess}
							organizationMembers={organizationMembers}
						/>
						<IntegrationControls
							noteId={note.id}
							connections={connections}
							availableIntegrations={availableIntegrations}
						/>
						<DeleteNote id={note.id} />
						<Button
							asChild
							className="min-[525px]:max-md:aspect-square min-[525px]:max-md:px-0"
						>
							<Link to="edit">
								<Icon name="pencil-1" className="scale-125 max-md:scale-150">
									<span className="max-md:hidden">Edit</span>
								</Icon>
							</Link>
						</Button>
					</div>
				</div>
			</section>
		</>
	)
}

export function DeleteNote({ id }: { id: string }) {
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-note',
	})

	return (
		<Form method="POST" {...getFormProps(form)}>
			<input type="hidden" name="noteId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-note"
				variant="destructive"
				status={isPending ? 'pending' : (form.status ?? 'idle')}
				disabled={isPending}
				className="w-full max-md:aspect-square max-md:px-0"
			>
				<Icon name="trash" className="scale-125 max-md:scale-150">
					<span className="max-md:hidden">Delete</span>
				</Icon>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>You do not have permission to view this note</p>,
				404: ({ params }) => (
					<p>No note with the id "{params.noteId}" exists</p>
				),
			}}
		/>
	)
}
