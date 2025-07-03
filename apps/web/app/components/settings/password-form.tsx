import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { PasswordSchema, PasswordAndConfirmPasswordSchema } from '#app/utils/user-validation.ts'
import { changePasswordActionIntent, setPasswordActionIntent } from '../../routes/settings+/general'

export const ChangePasswordSchema = z
	.object({
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
		confirmNewPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				path: ['confirmNewPassword'],
				code: z.ZodIssueCode.custom,
				message: 'The passwords must match',
			})
		}
	})

export function PasswordForm({ hasPassword, setIsOpen }: { hasPassword: boolean; setIsOpen: (open: boolean) => void}) {
  const fetcher = useFetcher()
  
  const schema = hasPassword ? ChangePasswordSchema : PasswordAndConfirmPasswordSchema
  
  const [form, fields] = useForm({
    id: 'password-form',
    constraint: getZodConstraint(schema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema })
    },
  })
  
  if (fetcher.data?.status === 'success') {
    setIsOpen(false)
  }
  
  return (
    <fetcher.Form method="POST" {...getFormProps(form)}>
      <input 
        type="hidden" 
        name="intent" 
        value={hasPassword ? changePasswordActionIntent : setPasswordActionIntent} 
      />
      
      {hasPassword && (
        <Field
          labelProps={{ children: 'Current Password' }}
          inputProps={{
            ...getInputProps(fields.currentPassword, { type: 'password' }),
            autoComplete: 'current-password',
          }}
          errors={fields.currentPassword?.errors}
        />
      )}
      
      <Field
        labelProps={{ children: hasPassword ? 'New Password' : 'Password' }}
        inputProps={{
          ...getInputProps(hasPassword ? fields.newPassword : fields.password, { type: 'password' }),
          autoComplete: 'new-password',
        }}
        errors={(hasPassword ? fields.newPassword : fields.password)?.errors}
      />
      
      <Field
        labelProps={{ children: hasPassword ? 'Confirm New Password' : 'Confirm Password' }}
        inputProps={{
          ...getInputProps(hasPassword ? fields.confirmNewPassword : fields.confirmPassword, { 
            type: 'password' 
          }),
          autoComplete: 'new-password',
        }}
        errors={(hasPassword ? fields.confirmNewPassword : fields.confirmPassword)?.errors}
      />
      
      <ErrorList id={form.errorId} errors={form.errors} />
      
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <StatusButton
          type="submit"
          status={fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')}
        >
          {hasPassword ? 'Change Password' : 'Create Password'}
        </StatusButton>
      </div>
    </fetcher.Form>
  )
}
