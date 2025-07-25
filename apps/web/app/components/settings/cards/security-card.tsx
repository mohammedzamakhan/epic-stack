import { useState } from 'react'

import { PasskeyManager } from '#app/components/settings/passkey-manager.tsx'
import { PasswordForm } from '#app/components/settings/password-form.tsx'
import { TwoFactorForm } from '#app/components/settings/two-factor-form.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'

export const changePasswordActionIntent = 'change-password'
export const setPasswordActionIntent = 'set-password'
export const enable2FAActionIntent = 'enable-2fa'
export const disable2FAActionIntent = 'disable-2fa'
export const registerPasskeyActionIntent = 'register-passkey'
export const deletePasskeyActionIntent = 'delete-passkey'

interface SecurityCardProps {
	hasPassword: boolean
	isTwoFactorEnabled: boolean
	passkeys: Array<{
		id: string
		deviceType: string
		createdAt: Date
	}>
	user: {
		email: string
		_count: {
			sessions: number
		}
	}
	qrCode: string | null
	otpUri: string | null
}

export function SecurityCard({
	hasPassword,
	isTwoFactorEnabled,
	passkeys,
	user,
	qrCode,
	otpUri,
}: SecurityCardProps) {
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
	const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false)
	const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false)

	return (
		<Card className="w-full">
			<CardContent>
				<div className="flex flex-col space-y-6">
					{/* Password Section */}
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-semibold">
								{hasPassword ? 'Change Password' : 'Create Password'}
							</h3>
							<p className="text-muted-foreground text-sm">
								{hasPassword
									? 'Change your password to something new'
									: 'Create a password to secure your account'}
							</p>
						</div>
						<Dialog
							open={isPasswordModalOpen}
							onOpenChange={setIsPasswordModalOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									{hasPassword ? 'Change Password' : 'Create Password'}
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										{hasPassword ? 'Change Password' : 'Create Password'}
									</DialogTitle>
								</DialogHeader>
								<PasswordForm
									hasPassword={hasPassword}
									setIsOpen={setIsPasswordModalOpen}
								/>
							</DialogContent>
						</Dialog>
					</div>

					{/* 2FA Section */}
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-semibold">
								{isTwoFactorEnabled
									? 'Two-Factor Authentication'
									: 'Enable Two-Factor Authentication'}
							</h3>
							<p className="text-muted-foreground text-sm">
								{isTwoFactorEnabled
									? 'Your account is secured with two-factor authentication'
									: 'Add an extra layer of security to your account'}
							</p>
						</div>
						<Dialog
							open={isTwoFactorModalOpen}
							onOpenChange={setIsTwoFactorModalOpen}
						>
							<DialogTrigger asChild>
								<Button
									variant={isTwoFactorEnabled ? 'destructive' : 'outline'}
								>
									{isTwoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Two-Factor Authentication</DialogTitle>
								</DialogHeader>
								<TwoFactorForm
									isTwoFactorEnabled={isTwoFactorEnabled}
									qrCode={qrCode}
									otpUri={otpUri}
									setIsOpen={setIsTwoFactorModalOpen}
								/>
							</DialogContent>
						</Dialog>
					</div>

					{/* Passkeys Section */}
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-semibold">Passkeys</h3>
							<p className="text-muted-foreground text-sm">
								{passkeys?.length > 0
									? `You're signed in on ${user._count.sessions} device${user._count.sessions === 1 ? '' : 's'} as ${user.email}`
									: 'Register a passkey to log in without a password'}
							</p>
						</div>
						<Dialog
							open={isPasskeyModalOpen}
							onOpenChange={setIsPasskeyModalOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">Manage Passkeys</Button>
							</DialogTrigger>
							<DialogContent className="max-w-3xl">
								<DialogHeader>
									<DialogTitle>Manage Passkeys</DialogTitle>
								</DialogHeader>
								<PasskeyManager data={{ passkeys }} />
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
