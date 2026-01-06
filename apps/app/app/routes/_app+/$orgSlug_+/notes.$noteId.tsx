import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { Trans } from '@lingui/macro'
import { prisma } from '@repo/database'
import { noteHooks, integrationManager } from '@repo/integrations'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { StatusButton } from '@repo/ui/status-button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@repo/ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useRef, useEffect, useState, lazy, Suspense, Component } from 'react'
import {
	Form,
	Link,
	useLoaderData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	data,
} from 'react-router'
import { z } from 'zod'

// Simple error boundary for lazy-loaded components
class LazyLoadErrorBoundary extends Component<
	{ children: React.ReactNode; fallback: React.ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback
		}
		return this.props.children
	}
}

// Lazy load AIChat component for better performance
const AIChat = lazy(() =>
	import('@repo/ai').then((module) => ({
		default: module.AIChat,
	})),
)
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { ActivityLog } from '#app/components/note/activity-log.tsx'
import { CommentsSection } from '#app/components/note/comments-section.tsx'
import { IntegrationControls } from '#app/components/note/integration-controls.tsx'
import { ShareNoteButton } from '#app/components/note/share-note-button.tsx'
import {
	CanEditNote,
	CanDeleteNote,
} from '#app/components/permissions/permission-guard.tsx'

import {
	logNoteActivity,
	getNoteActivityLogs,
} from '#app/utils/audit/activity-log.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { sanitizeCommentContent } from '#app/utils/content-sanitization.server.ts'
import { getNoteImgSrc, getUserImgSrc, useIsPending } from '#app/utils/misc.tsx'
import {
	notifyCommentMentions,
	notifyNoteOwner,
} from '#app/utils/notifications.server.ts'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
	getUserOrganizationPermissionsForClient,
} from '#app/utils/organization/permissions.server.ts'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

// Define comment types based on Prisma query structure
type CommentWithUser = {
	id: string
	content: string
	createdAt: Date
	parentId: string | null
	user: {
		id: string
		name: string | null
		username: string
		image: { objectKey: string } | null
	}
	images: {
		id: string
		altText: string | null
		objectKey: string
	}[]
	replies?: CommentWithReplies[]
}

type CommentWithReplies = CommentWithUser & {
	replies: CommentWithReplies[]
}

