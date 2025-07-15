import { PhotoCropForm, type PhotoCropFormConfig } from '#app/components/ui/photo-crop-form.tsx'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { uploadPhotoActionIntent } from '../../routes/settings+/general'

interface User {
  name?: string | null
  username: string
  image?: { objectKey: string } | null
}

interface ProfilePhotoFormProps {
  user: User
  setIsOpen: (open: boolean) => void
  selectedFile?: File | null
}

export function ProfilePhotoForm({ user, setIsOpen, selectedFile }: ProfilePhotoFormProps) {
  const config: PhotoCropFormConfig = {
    getImageSrc: getUserImgSrc,
    actionIntent: uploadPhotoActionIntent,
    circularCrop: true,
    imageClassName: 'size-40 rounded-full object-cover',
    defaultCroppedFilename: 'cropped-profile.jpg',
    inputId: 'photo-input-fallback',
    selectButtonLabel: 'Select Photo',
    getAltText: (user: User) => user.name ?? user.username,
    processingText: 'Processing selected image...'
  }

  return (
    <PhotoCropForm
      entity={user}
      setIsOpen={setIsOpen}
      selectedFile={selectedFile}
      config={config}
    />
  )
}
