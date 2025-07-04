import { Img } from 'openimg/react'
import { useState } from 'react'

import { OrganizationPhotoForm } from '#app/components/settings/organization-photo-form.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

export const uploadOrgPhotoActionIntent = 'upload-org-photo'
export const deleteOrgPhotoActionIntent = 'delete-org-photo'

// We're exporting the schema from the OrganizationPhotoForm component now
export { OrgPhotoFormSchema } from '#app/components/settings/organization-photo-form.tsx'

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

export function OrganizationPhoto({ organization, size = 'normal' }: OrganizationPhotoProps) {
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  const containerSize = size === 'small' ? 'size-32' : 'size-52'
  const buttonPosition = size === 'small' ? 'top-1 -right-1' : 'top-3 -right-3'

  function getOrgImgSrc(objectKey?: string | null) {
    return objectKey
      ? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
      : '/img/user.png'
  }

  return (
    <div className="flex justify-center">
      <div className={`relative ${containerSize}`}>
        <Img
          src={getOrgImgSrc(organization.image?.objectKey)}
          alt={organization.name}
          className="h-full w-full rounded-md object-contain bg-secondary"
          width={832}
          height={832}
          isAboveFold
        />
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className={`absolute ${buttonPosition} flex ${size === 'small' ? 'size-8' : 'size-10'} items-center justify-center rounded-full p-0`}
            >
              <Icon name="camera" className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change organization logo</DialogTitle>
            </DialogHeader>
            <OrganizationPhotoForm setIsOpen={setIsPhotoModalOpen} organization={organization} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