// Serialized comment type (what the client receives after loader serialization)
type SerializedComment = Omit<CommentWithReplies, 'createdAt' | 'replies'> & {
	createdAt: string
	replies: SerializedComment[]
}

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
			uploads: {
				select: {
					type: true,
					altText: true,
					objectKey: true,
					thumbnailKey: true,
					status: true,
				},
			},
			organization: {
				select: {
					slug: true,
					id: true,
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

	// Check if user has permission to read notes in this organization
	// This will automatically verify organization access and specific permissions
	await requireUserWithOrganizationPermission(
		request,
		note.organizationId,
		ORG_PERMISSIONS.READ_NOTE_OWN, // Users need at least read access to own notes
	)

	// Enhanced permission-based access check for private notes
	if (!note.isPublic) {
		try {
			// Try to get READ_NOTE_ORG permission (can read all org notes)
			await requireUserWithOrganizationPermission(
				request,
				note.organizationId,
				ORG_PERMISSIONS.READ_NOTE_ANY,
			)
			// If we reach here, user can read all organization notes
		} catch {
			// User doesn't have org-wide read access, check for personal access
			const hasPersonalAccess =
				note.createdById === userId ||
				note.noteAccess.some((access) => access.user.id === userId)

			if (!hasPersonalAccess) {
				throw new Response('Not authorized - insufficient note permissions', {
					status: 403,
				})
			}
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
		// Get comments for this note (limited to 50 for initial load, implement load more in UI)
		prisma.noteComment.findMany({
			where: { noteId: note.id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						username: true,
						image: { select: { objectKey: true } },
					},
				},
				images: {
					select: {
						id: true,
						altText: true,
						objectKey: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
			take: 50, // Limit initial load for performance
		}),
	])

	// Organize comments into a tree structure
	const organizeComments = (comments: CommentWithUser[]) => {
		const commentMap = new Map<string, CommentWithReplies>()
		const rootComments: CommentWithReplies[] = []

		// First pass: create map of all comments
		comments.forEach((comment) => {
			commentMap.set(comment.id, { ...comment, replies: [] })
		})

		// Second pass: organize into tree structure
		comments.forEach((comment) => {
			if (comment.parentId) {
				const parent = commentMap.get(comment.parentId)
				if (parent) {
					parent.replies.push(commentMap.get(comment.id)!)
				}
			} else {
				rootComments.push(commentMap.get(comment.id)!)
			}
		})

		return rootComments
	}

	// Serialize comments for client (convert Date to string)
	const serializeComment = (
		comment: CommentWithReplies,
	): SerializedComment => ({
		...comment,
		createdAt: comment.createdAt.toISOString(),
		replies: comment.replies.map(serializeComment),
	})

	const organizedComments = organizeComments(comments).map(serializeComment)

	// Get recent activity logs for this note (attach user avatar URL)
	const activityLogs = (await getNoteActivityLogs(note.id, 20)).map((log) => ({
		...log,
		user: {
			...log.user,
			image: log.user.image?.objectKey
				? getUserImgSrc(log.user.image.objectKey)
				: null,
		},
	}))

	// Check if current user has favorited this note
	const isFavorited = await prisma.organizationNoteFavorite.findFirst({
		where: {
			userId,
			noteId: note.id,
		},
	})

	// Get user permissions for client-side permission checks
	const userPermissions = await getUserOrganizationPermissionsForClient(
		userId,
		note.organizationId,
	)

	return {
		note,
		timeAgo,
		currentUserId: userId,
		isFavorited: !!isFavorited,
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
		userPermissions,
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

const ToggleFavoriteSchema = z.object({
	intent: z.literal('toggle-favorite'),
	noteId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	// Check if this is a multipart form (for image uploads)
	const contentType = request.headers.get('content-type')
	let formData: FormData

	if (contentType?.includes('multipart/form-data')) {
		const { parseFormData } = await import('@mjackson/form-data-parser')
		formData = await parseFormData(request, {
			maxFileSize: 1024 * 1024 * 3, // 3MB max per image
		})
	} else {
		formData = await request.formData()
	}

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

		// Use role-based permissions for note deletion
		// First check if user can delete any organization notes (admin-level)
		let canDelete = false
		try {
			await requireUserWithOrganizationPermission(
				request,
				note.organizationId,
				ORG_PERMISSIONS.DELETE_NOTE_ANY,
			)
			canDelete = true
		} catch {
			// If not admin-level delete, check if they can delete their own note
			if (note.createdById === userId) {
				try {
					await requireUserWithOrganizationPermission(
						request,
						note.organizationId,
						ORG_PERMISSIONS.DELETE_NOTE_OWN,
					)
					canDelete = true
				} catch {
					// User doesn't have delete permissions at all
				}
			}
		}

		if (!canDelete) {
			throw new Response('Not authorized - insufficient delete permissions', {
				status: 403,
			})
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

		return redirectWithToast(`/${note.organization.slug}/notes`, {
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
		} catch {
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
			const connectionDetails =
				await prisma.noteIntegrationConnection.findFirst({
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
		} catch {
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
		const submission = parseWithZod(formData, {
			schema: ShareNoteSchema,
		})

		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId, isPublic } = submission.value
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

			return data({ result: { status: 'success' } })
		} catch {
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
		} catch {
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
		} catch {
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

		// Validate the parsed data
		const validationResult = BatchUpdateNoteAccessSchema.safeParse(parsedData)
		if (!validationResult.success) {
			return data(
				{ result: { status: 'error', error: 'Invalid form data' } },
				{ status: 400 },
			)
		}

		const {
			noteId,
			isPublic,
			usersToAdd: validUsersToAdd,
			usersToRemove: validUsersToRemove,
		} = validationResult.data

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

		// Perform validations outside of the transaction
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

			// Use a transaction to ensure all operations succeed or fail together
			await prisma.$transaction(async (tx) => {
				// Update public/private status if changed
				if (isPublic !== note.isPublic) {
					await tx.organizationNote.update({
						where: { id: noteId },
						data: { isPublic },
					})

					sharingChanged = true

					// If making note public, remove all specific access entries
					if (isPublic) {
						await tx.noteAccess.deleteMany({
							where: { noteId },
						})
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

					// Log access revoked for each user in a batch
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

				// Add users (only if note is private)
				if (confirmedUserIdsToAdd.length > 0 && !isPublic) {
					// Use upsert for each user to handle duplicates gracefully
					for (const targetUserId of confirmedUserIdsToAdd) {
						await tx.noteAccess.upsert({
							where: {
								noteId_userId: {
									noteId,
									userId: targetUserId,
								},
							},
							update: {}, // No updates needed if it already exists
							create: {
								noteId,
								userId: targetUserId,
							},
						})
					}

					// Log access granted for each user in a batch
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

			// Log sharing change activity outside of transaction
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
						error:
							error instanceof Error
								? error.message
								: 'Failed to update note access',
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
					select: { userId: true },
				},
			},
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check if user can create comments using role-based permissions
		await requireUserWithOrganizationPermission(
			request,
			note.organizationId,
			ORG_PERMISSIONS.CREATE_NOTE_OWN, // Users need create permission to add comments
		)

		// For private notes, verify specific note access with enhanced permissions
		if (!note.isPublic) {
			try {
				// Check if user can read all org notes (admin/member level)
				await requireUserWithOrganizationPermission(
					request,
					note.organizationId,
					ORG_PERMISSIONS.READ_NOTE_ANY,
				)
			} catch {
				// Check personal access to this specific note
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
			// Sanitize comment content to prevent XSS attacks
			const sanitizedContent = sanitizeCommentContent(content)

			// Create the comment first
			const comment = await prisma.noteComment.create({
				data: {
					content: sanitizedContent,
					noteId,
					userId,
					parentId,
				},
			})

			// Handle image uploads if present
			const imageCount = parseInt(formData.get('imageCount') as string) || 0
			// Validate imageCount to prevent DoS attacks
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
				const { uploadCommentImage } = await import(
					'#app/utils/storage.server.ts'
				)

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

				// Upload all images and create database records
				if (imagePromises.length > 0) {
					const uploadedImages = await Promise.all(imagePromises)
					await prisma.noteCommentImage.createMany({
						data: uploadedImages,
					})
				}
			}

			// Log comment added activity
			await logNoteActivity({
				noteId,
				userId,
				action: 'comment_added',
				commentId: comment.id,
				metadata: { parentId, hasImages: imageCount > 0 },
			})

			// Get additional data needed for notifications
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

				// Send notifications for mentions in the comment
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

				// Send notification to note owner (if different from commenter)
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
					select: { organizationId: true },
				},
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
		} catch {
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

	if (intent === 'toggle-favorite') {
		const submission = parseWithZod(formData, {
			schema: ToggleFavoriteSchema,
		})
		if (submission.status !== 'success') {
			return data(
				{ result: submission.reply() },
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { noteId } = submission.value

		// Get the note to verify access
		const note = await prisma.organizationNote.findFirst({
			select: {
				organizationId: true,
				isPublic: true,
				createdById: true,
				noteAccess: {
					select: { userId: true },
				},
			},
			where: { id: noteId },
		})
		invariantResponse(note, 'Note not found', { status: 404 })

		// Check role-based permissions for favoriting notes
		await requireUserWithOrganizationPermission(
			request,
			note.organizationId,
			ORG_PERMISSIONS.READ_NOTE_OWN, // Need read permission to favorite
		)

		// For private notes, verify specific note access with role-based permissions
		if (!note.isPublic) {
			try {
				// Check if user can read all org notes (admin/member level)
				await requireUserWithOrganizationPermission(
					request,
					note.organizationId,
					ORG_PERMISSIONS.READ_NOTE_ANY,
				)
			} catch {
				// Check personal access to this specific note
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
			// Check if already favorited
			const existingFavorite = await prisma.organizationNoteFavorite.findFirst({
				where: {
					userId,
					noteId,
				},
			})

			if (existingFavorite) {
				// Remove favorite
				await prisma.organizationNoteFavorite.delete({
					where: { id: existingFavorite.id },
				})
			} else {
				// Add favorite
				await prisma.organizationNoteFavorite.create({
					data: {
						userId,
						noteId,
					},
				})
			}

			return data({ result: { status: 'success' } })
		} catch {
			return data(
				{
					result: {
						status: 'error',
						error: 'Failed to toggle favorite',
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
		uploads: {
			type: string
			altText: string | null
			objectKey: string
			thumbnailKey: string | null
			status: string
		}[]
		organization: { slug: string; id: string }
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
	isFavorited: boolean
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
		replies: CommentWithReplies[]
		images?: Array<{
			id: string
			altText: string | null
			objectKey: string
		}>
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
		config: Record<string, unknown>
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
	userPermissions: {
		userId: string
		organizationId: string
		organizationRole: {
			id: string
			name: string
			level: number
			permissions: Array<{
				id: string
				action: string
				entity: string
				access: string
				description: string
			}>
		}
	} | null
}

export default function NoteRoute() {
	const {
		note,
		timeAgo,
		currentUserId,
		isFavorited,
		organizationMembers,
		comments,
		activityLogs,
		connections,
		availableIntegrations,
	} = useLoaderData() as NoteLoaderData

	// Add ref for auto-focusing
	const sectionRef = useRef<HTMLElement>(null)
	const [activeTab, setActiveTab] = useState('overview')

	// Focus the section when the note ID changes
	useEffect(() => {
		if (sectionRef.current) {
			sectionRef.current.focus()
		}
	}, [note.id])

	// Convert organization members to mention users format
	const mentionUsers = organizationMembers.map((member) => ({
		id: member.user.id,
		name: member.user.name || member.user.username,
		email: member.user.username, // Using username as email placeholder
	}))

	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle className="text-left">
					{note.title || <Trans>Untitled Note</Trans>}
				</SheetTitle>
				<div className="text-muted-foreground flex items-center gap-2 text-sm">
					<Icon name="clock" className="h-3.5 w-3.5" />
					<span>
						<Trans>Updated {timeAgo} ago</Trans>
					</span>
					{!note.isPublic && (
						<>
							<span>•</span>
							<Icon name="lock" className="h-3.5 w-3.5" />
							<span>
								<Trans>Private</Trans>
							</span>
						</>
					)}
				</div>
			</SheetHeader>

			<section
				ref={sectionRef}
				className="flex min-h-0 flex-1 flex-col"
				aria-labelledby="note-title"
				tabIndex={-1}
			>
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="flex min-h-0 flex-1 flex-col gap-0"
				>
					<TabsList className="w-full rounded-none">
						<TabsTrigger value="overview" className="flex-1 gap-2">
							<Icon name="file-text" className="h-4 w-4" />
							<span className="hidden sm:inline">
								<Trans>Overview</Trans>
							</span>
						</TabsTrigger>
						<TabsTrigger value="comments" className="flex-1 gap-2">
							<Icon name="message-square" className="h-4 w-4" />
							<span className="hidden sm:inline">
								<Trans>Comments</Trans>
							</span>
							{comments.length > 0 && (
								<span className="bg-muted-foreground/20 rounded-full px-1.5 py-0.5 text-xs">
									{comments.length}
								</span>
							)}
						</TabsTrigger>
						<TabsTrigger value="activity" className="flex-1 gap-2">
							<Icon name="logs" className="h-4 w-4" />
							<span className="hidden sm:inline">
								<Trans>Activity</Trans>
							</span>
						</TabsTrigger>
						<TabsTrigger value="ai-assistant" className="flex-1 gap-2">
							<Icon name="sparkles" className="h-4 w-4" />
							<span className="hidden sm:inline">
								<Trans>AI Assistant</Trans>
							</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="overview"
						className="bg-muted/20 flex-1 overflow-y-auto px-6 pt-4 pb-8"
					>
						{/* Media Uploads */}
						{note.uploads.length > 0 && (
							<ul className="mb-6 flex flex-wrap gap-5">
								{note.uploads
									.filter((upload) => upload.type === 'image')
									.map((image) => (
										<li key={image.objectKey}>
											<a
												href={getNoteImgSrc(
													image.objectKey,
													note.organization.id,
												)}
											>
												<Img
													src={getNoteImgSrc(
														image.objectKey,
														note.organization.id,
													)}
													alt={image.altText ?? ''}
													className="size-32 rounded-lg object-cover"
													width={512}
													height={512}
												/>
											</a>
										</li>
									))}
								{note.uploads
									.filter(
										(upload) =>
											upload.type === 'video' &&
											upload.thumbnailKey &&
											upload.status === 'completed',
									)
									.map((video) => (
										<li key={video.objectKey}>
											<div className="relative">
												<Img
													src={getNoteImgSrc(
														video.thumbnailKey!,
														note.organization.id,
													)}
													alt={video.altText ?? 'Video thumbnail'}
													className="size-32 rounded-lg object-cover"
													width={512}
													height={512}
												/>
												<div className="absolute inset-0 flex items-center justify-center">
													<div className="rounded-full bg-black/50 p-2">
														<Icon
															name="arrow-right"
															className="h-4 w-4 text-white"
														/>
													</div>
												</div>
											</div>
										</li>
									))}
							</ul>
						)}

						{/* Note Content */}
						<div className="prose prose-sm max-w-none">
							<div
								className="text-sm whitespace-break-spaces md:text-lg"
								dangerouslySetInnerHTML={{ __html: note.content }}
							/>
						</div>
					</TabsContent>

					<TabsContent
						value="comments"
						className="bg-muted/20 flex-1 overflow-y-auto px-6 pt-4 pb-8"
					>
						<CommentsSection
							noteId={note.id}
							// SerializedComment is compatible with Comment interface
							comments={comments as any}
							currentUserId={currentUserId}
							users={mentionUsers}
							organizationId={note.organization.id}
						/>
					</TabsContent>

					<TabsContent
						value="activity"
						className="bg-muted/20 flex-1 overflow-y-auto px-6 pt-4 pb-8"
					>
						<ActivityLog activityLogs={activityLogs} />
					</TabsContent>

					<TabsContent
						value="ai-assistant"
						className="bg-muted/20 flex-1 overflow-hidden"
					>
						<LazyLoadErrorBoundary
							fallback={
								<div className="flex h-full items-center justify-center p-4">
									<div className="text-center">
										<div className="text-muted-foreground mb-2">
											<Trans>Failed to load AI Assistant</Trans>
										</div>
										<button
											onClick={() => window.location.reload()}
											className="text-primary text-sm hover:underline"
										>
											<Trans>Reload page</Trans>
										</button>
									</div>
								</div>
							}
						>
							<Suspense
								fallback={
									<div className="flex h-full items-center justify-center">
										<div className="text-muted-foreground">
											<Trans>Loading AI Assistant...</Trans>
										</div>
									</div>
								}
							>
								<AIChat noteId={note.id} />
							</Suspense>
						</LazyLoadErrorBoundary>
					</TabsContent>
				</Tabs>

				<div className="bg-background flex-shrink-0 border-t px-6 py-4">
					<div className="flex items-center justify-between">
						<span className="text-foreground/90 text-sm max-[524px]:hidden">
							<Icon name="clock" className="mr-1 h-4 w-4">
								{timeAgo} ago
							</Icon>
						</span>
						<div className="flex items-center gap-2 md:gap-3">
							<FavoriteButton noteId={note.id} isFavorited={isFavorited} />
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
							<CanEditNote
								noteOwnerId={note.createdById}
								currentUserId={currentUserId}
							>
								<Button
									variant="outline"
									size="sm"
									className="min-[525px]:max-md:aspect-square min-[525px]:max-md:px-0"
								>
									<Link to="edit">
										<Icon name="pencil" className="h-4 w-4">
											<span className="max-md:hidden">Edit</span>
										</Icon>
									</Link>
								</Button>
							</CanEditNote>
							<CanDeleteNote
								noteOwnerId={note.createdById}
								currentUserId={currentUserId}
							>
								<DeleteNote id={note.id} />
							</CanDeleteNote>
						</div>
					</div>
				</div>
			</section>
		</>
	)
}

export function FavoriteButton({
	noteId,
	isFavorited,
}: {
	noteId: string
	isFavorited: boolean
}) {
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'toggle-favorite',
	})

	return (
		<Form method="POST" {...getFormProps(form)}>
			<input type="hidden" name="noteId" value={noteId} />
			<StatusButton
				type="submit"
				name="intent"
				value="toggle-favorite"
				variant="outline"
				size="sm"
				status={isPending ? 'pending' : (form.status ?? 'idle')}
				disabled={isPending}
				className="min-[525px]:max-md:aspect-square min-[525px]:max-md:px-0"
			>
				<Icon
					name={isFavorited ? 'star-off' : 'star'}
					className="h-4 w-4 max-md:scale-125"
				>
					<span className="max-md:hidden">
						{isFavorited ? 'Unstar' : 'Star'}
					</span>
				</Icon>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
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
				size="sm"
				status={isPending ? 'pending' : (form.status ?? 'idle')}
				disabled={isPending}
			>
				<Icon name="trash-2" className="h-4 w-4">
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
