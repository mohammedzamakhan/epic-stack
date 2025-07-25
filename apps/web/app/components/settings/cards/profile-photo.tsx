import { Img } from 'openimg/react'
import { useState, useRef } from 'react'

import { ProfilePhotoForm } from '#app/components/settings/profile-photo-form.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getUserImgSrc } from '#app/utils/misc.tsx'

export const uploadPhotoActionIntent = 'upload-photo'
export const deletePhotoActionIntent = 'delete-photo'

interface ProfilePhotoProps {
	user: {
		name: string | null
		username: string
		image?: {
			objectKey: string
		} | null
	}
	size?: 'small' | 'normal'
}

export function ProfilePhoto({ user, size = 'normal' }: ProfilePhotoProps) {
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
						src={getUserImgSrc(user.image?.objectKey)}
						alt={user.name ?? user.username}
						className="ring-muted hover:ring-primary/50 h-full w-full rounded-full object-cover ring-2 ring-offset-2"
						width={832}
						height={832}
						isAboveFold
					/>
					<Button
						variant="outline"
						className={`absolute ${buttonPosition} flex ${size === 'small' ? 'size-8' : 'size-10'} hover:ring-primary/50 items-center justify-center rounded-full p-0 ring-2 ring-transparent ring-offset-2`}
					>
						<Icon name="camera" className="size-4" />
					</Button>
				</div>

				<Dialog open={showPhotoForm} onOpenChange={setShowPhotoForm}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Update Profile Photo</DialogTitle>
						</DialogHeader>
						<ProfilePhotoForm
							setIsOpen={setShowPhotoForm}
							selectedFile={selectedFile}
						/>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}
