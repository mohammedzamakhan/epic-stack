import { Img } from 'openimg/react'
import { useState } from 'react'

import { ProfilePhotoForm } from '#app/components/settings/profile-photo-form.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getUserImgSrc } from '#app/utils/misc.tsx'

export const uploadPhotoActionIntent = 'upload-photo'
export const deletePhotoActionIntent = 'delete-photo'

interface ProfilePhotoProps {
  user: {
    name: string | null
    username: string
    image?: {
      objectKey: string
    } | null
  }
  size?: 'small' | 'normal'
}

export function ProfilePhoto({ user, size = 'normal' }: ProfilePhotoProps) {
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  const containerSize = size === 'small' ? 'size-32' : 'size-52'
  const buttonPosition = size === 'small' ? 'top-1 -right-1' : 'top-3 -right-3'

  return (
    <div className="flex justify-center">
      <div className={`relative ${containerSize}`}>
        
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogTrigger asChild>
          <div>
          <Img
            src={getUserImgSrc(user.image?.objectKey)}
            alt={user.name ?? user.username}
            className="h-full w-full rounded-full object-cover ring-offset-2 ring-2 ring-muted hover:ring-primary/50"
            width={832}
            height={832}
            isAboveFold
          />
            <Button
              variant="outline"
              className={`absolute ${buttonPosition} flex ${size === 'small' ? 'size-8' : 'size-10'} items-center justify-center rounded-full p-0 ring-offset-2 ring-2 ring-transparent hover:ring-primary/50`}
            >
              <Icon name="camera" className="size-4" />
            </Button>
          </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change profile photo</DialogTitle>
            </DialogHeader>
            <ProfilePhotoForm setIsOpen={setIsPhotoModalOpen} user={user} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
