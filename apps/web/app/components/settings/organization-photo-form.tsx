import React, { useState, useRef } from 'react'
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop'
import { useFetcher } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { uploadOrgPhotoActionIntent } from '../settings/cards/organization/organization-photo-card'
import 'react-image-crop/dist/ReactCrop.css'

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
  const fetcher = useFetcher()
  const [newImgSrc, setNewImgSrc] = useState<string | null>(null)
  const [currentSelectedFile, setCurrentSelectedFile] = useState<File | null>(selectedFile || null)
  const [croppedFile, setCroppedFile] = useState<File | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [ignoredCroppedImageUrl, setIgnoredCroppedImageUrl] = useState<string>('')
  const internalFileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Process selected file when provided
  React.useEffect(() => {
    if (selectedFile && !newImgSrc) {
      setCurrentSelectedFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewImgSrc(event.target.result as string)
        }
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
      }
      reader.readAsDataURL(selectedFile)
    }
  }, [selectedFile, newImgSrc])

  if (fetcher.data?.status === 'success') {
    setIsOpen(false)
  }

  function getOrgImgSrc(objectKey?: string | null) {
    return objectKey
      ? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
      : '/img/user.png'
  }

  // Handle file selection (for fallback input)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) {
      setCurrentSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setNewImgSrc(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle image load for cropping
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1))
  }

  // Handle crop complete and automatically apply crop
  function onCropComplete(crop: PixelCrop) {
    if (imgRef.current && crop.width && crop.height) {
      const croppedUrl = getCroppedImg(imgRef.current, crop)
      setIgnoredCroppedImageUrl(croppedUrl)
      // Automatically create cropped file
      void applyCropFromUrl(croppedUrl)
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

  // Apply crop from URL
  async function applyCropFromUrl(croppedUrl: string) {
    try {
      if (croppedUrl && currentSelectedFile) {
        const response = await fetch(croppedUrl)
        const blob = await response.blob()
        
        // Create File object from cropped blob
        const croppedFile = new File([blob], currentSelectedFile.name || 'cropped-org-logo.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        
        setCroppedFile(croppedFile)
      }
    } catch (error) {
      console.error('Error applying crop:', error)
    }
  }

  // Cancel and close
  function handleCancel() {
    setCurrentSelectedFile(null)
    setNewImgSrc(null)
    setIgnoredCroppedImageUrl('')
    setCroppedFile(null)
    if (internalFileInputRef.current) {
      internalFileInputRef.current.value = ''
    }
    setIsOpen(false)
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

  // Handle form submission with cropped file
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData()
    formData.append('intent', uploadOrgPhotoActionIntent)
    
    if (croppedFile) {
      formData.append('photoFile', croppedFile)
    } else if (currentSelectedFile) {
      formData.append('photoFile', currentSelectedFile)
    }
    
    void fetcher.submit(formData, {
      method: 'POST',
      encType: 'multipart/form-data',
    })
  }

  // Show cropping interface if image is selected
  if (newImgSrc) {
    return (
      <form 
        method="POST" 
        encType="multipart/form-data"
        className="flex flex-col items-center gap-4"
        onSubmit={handleSubmit}
      >
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
        <input type="hidden" name="intent" value={uploadOrgPhotoActionIntent} />
        <div className="flex gap-3">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <StatusButton 
            type="submit"
            disabled={!croppedFile}
            status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
          >
            Save
          </StatusButton>
        </div>
      </form>
    )
  }

  // If selectedFile is provided but not processed yet, show waiting state
  if (selectedFile && !newImgSrc) {
    return (
      <div className="flex flex-col items-center gap-4">
        <img
          src={getOrgImgSrc(organization.image?.objectKey)}
          alt={organization.name}
          className="size-40 rounded-sm object-contain bg-secondary"
        />
        <div className="text-sm text-muted-foreground">Processing selected image...</div>
      </div>
    )
  }

  // Fallback: show file input if no external file provided
  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src={getOrgImgSrc(organization.image?.objectKey)}
        alt={organization.name}
        className="size-40 rounded-sm object-contain bg-secondary"
      />
      <input
        ref={internalFileInputRef}
        type="file"
        accept="image/*"
        className="peer sr-only"
        id="org-photo-input-fallback"
        onChange={handleFileSelect}
      />
      <Button asChild className="cursor-pointer">
        <label htmlFor="org-photo-input-fallback">Select Logo</label>
      </Button>
    </div>
  )
}
