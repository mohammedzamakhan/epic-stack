import {
	getFieldsetProps,
	getInputProps,
	useForm,
	type FieldMetadata,
} from '@conform-to/react'
import { Label } from '@radix-ui/react-label'
import { Plus, X } from 'lucide-react'
import React, { useState, useRef, useCallback } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { type ImageFieldset } from '#app/routes/app+/$orgSlug_+/__org-note-editor.tsx'
import { cn, getNoteImgSrc } from '#app/utils/misc.tsx'

interface MultiImageUploadProps {
	label?: string
	maxImages?: number
	className?: string
	disabled?: boolean
	meta: FieldMetadata<(ImageFieldset | null)[] | null>
	formId: string
	existingImages?: Array<{
		id: string
		altText: string | null
		objectKey: string
	}>
}

export function MultiImageUpload({
	label = 'Images',
	maxImages = 5,
	className,
	disabled = false,
	meta,
	formId,
	existingImages = [],
}: MultiImageUploadProps) {
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [form] = useForm({ id: formId })
	const imageList = meta.getFieldList()

	// Store preview URLs and files for each image key
	const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map())
	const [fileRefs, setFileRefs] = useState<Map<string, File>>(new Map())

	const metaName = meta.name!

	// Convert File to data URL synchronously and handle insertion
	const handleFileUpload = useCallback(
		(file: File) => {
			// First convert the file to a data URL
			const reader = new FileReader()

			reader.onload = (event) => {
				if (typeof event.target?.result !== 'string') {
					return
				}

				const dataUrl = event.target.result

				// Insert into form after we have the data URL
				form.insert({
					name: metaName,
					defaultValue: { file },
				})

				// Get the latest form list after insertion
				const updatedList = meta.getFieldList()
				const newEntry = updatedList[updatedList.length - 1]

				if (newEntry) {
					const key = newEntry.key as string

					// Store both preview URL and file reference with the key from the newly inserted field
					setPreviewUrls((prev) => {
						const newMap = new Map(prev)
						newMap.set(key, dataUrl)
						return newMap
					})
					setFileRefs((prev) => {
						const newMap = new Map(prev)
						newMap.set(key, file)
						return newMap
					})
				}
			}

			// Start the file reading process
			reader.readAsDataURL(file)
		},
		[form, metaName, meta],
	)

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			if (!disabled) {
				setIsDragging(true)
			}
		},
		[disabled],
	)

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}, [])
	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDragging(false)

			if (disabled) return

			const files = Array.from(e.dataTransfer.files).filter((file) =>
				file.type.startsWith('image/'),
			)

			if (files.length > 0) {
				for (const file of files) {
					handleFileUpload(file)
				}
			}
		},
		[disabled, handleFileUpload],
	)

	const handleClick = () => {
		if (!disabled && fileInputRef.current) {
			fileInputRef.current.click()
		}
	}

	const canAddMore = imageList.length < maxImages && !disabled

	return (
		<div className={cn('space-y-4', className)}>
			<Label className="text-sm font-medium">
				{label} ({imageList.length}/{maxImages})
			</Label>

			{/* Existing Images Grid */}
			{imageList.length > 0 && (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
					{imageList.map((imageMeta, index) => {
						// Find existing image data by matching form field ID
						const imageMetaId = imageMeta.getFieldset().id.value
						const key = imageMeta.key as string
						const existingImage = existingImages.find(
							({ id }) => id === imageMetaId,
						)
						return (
							<ImagePreview
								key={key}
								meta={imageMeta}
								previewUrl={previewUrls.get(key)}
								file={fileRefs.get(key)}
								existingImage={existingImage}
								onRemove={() => {
									// Remove preview URL and file ref first
									setPreviewUrls((prev) => {
										const newMap = new Map(prev)
										newMap.delete(key)
										return newMap
									})
									setFileRefs((prev) => {
										const newMap = new Map(prev)
										newMap.delete(key)
										return newMap
									})
									// Then remove from form
									form.remove({ name: metaName, index })
								}}
								disabled={disabled}
							/>
						)
					})}
				</div>
			)}

			{/* Upload Area */}
			{canAddMore && (
				<div
					className={cn(
						'cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200',
						isDragging
							? 'border-primary bg-primary/5'
							: 'hover:border-primary border-gray-300',
					)}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={handleClick}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple
						onChange={(e) => {
							const files = Array.from(e.target.files || [])
							for (const file of files) {
								handleFileUpload(file)
							}
							// clear the input value so the user can select the same file again
							e.currentTarget.value = ''
						}}
						className="hidden"
						disabled={disabled}
					/>
					<div className="p-8 text-center">
						<div className="space-y-4">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
								<Plus className="h-6 w-6 text-gray-400" />
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-900">
									{isDragging ? 'Drop images here' : 'Add more images'}
								</p>
								<p className="text-xs text-gray-500">
									Or click to select files
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

function ImagePreview({
	meta,
	previewUrl,
	file,
	existingImage,

	onRemove,
	disabled,
}: {
	meta: FieldMetadata<ImageFieldset | null>
	previewUrl?: string
	file?: File
	existingImage?: {
		id: string
		altText: string | null
		objectKey: string
	}

	onRemove: () => void
	disabled?: boolean
}) {
	const fields = meta.getFieldset()

	// Handle existing images using the passed existingImage data
	const existingImageUrl = existingImage?.objectKey
		? getNoteImgSrc(existingImage.objectKey)
		: null

	const imageUrl = existingImageUrl ?? previewUrl

	return (
		<fieldset
			{...getFieldsetProps(meta)}
			className="group relative aspect-square"
		>
			<input {...getInputProps(fields.id, { type: 'hidden' })} />
			<label
				htmlFor={fields.file.id}
				className={cn('group absolute size-32 rounded-lg', {
					'bg-accent opacity-40 focus-within:opacity-100 hover:opacity-100':
						!imageUrl,
					'cursor-pointer focus-within:ring-2': !existingImageUrl,
				})}
			>
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={fields.altText.initialValue ?? ''}
						className="size-32 rounded-lg object-cover"
					/>
				) : (
					<div className="border-muted-foreground text-muted-foreground flex size-32 items-center justify-center rounded-lg border text-4xl">
						<Icon name="plus" />
					</div>
				)}
			</label>
			<input
				aria-label="Image"
				className="absolute top-0 left-0 z-0 size-32 cursor-pointer opacity-0"
				accept="image/*"
				{...getInputProps(fields.file, { type: 'file' })}
				ref={(input) => {
					// If we have a file from the upload, set it on the input
					if (input && file) {
						try {
							// Create a new FileList with our file
							const dataTransfer = new DataTransfer()
							dataTransfer.items.add(file)
							input.files = dataTransfer.files
						} catch (error) {
							console.log('Error setting file on input:', error)
						}
					}
				}}
			/>
			<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={onRemove}
					disabled={disabled}
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		</fieldset>
	)
}
