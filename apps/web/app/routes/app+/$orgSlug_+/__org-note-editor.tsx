import {
	FormProvider,
	getFormProps,
	getInputProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useEffect, useState, useRef } from 'react'
import { useFetcher, useParams } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { AIContentGenerator } from '#app/components/note/ai-content-generator.tsx'
import { ContentEditor, type ContentEditorRef } from '#app/components/note/content-editor.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { MultiImageUpload } from '#app/components/ui/multi-image-upload.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useIsPending } from '#app/utils/misc.tsx'

const titleMinLength = 1
const titleMaxLength = 100
const contentMinLength = 1
const contentMaxLength = 20000 // Increased to account for HTML markup

export const MAX_UPLOAD_SIZE = 1024 * 1024 * 3 // 3MB

const ImageFieldsetSchema = z.object({
	id: z.string().optional(),
	fileId: z.string().optional(), // Added to store unique file identifier
	file: z
		.any()
		.optional()
		.refine(
			(file) =>
				!file ||
				(typeof File !== 'undefined' &&
					file instanceof File &&
					file.size <= MAX_UPLOAD_SIZE),
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
	const [titleValue, setTitleValue] = useState(note?.title || '')
	const [contentValue, setContentValue] = useState(note?.content || '')
	const contentEditorRef = useRef<ContentEditorRef>(null)

	// Track submission state to trigger onSuccess
	useEffect(() => {
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
			content: note?.content || '',
			images: note?.images ?? [],
		},
		shouldRevalidate: 'onBlur',
	})

	const handleContentGenerated = (generatedContent: string) => {
		// Update the TipTap editor with the generated content
		if (contentEditorRef.current) {
			contentEditorRef.current.setContent(generatedContent)
			setContentValue(generatedContent)
		}
	}

	return (
		<>
			<FormProvider context={form.context}>
				<div className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
					<fetcher.Form
						method="POST"
						action={
							note
								? `/app/${params.orgSlug}/notes/${note.id}/edit`
								: `/app/${params.orgSlug}/notes/new`
						}
						className="flex flex-col gap-y-4"
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
									onChange: (e) => setTitleValue(e.target.value),
								}}
								errors={fields.title.errors}
							/>
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
										Content
									</label>
									<AIContentGenerator
										title={titleValue}
										onContentGenerated={handleContentGenerated}
										disabled={isPending}
									/>
								</div>
								<ContentEditor
									ref={contentEditorRef}
									value={contentValue}
									onChange={setContentValue}
									name={fields.content.name}
									disabled={isPending}
									placeholder="Write your note content..."
								/>
								{fields.content.errors && (
									<div className="min-h-[32px] px-4 pb-3 pt-1">
										<ErrorList id={fields.content.errorId} errors={fields.content.errors} />
									</div>
								)}
							</div>
							<MultiImageUpload
								meta={fields.images}
								formId={form.id}
								existingImages={note?.images}
							/>
						</div>
						<ErrorList id={form.errorId} errors={form.errors} />
					</fetcher.Form>
				</div>
				
				<div className="flex-shrink-0 border-t bg-background px-6 py-4">
					<div className="flex items-center justify-end gap-2 md:gap-3">
						<Button 
							variant="outline" 
							size="sm"
							{...form.reset.getButtonProps()}
						>
							Reset
						</Button>
						<StatusButton
							form={form.id}
							type="submit"
							disabled={isPending}
							status={isPending ? 'pending' : 'idle'}
							size="sm"
						>
							{note ? 'Update' : 'Create'}
						</StatusButton>
					</div>
				</div>
			</FormProvider>
		</>
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
