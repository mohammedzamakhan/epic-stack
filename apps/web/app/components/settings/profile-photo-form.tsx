
import { useState, useRef } from 'react'
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop'
import { useFetcher } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { uploadPhotoActionIntent } from '../../routes/settings+/general'
import 'react-image-crop/dist/ReactCrop.css'

interface User {
  name?: string | null
  username: string
  image?: { objectKey: string } | null
}

export function ProfilePhotoForm({ user, setIsOpen }: { user: User; setIsOpen: (open: boolean) => void }) {
  const fetcher = useFetcher()
  const [newImgSrc, setNewImgSrc] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [croppedFile, setCroppedFile] = useState<File | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Simple file input props without complex form management
  const photoInputId = 'profile-photo-input'

  if (fetcher.data?.status === 'success') {
    setIsOpen(false)
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
        const croppedFile = new File([blob], selectedFile.name || 'cropped-profile.jpg', {
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
            circularCrop
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

  // Handle form submission with cropped file
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData()
    formData.append('intent', uploadPhotoActionIntent)
    
    if (croppedFile) {
      formData.append('photoFile', croppedFile)
    } else if (fileInputRef.current?.files?.[0]) {
      formData.append('photoFile', fileInputRef.current.files[0])
    }
    
    void fetcher.submit(formData, {
      method: 'POST',
      encType: 'multipart/form-data',
    })
  }

  return (
    <form 
      method="POST" 
      encType="multipart/form-data"
      className="flex flex-col items-center gap-6"
      onSubmit={handleSubmit}
    >
      <img
        src={newImgSrc ?? getUserImgSrc(user.image?.objectKey)}
        alt={user.name ?? user.username}
        className="size-40 rounded-full object-cover"
      />
      <div className="flex flex-col items-center gap-2">
        <input
          id={photoInputId}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="peer sr-only"
          onChange={handleFileSelect}
        />
        <input type="hidden" name="intent" value={uploadPhotoActionIntent} />
        
        <Button asChild className="cursor-pointer">
          <label htmlFor={photoInputId}>Select Photo</label>
        </Button>
        
        <StatusButton 
          type="submit"
          className="mt-2"
          disabled={!newImgSrc && !croppedFile}
          status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
        >
          Save
        </StatusButton>
      </div>
    </form>
  )
}
