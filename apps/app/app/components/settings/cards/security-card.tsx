import { Trans, Plural } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@repo/ui/dialog'
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
	ssoEnforcement?: {
		enforced: boolean
		organizationName?: string
		message?: string
	}
}

export function SecurityCard({
	hasPassword,
	isTwoFactorEnabled,
	passkeys,
	user,
	qrCode,
	otpUri,
	ssoEnforcement,
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
					<Trans>
						Manage your password and two-factor authentication settings.
					</Trans>
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
								{ssoEnforcement?.enforced ? (
									<span className="text-amber-600 dark:text-amber-500">
										<Trans>
											Password login is disabled because your organization "
											{ssoEnforcement.organizationName}" requires SSO.
										</Trans>
									</span>
								) : hasPassword ? (
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
							<DialogTrigger
								disabled={ssoEnforcement?.enforced}
								render={
									<Button
										variant="outline"
										disabled={ssoEnforcement?.enforced}
										title={
											ssoEnforcement?.enforced
												? `SSO login required by ${ssoEnforcement.organizationName}`
												: undefined
										}
									>
										{hasPassword ? (
											<Trans>Change Password</Trans>
										) : (
											<Trans>Create Password</Trans>
										)}
									</Button>
								}
							></DialogTrigger>
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
								<Trans>Multi-factor authentication</Trans>
							</h3>
							<p className="text-muted-foreground text-sm">
								{isTwoFactorEnabled ? (
									<Trans>
										Your account is secured with two-factor authentication
									</Trans>
								) : (
									<Trans>
										Secure your account with an extra verification step
									</Trans>
								)}
							</p>
						</div>
						<Dialog
							open={isTwoFactorModalOpen}
							onOpenChange={setIsTwoFactorModalOpen}
						>
							<DialogTrigger
								render={
									<Button
										variant={isTwoFactorEnabled ? 'destructive' : 'outline'}
									>
										{isTwoFactorEnabled ? (
											<Trans>Disable 2FA</Trans>
										) : (
											<Trans>Set up authenticator app</Trans>
										)}
									</Button>
								}
							></DialogTrigger>
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
							<DialogTrigger
								render={
									<Button variant="outline">
										<Trans>Manage Passkeys</Trans>
									</Button>
								}
							></DialogTrigger>
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
