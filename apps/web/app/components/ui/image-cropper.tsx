// Re-export image-cropper components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	ImageCropper as BaseImageCropper,
	centerAspectCrop,
} from '@repo/ui'
import * as React from 'react'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropperProps {
	dialogOpen: boolean
	setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
	selectedFile: File | null
	onCropComplete: (croppedImageBlob: Blob) => void
	children: React.ReactNode
	aspect?: number
	className?: string
}

// Wrapper that provides Icon component to ImageCropper
export function ImageCropper(props: ImageCropperProps) {
	return <BaseImageCropper {...props} IconComponent={IconAdapter} />
}

export { centerAspectCrop }
