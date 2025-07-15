import { PhotoCropForm, type PhotoCropFormConfig } from '#app/components/ui/photo-crop-form.tsx'
import { uploadOrgPhotoActionIntent } from '../settings/cards/organization/organization-photo-card'

interface Organization {
  name: string
  slug: string
  image?: { objectKey: string } | null
}

interface OrganizationPhotoFormProps {
  organization: Organization
  setIsOpen: (open: boolean) => void
  selectedFile?: File | null
}

export function OrganizationPhotoForm({ organization, setIsOpen, selectedFile }: OrganizationPhotoFormProps) {
  function getOrgImgSrc(objectKey?: string | null) {
    return objectKey
      ? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
      : '/img/user.png'
  }

  const config: PhotoCropFormConfig = {
    getImageSrc: getOrgImgSrc,
    actionIntent: uploadOrgPhotoActionIntent,
    circularCrop: false,
    imageClassName: 'size-40 rounded-sm object-contain bg-secondary',
    defaultCroppedFilename: 'cropped-org-logo.jpg',
    inputId: 'org-photo-input-fallback',
    selectButtonLabel: 'Select Logo',
    getAltText: (org: Organization) => org.name,
    processingText: 'Processing selected image...'
  }

  return (
    <PhotoCropForm
      entity={organization}
      setIsOpen={setIsOpen}
      selectedFile={selectedFile}
      config={config}
    />
  )
}
