import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState, useRef } from 'react'
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { uploadOrgPhotoActionIntent, deleteOrgPhotoActionIntent } from '../settings/cards/organization/organization-photo-card'
import 'react-image-crop/dist/ReactCrop.css'

// Photo upload schema - modified to be more flexible with cropped images
const MAX_SIZE = 1024 * 1024 * 3 // 3MB

export const DeleteImageSchema = z.object({
  intent: z.literal('delete-org-photo'),
})

export const NewImageSchema = z.object({
  intent: z.literal('upload-org-photo'),
  photoFile: z
    .any() // More flexible than z.instanceof(File) to handle cropped images
    .refine((file) => file instanceof File || file instanceof Blob, 'Image is required')
    .refine((file) => !file || file.size > 0, 'Image is required')
    .refine((file) => !file || file.size <= MAX_SIZE, 'Image size must be less than 3MB'),
})

export const OrgPhotoFormSchema = z.discriminatedUnion('intent', [DeleteImageSchema, NewImageSchema])

interface Organization {
  name: string
  slug: string
  image?: { objectKey: string } | null
}

export function OrganizationPhotoForm({ organization, setIsOpen }: { organization: Organization; setIsOpen: (open: boolean) => void }) {
  const fetcher = useFetcher()
  const [newImgSrc, setNewImgSrc] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [croppedFile, setCroppedFile] = useState<File | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [form, fields] = useForm({
    id: 'organization-photo',
    constraint: getZodConstraint(OrgPhotoFormSchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: OrgPhotoFormSchema })
    },
    onSubmit(event, { formData }) {
      // If we have a cropped file, replace the form data file with it
      if (croppedFile) {
        formData.set('photoFile', croppedFile)
      }
    },
  })

  if (fetcher.data?.status === 'success') {
    setIsOpen(false)
  }

  function getOrgImgSrc(objectKey?: string | null) {
    return objectKey
      ? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
      : '/img/user.png'
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setNewImgSrc(event.target?.result as string)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle image load for cropping
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1))
  }

  // Handle crop complete
  function onCropComplete(crop: PixelCrop) {
    if (imgRef.current && crop.width && crop.height) {
      const croppedImageUrl = getCroppedImg(imgRef.current, crop)
      setCroppedImageUrl(croppedImageUrl)
    }
  }

  // Get cropped image
  function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): string {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = crop.width * scaleX
    canvas.height = crop.height * scaleY

    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY,
      )
    }

    return canvas.toDataURL('image/jpeg', 0.9)
  }

  // Apply crop
  async function applyCrop() {
    try {
      if (croppedImageUrl && selectedFile) {
        const response = await fetch(croppedImageUrl)
        const blob = await response.blob()
        
        // Create File object from cropped blob
        const croppedFile = new File([blob], selectedFile.name || 'cropped-logo.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        
        setCroppedFile(croppedFile)
        setNewImgSrc(croppedImageUrl)
        setShowCropper(false)
      }
    } catch (error) {
      console.error('Error applying crop:', error)
    }
  }

  // Cancel crop
  function cancelCrop() {
    setShowCropper(false)
    setSelectedFile(null)
    setNewImgSrc(null)
    setCroppedImageUrl('')
    setCroppedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Helper function to center the crop
  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ): Crop {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
          height: 80,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    )
  }

  if (showCropper && newImgSrc) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-md">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => onCropComplete(c)}
            aspect={1}
            className="w-full"
          >
            <img
              ref={imgRef}
              className="max-h-80 w-full object-contain"
              alt="Image to crop"
              src={newImgSrc}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={cancelCrop}
          >
            Cancel
          </Button>
          <Button 
            onClick={applyCrop}
            disabled={!croppedImageUrl}
          >
            Apply Crop
          </Button>
        </div>
      </div>
    )
  }

  return (
    <fetcher.Form 
      method="POST" 
      encType="multipart/form-data"
      className="flex flex-col items-center gap-6"
      {...getFormProps(form)}
    >
      <img
        src={newImgSrc ?? getOrgImgSrc(organization.image?.objectKey)}
        alt={organization.name}
        className="size-40 rounded-md object-contain bg-secondary"
      />
      <div className="flex flex-col items-center gap-2">
        <input
          {...getInputProps(fields.photoFile, { type: 'file' })}
          ref={fileInputRef}
          accept="image/*"
          className="peer sr-only"
          onChange={handleFileSelect}
        />
        <input type="hidden" name="intent" value={uploadOrgPhotoActionIntent} />
        
        <div className="flex gap-3">
          <Button asChild className="cursor-pointer">
            <label htmlFor={fields.photoFile.id}>Select Logo</label>
          </Button>
          
          {organization.image?.objectKey && !newImgSrc && (
            <fetcher.Form method="POST" encType="multipart/form-data">
              <input type="hidden" name="intent" value={deleteOrgPhotoActionIntent} />
              <Button type="submit" variant="destructive">
                Remove Logo
              </Button>
            </fetcher.Form>
          )}
        </div>
        
        <ErrorList errors={fields.photoFile.errors} id={fields.photoFile.id} />
        
        <StatusButton 
          type="submit"
          className="mt-2"
          disabled={!newImgSrc && !croppedFile}
          status={fetcher.state !== 'idle' ? 'pending' : form.status ?? 'idle'}
        >
          Save
        </StatusButton>
        {newImgSrc && (
          <StatusButton 
            type="button"
            className="mt-2 ml-2"
            onClick={() => {
              setNewImgSrc(null)
              setSelectedFile(null)
              setCroppedFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
          >
            Cancel
          </StatusButton>
        )}
      </div>
    </fetcher.Form>
  )
}
