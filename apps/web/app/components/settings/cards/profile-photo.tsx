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
}

export function ProfilePhoto({ user }: ProfilePhotoProps) {
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  return (
    <div className="flex justify-center">
      <div className="relative size-52">
        <Img
          src={getUserImgSrc(user.image?.objectKey)}
          alt={user.name ?? user.username}
          className="h-full w-full rounded-full object-cover"
          width={832}
          height={832}
          isAboveFold
        />
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="absolute top-3 -right-3 flex size-10 items-center justify-center rounded-full p-0"
            >
              <Icon name="camera" className="size-4" />
            </Button>
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
