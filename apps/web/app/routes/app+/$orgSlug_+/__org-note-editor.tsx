import {
	FormProvider,
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect } from 'react'
import { useFetcher, useParams } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList, Field, TextareaField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'

import { MultiImageUpload } from '#app/components/ui/multi-image-upload.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useIsPending } from '#app/utils/misc.tsx'

const titleMinLength = 1
const titleMaxLength = 100
const contentMinLength = 1
const contentMaxLength = 10000

export const MAX_UPLOAD_SIZE = 1024 * 1024 * 3 // 3MB

const ImageFieldsetSchema = z.object({
	id: z.string().optional(),
	fileId: z.string().optional(), // Added to store unique file identifier
	file: z
		.any()
		.optional()
		.refine(
			file =>
				!file ||
				(typeof File !== 'undefined' && file instanceof File && file.size <= MAX_UPLOAD_SIZE),
			'File size must be less than 3MB',
		),
	altText: z.string().optional(),
})

export type ImageFieldset = z.infer<typeof ImageFieldsetSchema>

export const OrgNoteEditorSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(titleMinLength).max(titleMaxLength),
	content: z.string().min(contentMinLength).max(contentMaxLength),
	images: z.array(ImageFieldsetSchema).max(5).optional(),
})

type OrgNoteEditorProps = {
	note?: {
		id: string
		title: string
		content: string
		images: Array<{
			id: string
			altText: string | null
			objectKey: string
		}>
	}
	actionData?: {
		result: any
	}
	onSuccess?: () => void
}

export function OrgNoteEditor({
	note,
	actionData,
	onSuccess,
}: OrgNoteEditorProps) {
	const isPending = useIsPending()
	const params = useParams<{ orgSlug: string }>()
	const fetcher = useFetcher()
	
	// Track submission state to trigger onSuccess
	useEffect(() => {
        console.log(fetcher);
		if (fetcher.state === 'submitting' && onSuccess) {
			onSuccess()
		}
	}, [fetcher.state, onSuccess, fetcher])

	const [form, fields] = useForm({
		id: 'org-note-editor',
		constraint: getZodConstraint(OrgNoteEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: OrgNoteEditorSchema })
		},
		defaultValue: {
			...note,
			images: note?.images ?? [],
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div>
			<FormProvider context={form.context}>
				<fetcher.Form
					method="POST"
					action={note ? `/app/${params.orgSlug}/notes/${note.id}/edit` : `/app/${params.orgSlug}/notes/new`}
					className="flex flex-col gap-y-4 overflow-x-hidden px-6 overflow-y-auto pt-2 pb-8"
					{...getFormProps(form)}
					encType="multipart/form-data"
				>
					{/*
					This hidden submit button is here to ensure that when the user hits
					"enter" on an input field, the primary form function is submitted
					rather than the first button in the form (which is delete/add image).
				*/}
					<button type="submit" className="hidden" />
					{note ? <input type="hidden" name="id" value={note.id} /> : null}
					<div className="flex flex-col gap-1">
						<Field
							labelProps={{ children: 'Title' }}
							inputProps={{
								autoFocus: true,
								...getInputProps(fields.title, { type: 'text' }),
							}}
							errors={fields.title.errors}
						/>
						<TextareaField
							labelProps={{ children: 'Content' }}
							textareaProps={{
								...getTextareaProps(fields.content),
							}}
							errors={fields.content.errors}
						/>
						<MultiImageUpload 
							meta={fields.images} 
							formId={form.id} 
							existingImages={note?.images} 
						/>
					</div>
					<ErrorList id={form.errorId} errors={form.errors} />
				</fetcher.Form>
				<div className={floatingToolbarClassName}>
					<Button variant="destructive" {...form.reset.getButtonProps()}>
						Reset
					</Button>
					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						Submit
					</StatusButton>
				</div>
			</FormProvider>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No note with the id "{params.noteId}" exists</p>
				),
			}}
		/>
	)
}
