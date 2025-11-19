import { BasePhotoUpload } from '#app/components/settings/base-photo-upload.tsx'
import { ProfilePhotoForm } from '#app/components/settings/profile-photo-form.tsx'
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
	return (
		<BasePhotoUpload
			imgSrc={getUserImgSrc(user.image?.objectKey)}
			alt={user.name ?? user.username}
			dialogTitle="Update Profile Photo"
			renderForm={({ setIsOpen, selectedFile }) => (
				<ProfilePhotoForm setIsOpen={setIsOpen} selectedFile={selectedFile} />
			)}
			size={size}
		/>
	)
}
