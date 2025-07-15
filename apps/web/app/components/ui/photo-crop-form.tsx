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
import 'react-image-crop/dist/ReactCrop.css'

export interface PhotoCropFormConfig {
  // Image source function
  getImageSrc: (objectKey?: string | null) => string
  // Form submission intent
  actionIntent: string
  // Cropping style
  circularCrop?: boolean
  // Styling
  imageClassName: string
  // Default filename for cropped image
  defaultCroppedFilename: string
  // Input and labels
  inputId: string
  selectButtonLabel: string
  // Alt text for image
  getAltText: (entity: any) => string
  // Processing text
  processingText?: string
}

interface PhotoCropFormProps<T = any> {
  entity: T
  setIsOpen: (open: boolean) => void
  selectedFile?: File | null
  config: PhotoCropFormConfig
}

export function PhotoCropForm<T>({ 
  entity, 
  setIsOpen, 
  selectedFile, 
  config 
}: PhotoCropFormProps<T>) {
  const fetcher = useFetcher()
  const [newImgSrc, setNewImgSrc] = useState<string | null>(null)
  const [currentSelectedFile, setCurrentSelectedFile] = useState<File | null>(selectedFile || null)
  const [croppedFile, setCroppedFile] = useState<File | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [ignoredCroppedImageUrl, setIgnoredCroppedImageUrl] = useState<string>('')
  const internalFileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const {
    getImageSrc,
    actionIntent,
    circularCrop = false,
    imageClassName,
    defaultCroppedFilename,
    inputId,
    selectButtonLabel,
    getAltText,
    processingText = 'Processing selected image...'
  } = config

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
        const croppedFile = new File([blob], currentSelectedFile.name || defaultCroppedFilename, {
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
    formData.append('intent', actionIntent)
    
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
            circularCrop={circularCrop}
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
        <input type="hidden" name="intent" value={actionIntent} />
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
          src={getImageSrc((entity as any)?.image?.objectKey)}
          alt={getAltText(entity)}
          className={imageClassName}
        />
        <div className="text-sm text-muted-foreground">{processingText}</div>
      </div>
    )
  }

  // Fallback: show file input if no external file provided
  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src={getImageSrc((entity as any)?.image?.objectKey)}
        alt={getAltText(entity)}
        className={imageClassName}
      />
      <input
        ref={internalFileInputRef}
        type="file"
        accept="image/*"
        className="peer sr-only"
        id={inputId}
        onChange={handleFileSelect}
      />
      <Button asChild className="cursor-pointer">
        <label htmlFor={inputId}>{selectButtonLabel}</label>
      </Button>
    </div>
  )
}
