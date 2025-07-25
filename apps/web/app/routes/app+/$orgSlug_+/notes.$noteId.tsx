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
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { SheetHeader, SheetTitle } from '#app/components/ui/sheet.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getNoteImgSrc, useIsPending } from '#app/utils/misc.tsx'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

export async function loader({ params, request }: LoaderFunctionArgs) {
	// User ID not needed here as userHasOrgAccess will check for authorization
	await requireUserId(request)
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
		},
	})

	invariantResponse(note, 'Not found', { status: 404 })

	// Check if the user has access to this organization
	await userHasOrgAccess(request, note.organizationId)

	const date = new Date(note.updatedAt)
	const timeAgo = formatDistanceToNow(date)

	// Get integration data for this note
	const [connections, availableIntegrations] = await Promise.all([
		integrationManager.getNoteConnections(note.id),
		integrationManager.getOrganizationIntegrations(note.organizationId),
	])

	return {
		note,
		timeAgo,
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
			await integrationManager.disconnectNoteFromChannel(connectionId)
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
		images: { altText: string | null; objectKey: string }[]
		organization: { slug: string }
	}
	timeAgo: string
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
	const { note, timeAgo, connections, availableIntegrations } =
		useLoaderData() as NoteLoaderData

	// Add ref for auto-focusing
	const sectionRef = useRef<HTMLElement>(null)

	// Focus the section when the note ID changes
	useEffect(() => {
		if (sectionRef.current) {
			sectionRef.current.focus()
		}
	}, [note.id])

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
				</div>
				<div className={floatingToolbarClassName}>
					<span className="text-foreground/90 text-sm max-[524px]:hidden">
						<Icon name="clock" className="scale-125">
							{timeAgo} ago
						</Icon>
					</span>
					<div className="flex flex-1 justify-end gap-2 md:gap-4">
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
