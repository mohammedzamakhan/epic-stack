import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { uploadOrgPhotoActionIntent, deleteOrgPhotoActionIntent } from '../settings/cards/organization/organization-photo-card'

// Photo upload schema
const MAX_SIZE = 1024 * 1024 * 3 // 3MB

export const DeleteImageSchema = z.object({
  intent: z.literal('delete-org-photo'),
})

export const NewImageSchema = z.object({
  intent: z.literal('upload-org-photo'),
  photoFile: z
    .instanceof(File)
    .refine(file => file.size > 0, 'Image is required')
    .refine(file => file.size <= MAX_SIZE, 'Image size must be less than 3MB'),
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

  const [form, fields] = useForm({
    id: 'organization-photo',
    constraint: getZodConstraint(OrgPhotoFormSchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: OrgPhotoFormSchema })
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
        
        {newImgSrc && (
          <StatusButton 
            type="submit"
            className="mt-2"
            status={fetcher.state !== 'idle' ? 'pending' : form.status ?? 'idle'}
          >
            Save
          </StatusButton>
        )}
      </div>
    </fetcher.Form>
  )
}
