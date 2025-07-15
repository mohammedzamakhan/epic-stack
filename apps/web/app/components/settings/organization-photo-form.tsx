import { PhotoCropForm, type PhotoCropFormConfig } from '#app/components/ui/photo-crop-form.tsx'
import { uploadOrgPhotoActionIntent } from '../settings/cards/organization/organization-photo-card'

interface OrganizationPhotoFormProps {
  setIsOpen: (open: boolean) => void
  selectedFile?: File | null
}

export function OrganizationPhotoForm({ setIsOpen, selectedFile }: OrganizationPhotoFormProps) {
  const config: PhotoCropFormConfig = {
    actionIntent: uploadOrgPhotoActionIntent,
    circularCrop: false,
    defaultCroppedFilename: 'cropped-org-logo.jpg',
  }

  return (
    <PhotoCropForm
      setIsOpen={setIsOpen}
      selectedFile={selectedFile}
      config={config}
    />
  )
}
