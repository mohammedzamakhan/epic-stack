import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList, OTPField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { enable2FAActionIntent, disable2FAActionIntent } from '../../routes/settings+/general'

export const Enable2FASchema = z.object({
	code: z.string().min(6).max(6),
})

export function TwoFactorForm({ 
  isTwoFactorEnabled, 
  qrCode, 
  otpUri, 
  setIsOpen 
}: { 
  isTwoFactorEnabled: boolean, 
  qrCode: string | null, 
  otpUri: string | null, 
  setIsOpen: (open: boolean) => void 
}) {
  const fetcher = useFetcher()
  
  const [form, fields] = useForm({
    id: 'two-factor-form',
    constraint: getZodConstraint(Enable2FASchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: Enable2FASchema })
    },
  })
  
  if (fetcher.data?.status === 'success') {
    setIsOpen(false)
  }
  
  if (isTwoFactorEnabled) {
    return (
      <fetcher.Form method="POST">
        <input type="hidden" name="intent" value={disable2FAActionIntent} />
        <p className="mb-4 text-sm">
          Two-factor authentication is currently enabled. Disabling it will make your account less secure.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <StatusButton
            type="submit"
            variant="destructive"
            status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
          >
            Disable 2FA
          </StatusButton>
        </div>
      </fetcher.Form>
    )
  }
  
  return (
    <div className="flex flex-col items-center gap-4">
      {qrCode && (
        <>
          <img alt="qr code" src={qrCode} className="h-56 w-56" />
          <p className="text-sm text-center">
            Scan this QR code with your authenticator app.
          </p>
          {otpUri && (
            <>
              <p className="text-xs text-center text-muted-foreground">
                If you can't scan the QR code, you can manually add this code to your authenticator app:
              </p>
              <div className="p-2 bg-muted rounded-md w-full overflow-auto">
                <pre className="whitespace-pre-wrap break-all text-xs" aria-label="One-time Password URI">
                  {otpUri}
                </pre>
              </div>
            </>
          )}
        </>
      )}
      
      <p className="text-sm text-center">
        Enter the code from your authenticator app to enable two-factor authentication.
      </p>
      
      <fetcher.Form method="POST" {...getFormProps(form)} className="w-full">
        <input type="hidden" name="intent" value={enable2FAActionIntent} />
        <div className="flex flex-col items-center justify-center">
          <OTPField
            labelProps={{
              htmlFor: fields.code.id,
              children: 'Authentication Code',
            }}
            inputProps={{
              ...getInputProps(fields.code, { type: 'text' }),
              autoFocus: true,
              autoComplete: 'one-time-code',
            }}
            errors={fields.code.errors}
          />
        </div>
        
        <ErrorList id={form.errorId} errors={form.errors} />
        
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <StatusButton
            type="submit"
            status={fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')}
          >
            Enable 2FA
          </StatusButton>
        </div>
      </fetcher.Form>
    </div>
  )
}
