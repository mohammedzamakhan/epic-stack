import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { Field, ErrorList } from '#app/components/forms'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#app/components/ui/card'
import { StatusButton } from '#app/components/ui/status-button'
import { OrganizationPhoto } from './organization-photo-card'

const SettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
})

export const organizationUpdateActionIntent = 'update-settings'

interface Organization {
  id: string
  name: string
  slug: string
  image?: { objectKey: string; id: string } | null
}

export function GeneralSettingsCard({ organization }: { organization: Organization }) {
  const fetcher = useFetcher()
  
  const [form, fields] = useForm({
    id: 'organization-settings-form',
    constraint: getZodConstraint(SettingsSchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SettingsSchema })
    },
    defaultValue: {
      name: organization.name,
      slug: organization.slug,
    },
  })

  return (
    <Card>
      <CardHeader className="border-b border-muted">
        <CardTitle className="text-xl">General Settings</CardTitle>
        <CardDescription>Update your organization details</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-shrink-0 w-32">
            <OrganizationPhoto organization={organization} size="small" />
          </div>
          <div className="flex-grow">
            <fetcher.Form method="POST" {...getFormProps(form)}>
              <input type="hidden" name="intent" value={organizationUpdateActionIntent} />
              <div className="flex flex-col gap-4">
                <Field
                  labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
                  inputProps={getInputProps(fields.name, { type: 'text' })}
                  errors={fields.name.errors}
                />
                <Field
                  labelProps={{ htmlFor: fields.slug.id, children: 'Slug' }}
                  inputProps={getInputProps(fields.slug, { type: 'text' })}
                  errors={fields.slug.errors}
                />
              </div>
              <ErrorList id={form.errorId} errors={form.errors} />
            </fetcher.Form>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t border-muted pt-4">
        <StatusButton
          form={form.id}
          type="submit"
          variant="outline"
          name="intent" 
          value={organizationUpdateActionIntent}
          status={fetcher.state !== 'idle' ? 'pending' : form.status ?? 'idle'}
        >
          Save changes
        </StatusButton>
      </CardFooter>
    </Card>
  )
}
