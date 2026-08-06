import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useState } from 'react'
import { Button } from '@repo/ui/button'
import { ErrorList } from '#app/components/forms.tsx'
import {
	FolderIcon,
	FOLDER_COLORS,
	type FolderColor,
} from '#app/components/folder-icon.tsx'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { StatusButton } from '@repo/ui/status-button'
import { Textarea } from '@repo/ui/textarea'
import { useFetcher, useNavigate } from 'react-router'
import { z } from 'zod'

export const ProjectEditorSchema = z.object({
	id: z.string().optional(),
	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be 100 characters or less'),
	description: z
		.string()
		.max(500, 'Description must be 500 characters or less')
		.optional(),
	color: z
		.enum(['gray', 'blue', 'green', 'red', 'yellow', 'purple', 'orange'])
		.default('gray'),
})

export type ProjectEditorData = z.infer<typeof ProjectEditorSchema>

interface ProjectEditorProps {
	project?: {
		id: string
		name: string
		description?: string | null
		color: string
	}
	organizationId: string
	actionData?: { result: any }
}

export function ProjectEditor({
	project,
	organizationId,
	actionData,
}: ProjectEditorProps) {
	const { _ } = useLingui()
	const navigate = useNavigate()
	const fetcher = useFetcher()
	const isSubmitting = fetcher.state !== 'idle'

	// Use local state for color selection to avoid triggering form submission
	const [selectedColor, setSelectedColor] = useState<FolderColor>(
		(project?.color as FolderColor) ?? 'gray',
	)

	const [form, fields] = useForm({
		id: 'project-editor',
		constraint: getZodConstraint(ProjectEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProjectEditorSchema })
		},
		// shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		defaultValue: {
			id: project?.id ?? '',
			name: project?.name ?? '',
			description: project?.description ?? '',
			color: (project?.color as FolderColor) ?? 'gray',
		},
	})

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const formData = new FormData(event.currentTarget)
		formData.append('organizationId', organizationId)
		// Ensure the selected color is included in the form data
		formData.set('color', selectedColor)

		void fetcher.submit(formData, {
			method: 'post',
			action: project ? `../${project.id}/edit` : '../new',
		})
	}

	const handleCancel = () => {
		void navigate('..')
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex-1 overflow-auto p-6">
				<fetcher.Form
					method="post"
					{...getFormProps(form)}
					onSubmit={handleSubmit}
					className="space-y-6"
				>
					{/* Hidden fields */}
					{project && <input type="hidden" name="id" value={project.id} />}

					{/* Project Preview */}
					<div className="flex items-center justify-center py-4">
						<FolderIcon
							fileCount={0}
							color={selectedColor}
							width={120}
							height={120}
						/>
					</div>

					{/* Name Field */}
					<div className="space-y-2">
						<Label htmlFor={fields.name.id}>
							<Trans>Project Name</Trans>
						</Label>
						<Input
							{...getInputProps(fields.name, { type: 'text' })}
							placeholder={_(t`Enter project name...`)}
							className="w-full"
						/>
						<ErrorList id={fields.name.errorId} errors={fields.name.errors} />
					</div>

					{/* Description Field */}
					<div className="space-y-2">
						<Label htmlFor={fields.description.id}>
							<Trans>Description</Trans>{' '}
							<span className="text-muted-foreground">(optional)</span>
						</Label>
						<Textarea
							{...getTextareaProps(fields.description)}
							placeholder={_(t`Describe what this project is for...`)}
							className="w-full resize-none"
							rows={3}
						/>
						<ErrorList
							id={fields.description.errorId}
							errors={fields.description.errors}
						/>
					</div>

					{/* Color Field */}
					<div className="space-y-2">
						<Label htmlFor={fields.color.id}>
							<Trans>Folder Color</Trans>
						</Label>
						<div className="mt-2 flex flex-wrap gap-3">
							{Object.keys(FOLDER_COLORS).map((color) => (
								<label key={color} className="cursor-pointer">
									<input
										type="radio"
										name={fields.color.name}
										value={color}
										checked={selectedColor === color}
										className="sr-only"
										onChange={(e) => {
											// Only update local state, don't trigger form submission
											setSelectedColor(e.target.value as FolderColor)
										}}
									/>
									<div
										className={`h-8 w-8 rounded-full border-2 transition-all ${
											selectedColor === color
												? 'border-primary ring-primary/20 ring-2'
												: 'border-border hover:border-primary/50'
										}`}
										style={{
											backgroundColor: FOLDER_COLORS[color as FolderColor].base,
										}}
									/>
								</label>
							))}
						</div>
						<ErrorList id={fields.color.errorId} errors={fields.color.errors} />
					</div>

					{/* Form Errors */}
					<ErrorList id={form.errorId} errors={form.errors} />
				</fetcher.Form>
			</div>

			{/* Footer Actions */}
			<div className="bg-background flex items-center justify-end gap-3 border-t p-6">
				<Button
					type="button"
					variant="outline"
					onClick={handleCancel}
					disabled={isSubmitting}
				>
					<Trans>Cancel</Trans>
				</Button>
				<StatusButton
					type="submit"
					form="project-editor"
					disabled={isSubmitting}
					status={isSubmitting ? 'pending' : 'idle'}
				>
					{project ? (
						<Trans>Update Project</Trans>
					) : (
						<Trans>Create Project</Trans>
					)}
				</StatusButton>
			</div>
		</div>
	)
}
