import {
	getFieldsetProps,
	getInputProps,
	useForm,
	type FieldMetadata,
} from '@conform-to/react'
import { Button } from '@repo/ui/button'
import { FieldLabel } from '@repo/ui/field'
import { Icon } from '@repo/ui/icon'
import React, { useState, useRef, useCallback } from 'react'
import { type MediaFieldset } from '#app/routes/_app+/$orgSlug_+/__org-note-editor.tsx'
import { cn, getNoteImgSrc } from '#app/utils/misc.tsx'
import { useDragAndDrop } from './use-drag-and-drop.tsx'
import { createFileInputRef } from './use-file-input-ref.tsx'

interface MultiMediaUploadProps {
	label?: string
	maxFiles?: number
	className?: string
	disabled?: boolean
	meta: FieldMetadata<(MediaFieldset | null)[] | null>
	formId: string
	existingImages?: Array<{
		id: string
		altText: string | null
		objectKey: string
	}>
	existingVideos?: Array<{
		id: string
		altText: string | null
		objectKey: string
		thumbnailKey?: string | null
		status: string
	}>
	organizationId: string
}

export function MultiMediaUpload({
	label = 'Images & Videos',
	maxFiles = 5,
	className,
	disabled = false,
	meta,
	formId,
	existingImages = [],
	existingVideos = [],
	organizationId,
}: MultiMediaUploadProps) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [form] = useForm({ id: formId })
	const mediaList = meta.getFieldList()

	// Store preview URLs and files for each media key
	const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map())
	const [fileRefs, setFileRefs] = useState<Map<string, File>>(new Map())

	const metaName = meta.name!

	// Convert File to data URL synchronously and handle insertion
	const handleFileUpload = useCallback(
		(file: File) => {
			const isVideo = file.type.startsWith('video/')

			if (isVideo) {
				// For videos, we'll show a placeholder thumbnail
				form.insert({
					name: metaName,
					defaultValue: { file, type: 'video' },
				})

				const updatedList = meta.getFieldList()
				const newEntry = updatedList[updatedList.length - 1]

				if (newEntry) {
					const key = newEntry.key as string
					setFileRefs((prev) => {
						const newMap = new Map(prev)
						newMap.set(key, file)
						return newMap
					})
				}
			} else {
				// For images, generate preview as before
				const reader = new FileReader()

				reader.onload = (event) => {
					if (typeof event.target?.result !== 'string') {
						return
					}

					const dataUrl = event.target.result

					form.insert({
						name: metaName,
						defaultValue: { file, type: 'image' },
					})

					const updatedList = meta.getFieldList()
					const newEntry = updatedList[updatedList.length - 1]

					if (newEntry) {
						const key = newEntry.key as string

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

				reader.readAsDataURL(file)
			}
		},
		[form, metaName, meta],
	)

	const { isDragging, handleDragOver, handleDragLeave, handleDrop } =
		useDragAndDrop({
			disabled,
			onFileUpload: handleFileUpload,
			acceptFilter: (file) =>
				file.type.startsWith('image/') || file.type.startsWith('video/'),
		})

	const handleClick = () => {
		if (!disabled && fileInputRef.current) {
			fileInputRef.current.click()
		}
	}

	const canAddMore = mediaList.length < maxFiles && !disabled

	return (
		<div className={cn('mt-4 space-y-4', className)}>
			<FieldLabel className="text-sm font-medium">
				{label} ({mediaList.length}/{maxFiles})
			</FieldLabel>

			{/* Existing Media Grid */}
			{mediaList.length > 0 && (
				<div className="flex h-32 gap-4 overflow-x-auto">
					{mediaList.map((mediaMeta, index) => {
						const mediaMetaId = mediaMeta.getFieldset().id.value
						const key = mediaMeta.key as string
						const existingImage = existingImages.find(
							({ id }) => id === mediaMetaId,
						)
						const existingVideo = existingVideos.find(
							({ id }) => id === mediaMetaId,
						)

						return (
							<MediaPreview
								key={key}
								meta={mediaMeta}
								previewUrl={previewUrls.get(key)}
								file={fileRefs.get(key)}
								existingImage={existingImage}
								existingVideo={existingVideo}
								organizationId={organizationId}
								onRemove={() => {
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
						isDragging ? 'border-primary bg-primary/5' : 'hover:border-primary',
					)}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={handleClick}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,video/*"
						multiple
						onChange={(e) => {
							const files = Array.from(e.target.files || [])
							for (const file of files) {
								handleFileUpload(file)
							}
							e.currentTarget.value = ''
						}}
						className="hidden"
						disabled={disabled}
					/>
					<div className="p-8 text-center">
						<div className="space-y-4">
							<div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
								<Icon name="plus" className="h-6 w-6" />
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium">
									{isDragging ? 'Drop files here' : 'Add images or videos'}
								</p>
								<p className="text-muted-foreground text-xs">
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

function MediaPreview({
	meta,
	previewUrl,
	file,
	existingImage,
	existingVideo,
	organizationId,
	onRemove,
	disabled,
}: {
	meta: FieldMetadata<MediaFieldset | null>
	previewUrl?: string
	file?: File
	existingImage?: {
		id: string
		altText: string | null
		objectKey: string
	}
	existingVideo?: {
		id: string
		altText: string | null
		objectKey: string
		thumbnailKey?: string | null
		status: string
	}
	organizationId: string
	onRemove: () => void
	disabled?: boolean
}) {
	const fields = meta.getFieldset()
	const isVideo = file?.type.startsWith('video/') || existingVideo

	// Handle existing media
	const existingImageUrl = existingImage?.objectKey
		? getNoteImgSrc(existingImage.objectKey, organizationId)
		: null

	const existingVideoThumbnail = existingVideo?.thumbnailKey
		? getNoteImgSrc(existingVideo.thumbnailKey, organizationId)
		: null

	const mediaUrl = existingImageUrl ?? existingVideoThumbnail ?? previewUrl

	return (
		<fieldset
			{...getFieldsetProps(meta)}
			className="group relative aspect-square flex-shrink-0"
		>
			<input {...getInputProps(fields.id, { type: 'hidden' })} />
			<input {...getInputProps(fields.type, { type: 'hidden' })} />
			<label
				htmlFor={fields.file.id}
				className={cn('group absolute size-32 rounded-lg', {
					'bg-accent opacity-40 focus-within:opacity-100 hover:opacity-100':
						!mediaUrl,
					'cursor-pointer focus-within:ring-2':
						!existingImageUrl && !existingVideo,
				})}
			>
				{mediaUrl ? (
					<div className="relative size-32 overflow-hidden rounded-lg">
						<img
							src={mediaUrl}
							alt={fields.altText.initialValue ?? ''}
							className="size-32 rounded-lg object-cover"
						/>
						{isVideo && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/30">
								<Icon name="arrow-right" className="h-8 w-8 text-white" />
							</div>
						)}
						{existingVideo?.status === 'processing' && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/50">
								<div className="text-xs text-white">Processing...</div>
							</div>
						)}
						{existingVideo?.status === 'failed' && (
							<div className="absolute inset-0 flex items-center justify-center bg-red-500/50">
								<Icon name="x" className="h-6 w-6 text-white" />
							</div>
						)}
					</div>
				) : (
					<div className="border-muted-foreground text-muted-foreground flex size-32 items-center justify-center rounded-lg border text-4xl">
						{isVideo ? <Icon name="camera" /> : <Icon name="plus" />}
					</div>
				)}
			</label>
			<input
				aria-label={isVideo ? 'Video' : 'Image'}
				className="absolute top-0 left-0 z-0 size-32 cursor-pointer opacity-0"
				accept={isVideo ? 'video/*' : 'image/*'}
				{...getInputProps(fields.file, { type: 'file' })}
				ref={createFileInputRef(file)}
			/>
			<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={onRemove}
					disabled={disabled}
					aria-label="Remove media"
				>
					<Icon name="x" className="h-4 w-4" />
				</Button>
			</div>
		</fieldset>
	)
}
