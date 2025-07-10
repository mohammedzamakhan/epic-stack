import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useRef, useEffect } from 'react'
import { data, Form, Link, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList } from '#app/components/forms.tsx'
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

	return { note, timeAgo }
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-note'),
	noteId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
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
			organization: { select: { slug: true } }
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
			OR: [
				{ role: 'admin' },
				{ userId: note.createdById }
			]
		}
	})

	if (!userOrg) {
		throw new Response('Not authorized', { status: 403 })
	}

	// Delete the note
	await prisma.organizationNote.delete({ where: { id: note.id } })

	return redirectWithToast(`/app/${note.organization.slug}/notes`, {
		type: 'success',
		title: 'Success',
		description: 'The note has been deleted.',
	})
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
}

export default function NoteRoute() {
	const { note, timeAgo } = useLoaderData() as NoteLoaderData
	
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
				className="flex flex-col h-full"
				aria-labelledby="note-title"
				tabIndex={-1} // Make the section focusable without keyboard navigation
			>
				<div className="pb-8 px-6 overflow-y-auto">
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
					<div className="grid flex-1 grid-cols-2 justify-end gap-2 min-[525px]:flex md:gap-4">
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
