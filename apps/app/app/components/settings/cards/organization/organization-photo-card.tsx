import { BasePhotoUpload } from '#app/components/settings/base-photo-upload.tsx'
import { OrganizationPhotoForm } from '#app/components/settings/organization-photo-form.tsx'

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
	function getOrgImgSrc(objectKey?: string | null) {
		return objectKey
			? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
			: '/img/user.png'
	}

	return (
		<BasePhotoUpload
			imgSrc={getOrgImgSrc(organization.image?.objectKey)}
			alt={organization.name}
			dialogTitle="Update Organization Logo"
			imgClassName="bg-secondary h-full w-full rounded-md object-contain"
			renderForm={({ setIsOpen, selectedFile }) => (
				<OrganizationPhotoForm setIsOpen={setIsOpen} selectedFile={selectedFile} />
			)}
			size={size}
		/>
	)
}
