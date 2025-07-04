import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from 'react-router'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '#app/components/ui/card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { NameSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { ProfilePhoto } from './profile-photo'

export const ProfileFormSchema = z.object({
  name: NameSchema.nullable().default(null),
  username: UsernameSchema,
})

export const profileUpdateActionIntent = 'update-profile'

interface ProfileCardProps {
  user: {
    username: string
    name: string | null
  }
}

export function ProfileCard({ user }: ProfileCardProps) {
  const fetcher = useFetcher()

  const [form, fields] = useForm({
    id: 'edit-profile',
    constraint: getZodConstraint(ProfileFormSchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ProfileFormSchema })
    },
    defaultValue: {
      username: user.username,
      name: user.name,
    },
  })

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-muted">
        <CardTitle className="text-xl">Your profile</CardTitle>
        <CardDescription>Customize how you appear to others</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 pb-0">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-shrink-0 w-32">
            <ProfilePhoto user={user} size="small" />
          </div>
          <div className="flex-grow">
            <fetcher.Form method="POST" {...getFormProps(form)}>
              <div className="flex flex-col gap-4">
                <Field
                  labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
                  inputProps={getInputProps(fields.name, { type: 'text' })}
                  errors={fields.name.errors}
                />
                <Field
                  labelProps={{ htmlFor: fields.username.id, children: 'Username' }}
                  inputProps={getInputProps(fields.username, { type: 'text' })}
                  errors={fields.username.errors}
                />
              </div>
              <ErrorList errors={form.errors} id={form.errorId} />
            </fetcher.Form>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t border-muted pt-4">
        <StatusButton
          form="edit-profile"
          type="submit"
          variant="outline"
          name="intent"
          value={profileUpdateActionIntent}
          status={fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')}
        >
          Save changes
        </StatusButton>
      </CardFooter>
    </Card>
  )
}
