import { useState } from 'react'

import { EmailChangeForm } from '#app/components/settings/email-form.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '#app/components/ui/card.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '#app/components/ui/dialog.tsx'

export const changeEmailActionIntent = 'change-email'

interface EmailCardProps {
  email: string
}

export function EmailCard({ email }: EmailCardProps) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-muted">
        <CardTitle className="text-xl">Email address</CardTitle>
        <CardDescription>Change your email address</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="flex justify-between items-center">
          <div>
            <p>Current email: <strong>{email}</strong></p>
            <p className="text-sm text-muted-foreground mt-1">
              If you change your email, you'll need to verify the new address
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t border-muted mt-6 pt-4">
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Change Email</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Email</DialogTitle>
            </DialogHeader>
            <EmailChangeForm setIsOpen={setIsEmailModalOpen} />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}
