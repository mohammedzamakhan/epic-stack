import { Img } from 'openimg/react'
import { useState, useRef, type ReactNode } from 'react'

import { Button } from '@repo/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/dialog'
import { Icon } from '@repo/ui/icon'

interface BasePhotoUploadProps {
	imgSrc: string
	alt: string
	dialogTitle: string
	imgClassName?: string
	renderForm: (params: {
		setIsOpen: (isOpen: boolean) => void
		selectedFile: File | null
	}) => ReactNode
	size?: 'small' | 'normal'
}

export function BasePhotoUpload({
	imgSrc,
	alt,
	dialogTitle,
	imgClassName = 'ring-muted hover:ring-primary/50 h-full w-full rounded-full object-cover ring-2 ring-offset-2',
	renderForm,
	size = 'normal',
}: BasePhotoUploadProps) {
	const [showPhotoForm, setShowPhotoForm] = useState(false)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const containerSize = size === 'small' ? 'size-32' : 'size-52'
	const buttonPosition = size === 'small' ? 'top-1 -right-1' : 'top-3 -right-3'

	const handlePhotoClick = () => {
		fileInputRef.current?.click()
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.currentTarget.files?.[0]
		if (file) {
			setSelectedFile(file)
			setShowPhotoForm(true)
		}
	}

	return (
		<div className="flex justify-center">
			<div className={`relative ${containerSize}`}>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="sr-only"
					onChange={handleFileSelect}
				/>
				<div onClick={handlePhotoClick} className="cursor-pointer">
					<Img
						src={imgSrc}
						alt={alt}
						className={imgClassName}
						width={832}
						height={832}
						isAboveFold
					/>
					<Button
						variant="outline"
						className={`absolute ${buttonPosition} flex ${size === 'small' ? 'size-8' : 'size-10'} dark:bg-background dark:hover:bg-muted hover:ring-primary/50 items-center justify-center rounded-full p-0 ring-2 ring-transparent ring-offset-2`}
					>
						<Icon name="image" className="size-4" />
					</Button>
				</div>

				<Dialog open={showPhotoForm} onOpenChange={setShowPhotoForm}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>{dialogTitle}</DialogTitle>
						</DialogHeader>
						{renderForm({ setIsOpen: setShowPhotoForm, selectedFile })}
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}
