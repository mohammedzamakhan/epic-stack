import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from 'react-router'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '#app/components/ui/card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { NameSchema, UsernameSchema } from '#app/utils/user-validation.ts'

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
        <fetcher.Form method="POST" {...getFormProps(form)}>
          <div className="grid grid-cols-6 gap-x-10">
            <Field
              className="col-span-3"
              labelProps={{
                htmlFor: fields.username.id,
                children: 'Username',
              }}
              inputProps={getInputProps(fields.username, { type: 'text' })}
              errors={fields.username.errors}
            />
            <Field
              className="col-span-3"
              labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
              inputProps={getInputProps(fields.name, { type: 'text' })}
              errors={fields.name.errors}
            />
          </div>
          <ErrorList errors={form.errors} id={form.errorId} />
        </fetcher.Form>
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
