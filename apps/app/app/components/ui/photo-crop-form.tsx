import { Button } from '@repo/ui/button'
import { StatusButton } from '@repo/ui/status-button'
import React, { useState, useRef } from 'react'
import ReactCrop, {
	centerCrop,
	makeAspectCrop,
	type Crop,
	type PixelCrop,
} from 'react-image-crop'
import { useFetcher } from 'react-router'
import 'react-image-crop/dist/ReactCrop.css'
import { Trans } from '@lingui/macro'

export interface PhotoCropFormConfig {
	// Form submission intent
	actionIntent: string
	// Cropping style
	circularCrop?: boolean
	// Default filename for cropped image
	defaultCroppedFilename: string
}

interface PhotoCropFormProps {
	setIsOpen: (open: boolean) => void
	selectedFile?: File | null
	config: PhotoCropFormConfig
}

export function PhotoCropForm({
	setIsOpen,
	selectedFile,
	config,
}: PhotoCropFormProps) {
	const fetcher = useFetcher()
	const [newImgSrc, setNewImgSrc] = useState<string | undefined>(undefined)
	const [currentSelectedFile, setCurrentSelectedFile] = useState<File | null>(
		selectedFile || null,
	)
	const [croppedFile, setCroppedFile] = useState<File | null>(null)
	const [crop, setCrop] = useState<Crop>()
	const internalFileInputRef = useRef<HTMLInputElement>(null)
	const imgRef = useRef<HTMLImageElement | null>(null)

	const { actionIntent, circularCrop = false, defaultCroppedFilename } = config

	// Process selected file when provided
	React.useEffect(() => {
		if (selectedFile && !newImgSrc) {
			setCurrentSelectedFile(selectedFile)
			const reader = new FileReader()
			reader.onload = (event) => {
				if (event.target?.result) {
					setNewImgSrc(event.target.result as string)
				}
			}
			reader.onerror = (error) => {
				console.error('FileReader error:', error)
			}
			reader.readAsDataURL(selectedFile)
		}
	}, [selectedFile, newImgSrc])

	if (fetcher.data?.status === 'success') {
		setIsOpen(false)
	}

	// Handle image load for cropping
	function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
		const { width, height } = e.currentTarget
		setCrop(centerAspectCrop(width, height, 1))
	}

	// Handle crop complete and automatically apply crop
	function onCropComplete(crop: PixelCrop) {
		if (imgRef.current && crop.width && crop.height) {
			const croppedUrl = getCroppedImg(imgRef.current, crop)
			// Automatically create cropped file
			void applyCropFromUrl(croppedUrl)
		}
	}

	// Get cropped image
	function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): string {
		const canvas = document.createElement('canvas')
		const scaleX = image.naturalWidth / image.width
		const scaleY = image.naturalHeight / image.height

		canvas.width = crop.width * scaleX
		canvas.height = crop.height * scaleY

		const ctx = canvas.getContext('2d')

		if (ctx) {
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = 'high'

			ctx.drawImage(
				image,
				crop.x * scaleX,
				crop.y * scaleY,
				crop.width * scaleX,
				crop.height * scaleY,
				0,
				0,
				crop.width * scaleX,
				crop.height * scaleY,
			)
		}

		return canvas.toDataURL('image/jpeg', 0.9)
	}

	// Apply crop from URL
	async function applyCropFromUrl(croppedUrl: string) {
		try {
			if (croppedUrl && currentSelectedFile) {
				const response = await fetch(croppedUrl)
				const blob = await response.blob()

				// Create File object from cropped blob
				const croppedFile = new File(
					[blob],
					currentSelectedFile.name || defaultCroppedFilename,
					{
						type: 'image/jpeg',
						lastModified: Date.now(),
					},
				)

				setCroppedFile(croppedFile)
			}
		} catch (error) {
			console.error('Error applying crop:', error)
		}
	}

	// Cancel and close
	function handleCancel() {
		setCurrentSelectedFile(null)
		setNewImgSrc(undefined)
		setCroppedFile(null)
		if (internalFileInputRef.current) {
			internalFileInputRef.current.value = ''
		}
		setIsOpen(false)
	}

	// Helper function to center the crop
	function centerAspectCrop(
		mediaWidth: number,
		mediaHeight: number,
		aspect: number,
	): Crop {
		return centerCrop(
			makeAspectCrop(
				{
					unit: '%',
					width: 80,
					height: 80,
				},
				aspect,
				mediaWidth,
				mediaHeight,
			),
			mediaWidth,
			mediaHeight,
		)
	}

	// Handle form submission with cropped file
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		const formData = new FormData()
		formData.append('intent', actionIntent)

		if (croppedFile) {
			formData.append('photoFile', croppedFile)
		} else if (currentSelectedFile) {
			formData.append('photoFile', currentSelectedFile)
		}

		void fetcher.submit(formData, {
			method: 'POST',
			encType: 'multipart/form-data',
		})
	}

	return (
		<form
			method="POST"
			encType="multipart/form-data"
			className="flex flex-col items-center gap-4"
			onSubmit={handleSubmit}
		>
			<div className="w-full max-w-md">
				<ReactCrop
					crop={crop}
					onChange={(_, percentCrop) => setCrop(percentCrop)}
					onComplete={(c) => onCropComplete(c)}
					aspect={1}
					className="w-full"
					circularCrop={circularCrop}
				>
					<img
						ref={imgRef}
						className="max-h-80 w-full object-contain"
						alt="Image to crop"
						src={newImgSrc}
						onLoad={onImageLoad}
					/>
				</ReactCrop>
			</div>
			<input type="hidden" name="intent" value={actionIntent} />
			<div className="flex gap-3">
				<Button type="button" variant="outline" onClick={handleCancel}>
					<Trans>Cancel</Trans>
				</Button>
				<StatusButton
					type="submit"
					disabled={!croppedFile}
					status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				>
					<Trans>Save</Trans>
				</StatusButton>
			</div>
		</form>
	)
}
