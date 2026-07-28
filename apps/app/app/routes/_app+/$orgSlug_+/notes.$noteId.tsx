import { getFormProps, useForm } from '@conform-to/react'
import { invariantResponse } from '@epic-web/invariant'
import { Trans } from '@lingui/macro'
import { getNoteActivityLogs } from '@repo/audit'
import { requireUserId } from '@repo/auth'
import { getNoteImgSrc, getUserImgSrc, useIsPending } from '@repo/common'
import { prisma } from '@repo/database'
import { integrationManager } from '@repo/integrations'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { StatusButton } from '@repo/ui/status-button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@repo/ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import DOMPurify from 'isomorphic-dompurify'
import { Img } from 'openimg/react'
import {
	useRef,
	useEffect,
	useState,
	lazy,
	Suspense,
	Component,
	useMemo,
} from 'react'
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
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
	getUserOrganizationPermissionsForClient,
} from '#app/utils/organization/permissions.server.ts'

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

export const DeleteFormSchema = z.object({
	intent: z.literal('delete-note'),
	noteId: z.string(),
})

export const ConnectNoteSchema = z.object({
	intent: z.literal('connect-note-to-channel'),
	noteId: z.string(),
	integrationId: z.string(),
	channelId: z.string(),
})

export const DisconnectNoteSchema = z.object({
	intent: z.literal('disconnect-note-from-channel'),
	connectionId: z.string(),
})

export const GetChannelsSchema = z.object({
	intent: z.literal('get-integration-channels'),
	integrationId: z.string(),
})

export const ShareNoteSchema = z.object({
	intent: z.literal('update-note-sharing'),
	noteId: z.string(),
	isPublic: z.preprocess((val) => val === 'true', z.boolean()),
})

export const AddNoteAccessSchema = z.object({
	intent: z.literal('add-note-access'),
	noteId: z.string(),
	userId: z.string(),
})

export const RemoveNoteAccessSchema = z.object({
	intent: z.literal('remove-note-access'),
	noteId: z.string(),
	userId: z.string(),
})

export const BatchUpdateNoteAccessSchema = z.object({
	intent: z.literal('batch-update-note-access'),
	noteId: z.string(),
	isPublic: z.preprocess((val) => val === 'true', z.boolean()),
	usersToAdd: z.array(z.string()).default([]),
	usersToRemove: z.array(z.string()).default([]),
})

export const AddCommentSchema = z.object({
	intent: z.literal('add-comment'),
	noteId: z.string(),
	content: z.string().min(1, 'Comment content cannot be empty'),
	parentId: z.string().optional(),
})

export const DeleteCommentSchema = z.object({
	intent: z.literal('delete-comment'),
	commentId: z.string(),
})

export const ToggleFavoriteSchema = z.object({
	intent: z.literal('toggle-favorite'),
	noteId: z.string(),
})

export async function action(args: ActionFunctionArgs) {
	const userId = await requireUserId(args.request)

	const contentType = args.request.headers.get('content-type')
	let formData: FormData

	if (contentType?.includes('multipart/form-data')) {
		const { parseFormData } = await import('@mjackson/form-data-parser')
		formData = await parseFormData(args.request, {
			maxFileSize: 1024 * 1024 * 3, // 3MB max per image
		})
	} else {
		formData = await args.request.formData()
	}

	const intent = formData.get('intent')
	const ctx = { ...args, formData, userId }

	const {
		handleDeleteNoteIntent,
		handleConnectChannelIntent,
		handleDisconnectChannelIntent,
		handleGetChannelsIntent,
		handleUpdateSharingIntent,
		handleAddAccessIntent,
		handleRemoveAccessIntent,
		handleBatchUpdateAccessIntent,
		handleAddCommentIntent,
		handleDeleteCommentIntent,
		handleToggleFavoriteIntent,
	} = await import('./notes.$noteId.server')

	switch (intent) {
		case 'delete-note':
			return handleDeleteNoteIntent(ctx)
		case 'connect-note-to-channel':
			return handleConnectChannelIntent(ctx)
		case 'disconnect-note-from-channel':
			return handleDisconnectChannelIntent(ctx)
		case 'get-integration-channels':
			return handleGetChannelsIntent(ctx)
		case 'update-note-sharing':
			return handleUpdateSharingIntent(ctx)
		case 'add-note-access':
			return handleAddAccessIntent(ctx)
		case 'remove-note-access':
			return handleRemoveAccessIntent(ctx)
		case 'batch-update-note-access':
			return handleBatchUpdateAccessIntent(ctx)
		case 'add-comment':
			return handleAddCommentIntent(ctx)
		case 'delete-comment':
			return handleDeleteCommentIntent(ctx)
		case 'toggle-favorite':
			return handleToggleFavoriteIntent(ctx)
		default:
			return data(
				{ result: { status: 'error', error: 'Invalid intent' } },
				{ status: 400 },
			)
	}
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

	const sanitizedNoteContent = useMemo(() => {
		return DOMPurify.sanitize(note.content, {
			ALLOWED_TAGS: [
				'p',
				'br',
				'strong',
				'b',
				'em',
				'i',
				'u',
				'a',
				'span',
				'ul',
				'ol',
				'li',
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'blockquote',
				'code',
				'pre',
				'div',
			],
			ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
			ALLOW_DATA_ATTR: false,
			ALLOW_UNKNOWN_PROTOCOLS: false,
		})
	}, [note.content])

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
								dangerouslySetInnerHTML={{ __html: sanitizedNoteContent }}
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

				<div className="bg-background shrink-0 border-t px-6 py-4">
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
				403: () => (
					<p>
						<Trans>You do not have permission to view this note</Trans>
					</p>
				),
				404: ({ params }) => {
					const noteId = params.noteId
					return (
						<p>
							<Trans>No note with the id "{noteId}" exists</Trans>
						</p>
					)
				},
			}}
		/>
	)
}
