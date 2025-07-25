import {
	PhotoCropForm,
	type PhotoCropFormConfig,
} from '#app/components/ui/photo-crop-form.tsx'
import { uploadPhotoActionIntent } from '../../routes/settings+/general'

interface ProfilePhotoFormProps {
	setIsOpen: (open: boolean) => void
	selectedFile?: File | null
}

export function ProfilePhotoForm({
	setIsOpen,
	selectedFile,
}: ProfilePhotoFormProps) {
	const config: PhotoCropFormConfig = {
		actionIntent: uploadPhotoActionIntent,
		circularCrop: true,
		defaultCroppedFilename: 'cropped-profile.jpg',
	}

	return (
		<PhotoCropForm
			setIsOpen={setIsOpen}
			selectedFile={selectedFile}
			config={config}
		/>
	)
}
