import { Img } from 'openimg/react'
import { useState, useRef } from 'react'

import { OrganizationPhotoForm } from '#app/components/settings/organization-photo-form.tsx'

import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Icon,
} from '@repo/ui'

export const uploadOrgPhotoActionIntent = 'upload-org-photo'
export const deleteOrgPhotoActionIntent = 'delete-org-photo'

interface OrganizationPhotoProps {
	organization: {
		name: string
		slug: string
		image?: {
			objectKey: string
			id: string
		} | null
	}
	size?: 'small' | 'normal'
}

export function OrganizationPhoto({
	organization,
	size = 'normal',
}: OrganizationPhotoProps) {
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

	function getOrgImgSrc(objectKey?: string | null) {
		return objectKey
			? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
			: '/img/user.png'
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
						src={getOrgImgSrc(organization.image?.objectKey)}
						alt={organization.name}
						className="bg-secondary h-full w-full rounded-md object-contain"
						width={832}
						height={832}
						isAboveFold
					/>
					<Button
						variant="outline"
						className={`absolute ${buttonPosition} flex ${size === 'small' ? 'size-8' : 'size-10'} items-center justify-center rounded-full p-0`}
					>
						<Icon name="image" className="size-4" />
					</Button>
				</div>

				<Dialog open={showPhotoForm} onOpenChange={setShowPhotoForm}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Update Organization Logo</DialogTitle>
						</DialogHeader>
						<OrganizationPhotoForm
							setIsOpen={setShowPhotoForm}
							selectedFile={selectedFile}
						/>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}
