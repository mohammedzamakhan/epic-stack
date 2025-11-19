import { Trans, Plural } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/dialog'
import { useState } from 'react'

import { PasskeyManager } from '#app/components/settings/passkey-manager.tsx'
import { PasswordForm } from '#app/components/settings/password-form.tsx'
import { TwoFactorForm } from '#app/components/settings/two-factor-form.tsx'

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
			<CardHeader>
				<CardTitle>
					<Trans>Security Settings</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>Manage your password and two-factor authentication settings.</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col space-y-6">
					{/* Password Section */}
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-semibold">
								{hasPassword ? (
									<Trans>Change Password</Trans>
								) : (
									<Trans>Create Password</Trans>
								)}
							</h3>
							<p className="text-muted-foreground text-sm">
								{hasPassword ? (
									<Trans>Change your password to something new</Trans>
								) : (
									<Trans>Create a password to secure your account</Trans>
								)}
							</p>
						</div>
						<Dialog
							open={isPasswordModalOpen}
							onOpenChange={setIsPasswordModalOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									{hasPassword ? (
										<Trans>Change Password</Trans>
									) : (
										<Trans>Create Password</Trans>
									)}
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										{hasPassword ? (
											<Trans>Change Password</Trans>
										) : (
											<Trans>Create Password</Trans>
										)}
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
								{isTwoFactorEnabled ? (
									<Trans>Two-Factor Authentication</Trans>
								) : (
									<Trans>Enable Two-Factor Authentication</Trans>
								)}
							</h3>
							<p className="text-muted-foreground text-sm">
								{isTwoFactorEnabled ? (
									<Trans>Your account is secured with two-factor authentication</Trans>
								) : (
									<Trans>Add an extra layer of security to your account</Trans>
								)}
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
									{isTwoFactorEnabled ? (
										<Trans>Disable 2FA</Trans>
									) : (
										<Trans>Enable 2FA</Trans>
									)}
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-2xl">
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
							<h3 className="font-semibold">
								<Trans>Passkeys</Trans>
							</h3>
							<p className="text-muted-foreground text-sm">
								{passkeys?.length > 0 ? (
									<Trans>
										You're signed in on{' '}
										<Plural
											value={user._count.sessions}
											one="# device"
											other="# devices"
										/>{' '}
										as {user.email}
									</Trans>
								) : (
									<Trans>Register a passkey to log in without a password</Trans>
								)}
							</p>
						</div>
						<Dialog
							open={isPasskeyModalOpen}
							onOpenChange={setIsPasskeyModalOpen}
						>
							<DialogTrigger asChild>
								<Button variant="outline">
									<Trans>Manage Passkeys</Trans>
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-3xl">
								<DialogHeader>
									<DialogTitle>
										<Trans>Manage Passkeys</Trans>
									</DialogTitle>
								</DialogHeader>
								<PasskeyManager
									data={{ passkeys }}
									deleteIntent={deletePasskeyActionIntent}
								/>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
