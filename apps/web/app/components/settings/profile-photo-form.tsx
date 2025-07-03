import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { uploadPhotoActionIntent } from '../../routes/settings+/general'

// Photo upload schema
const MAX_SIZE = 1024 * 1024 * 3 // 3MB

export const DeleteImageSchema = z.object({
  intent: z.literal('delete-photo'),
})

export const NewImageSchema = z.object({
  intent: z.literal('upload-photo'),
  photoFile: z
    .instanceof(File)
    .refine(file => file.size > 0, 'Image is required')
    .refine(file => file.size <= MAX_SIZE, 'Image size must be less than 3MB'),
})

const PhotoFormSchema = z.discriminatedUnion('intent', [DeleteImageSchema, NewImageSchema])

interface User {
  name?: string | null
  username: string
  image?: { objectKey: string } | null
}

export function ProfilePhotoForm({ user, setIsOpen }: { user: User; setIsOpen: (open: boolean) => void }) {
  const fetcher = useFetcher()
  const [newImgSrc, setNewImgSrc] = useState<string | null>(null)

  const [form, fields] = useForm({
    id: 'profile-photo',
    constraint: getZodConstraint(PhotoFormSchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: PhotoFormSchema })
    },
  })

  if (fetcher.data?.status === 'success') {
    setIsOpen(false)
  }

  return (
    <fetcher.Form 
      method="POST" 
      encType="multipart/form-data"
      className="flex flex-col items-center gap-6"
      {...getFormProps(form)}
    >
      <img
        src={newImgSrc ?? getUserImgSrc(user.image?.objectKey)}
        alt={user.name ?? user.username}
        className="size-40 rounded-full object-cover"
      />
      <div className="flex flex-col items-center gap-2">
        <input
          {...getInputProps(fields.photoFile, { type: 'file' })}
          accept="image/*"
          className="peer sr-only"
          onChange={e => {
            const file = e.currentTarget.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onload = ev => setNewImgSrc(ev.target?.result as string)
              reader.readAsDataURL(file)
            }
          }}
        />
        <input type="hidden" name="intent" value={uploadPhotoActionIntent} />
        
        <Button asChild className="cursor-pointer">
          <label htmlFor={fields.photoFile.id}>Select Photo</label>
        </Button>
        
        <ErrorList errors={fields.photoFile.errors} id={fields.photoFile.id} />
        
        <StatusButton 
          type="submit"
          className="mt-2"
          disabled={!newImgSrc}
          status={fetcher.state !== 'idle' ? 'pending' : form.status ?? 'idle'}
        >
          Save
        </StatusButton>
      </div>
    </fetcher.Form>
  )
}
