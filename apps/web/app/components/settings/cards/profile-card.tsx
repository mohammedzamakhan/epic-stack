import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState } from 'react'
import { useFetcher } from 'react-router'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { EmailChangeForm } from '#app/components/settings/email-form.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardFooter } from '#app/components/ui/card.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '#app/components/ui/dialog.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { NameSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { ProfilePhoto } from './profile-photo'

export const ProfileFormSchema = z.object({
  name: NameSchema.nullable().default(null),
  username: UsernameSchema,
})

export const profileUpdateActionIntent = 'update-profile'
export const changeEmailActionIntent = 'change-email'

interface ProfileCardProps {
  user: {
    username: string
    name: string | null
    email: string
  }
}

export function ProfileCard({ user }: ProfileCardProps) {
  const fetcher = useFetcher()
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

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
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                  <div className="relative">
                    <input 
                      id="email"
                      type="text"
                      disabled
                      value={user.email}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-[100px]"
                    />
                    <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                        >
                          Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Email</DialogTitle>
                        </DialogHeader>
                        <EmailChangeForm setIsOpen={setIsEmailModalOpen} />
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you change your email, you'll need to verify the new address
                  </p>
                </div>
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
