import { Trans } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Label } from '@repo/ui/label'
import { Switch } from '@repo/ui/switch'
import { data, Form, useFetcher } from 'react-router'
import { type Route } from './+types/privacy'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			name: true,
			username: true,
			privacyConsent: true,
			marketingConsent: true,
			analyticsConsent: true,
			dataProcessingConsent: true,
		},
	})

	if (!user) {
		throw new Response('User not found', { status: 404 })
	}

	return data({ user })
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case 'export-data': {
			// This will be handled by a separate export route
			return redirectWithToast('/settings/privacy/export', {
				type: 'message',
				title: 'Preparing your data export',
				description: 'This may take a few moments...',
			})
		}

		case 'update-consent': {
			const privacyConsent = formData.get('privacyConsent') === 'true'
			const marketingConsent = formData.get('marketingConsent') === 'true'
			const analyticsConsent = formData.get('analyticsConsent') === 'true'
			const dataProcessingConsent =
				formData.get('dataProcessingConsent') === 'true'

			await prisma.user.update({
				where: { id: userId },
				data: {
					privacyConsent,
					marketingConsent,
					analyticsConsent,
					dataProcessingConsent,
					consentUpdatedAt: new Date(),
				},
			})

			return redirectWithToast('/settings/privacy', {
				type: 'success',
				title: 'Consent preferences updated',
				description: 'Your privacy preferences have been saved.',
			})
		}

		case 'revoke-all-consent': {
			await prisma.user.update({
				where: { id: userId },
				data: {
					privacyConsent: false,
					marketingConsent: false,
					analyticsConsent: false,
					dataProcessingConsent: false,
					consentUpdatedAt: new Date(),
				},
			})

			return redirectWithToast('/settings/privacy', {
				type: 'success',
				title: 'All consent revoked',
				description:
					'Your consent has been revoked. Some features may be limited.',
			})
		}

		default:
			throw new Response('Invalid intent', { status: 400 })
	}
}

export default function PrivacySettings({
	loaderData,
}: Route.ComponentProps) {
	const { user } = loaderData
	const exportFetcher = useFetcher()

	return (
		<div className="container max-w-3xl py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">
					<Trans>Privacy & Data</Trans>
				</h1>
				<p className="mt-2 text-muted-foreground">
					<Trans>
						Manage your privacy settings and control how your data is used
					</Trans>
				</p>
			</div>

			{/* GDPR Rights */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>
						<Trans>Your Data Rights</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Under GDPR, you have the right to access, correct, and delete your
							personal data
						</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>
								<Trans>Export Your Data</Trans>
							</Label>
							<p className="text-sm text-muted-foreground">
								<Trans>
									Download a copy of all your personal data (Right to Data
									Portability)
								</Trans>
							</p>
						</div>
						<exportFetcher.Form method="post">
							<input type="hidden" name="intent" value="export-data" />
							<Button
								type="submit"
								variant="outline"
								disabled={exportFetcher.state === 'submitting'}
							>
								<Icon name="download" className="mr-2" />
								<Trans>Export Data</Trans>
							</Button>
						</exportFetcher.Form>
					</div>

					<div className="flex items-center justify-between border-t pt-4">
						<div className="space-y-0.5">
							<Label className="text-destructive">
								<Trans>Delete Your Account</Trans>
							</Label>
							<p className="text-sm text-muted-foreground">
								<Trans>
									Permanently delete your account and all associated data
								</Trans>
							</p>
						</div>
						<Button variant="destructive" asChild>
							<a href="/settings/profile#delete-data">
								<Icon name="trash" className="mr-2" />
								<Trans>Delete Account</Trans>
							</a>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Consent Management */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>
						<Trans>Consent Management</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Control how we use your data and for what purposes
						</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form method="post" className="space-y-4">
						<input type="hidden" name="intent" value="update-consent" />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="privacyConsent">
									<Trans>Essential Services</Trans>
									<span className="ml-2 text-xs text-muted-foreground">
										(Required)
									</span>
								</Label>
								<p className="text-sm text-muted-foreground">
									<Trans>
										Required for core functionality and security of the service
									</Trans>
								</p>
							</div>
							<Switch
								id="privacyConsent"
								name="privacyConsent"
								defaultChecked={user.privacyConsent ?? true}
								disabled
							/>
						</div>

						<div className="flex items-center justify-between border-t pt-4">
							<div className="space-y-0.5">
								<Label htmlFor="dataProcessingConsent">
									<Trans>Data Processing</Trans>
								</Label>
								<p className="text-sm text-muted-foreground">
									<Trans>
										Allow us to process your data for service improvements
									</Trans>
								</p>
							</div>
							<Switch
								id="dataProcessingConsent"
								name="dataProcessingConsent"
								defaultChecked={user.dataProcessingConsent ?? false}
							/>
						</div>

						<div className="flex items-center justify-between border-t pt-4">
							<div className="space-y-0.5">
								<Label htmlFor="analyticsConsent">
									<Trans>Analytics & Performance</Trans>
								</Label>
								<p className="text-sm text-muted-foreground">
									<Trans>
										Help us improve by allowing anonymous usage analytics
									</Trans>
								</p>
							</div>
							<Switch
								id="analyticsConsent"
								name="analyticsConsent"
								defaultChecked={user.analyticsConsent ?? false}
							/>
						</div>

						<div className="flex items-center justify-between border-t pt-4">
							<div className="space-y-0.5">
								<Label htmlFor="marketingConsent">
									<Trans>Marketing Communications</Trans>
								</Label>
								<p className="text-sm text-muted-foreground">
									<Trans>
										Receive updates about new features and product news
									</Trans>
								</p>
							</div>
							<Switch
								id="marketingConsent"
								name="marketingConsent"
								defaultChecked={user.marketingConsent ?? false}
							/>
						</div>

						<div className="flex gap-4 border-t pt-4">
							<Button type="submit">
								<Trans>Save Preferences</Trans>
							</Button>
							<Button
								type="submit"
								variant="outline"
								name="intent"
								value="revoke-all-consent"
							>
								<Trans>Revoke All Consent</Trans>
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>

			{/* Data Retention */}
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Data Retention</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>How long we keep your data</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div>
						<strong>
							<Trans>Active Account Data:</Trans>
						</strong>{' '}
						<Trans>Retained while your account is active</Trans>
					</div>
					<div>
						<strong>
							<Trans>Deleted Account Data:</Trans>
						</strong>{' '}
						<Trans>
							Permanently deleted within 30 days, except for legal requirements
						</Trans>
					</div>
					<div>
						<strong>
							<Trans>Audit Logs:</Trans>
						</strong>{' '}
						<Trans>Retained for 365 days for security and compliance</Trans>
					</div>
					<div>
						<strong>
							<Trans>Backup Data:</Trans>
						</strong>{' '}
						<Trans>Removed from backups within 90 days</Trans>
					</div>
					<div className="mt-4 border-t pt-4">
						<a
							href="/legal/privacy-policy"
							className="text-primary hover:underline"
						>
							<Trans>Read our full Privacy Policy</Trans> →
						</a>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
