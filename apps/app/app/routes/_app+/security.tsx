import { generateTOTP, getTOTPAuthUri } from '@epic-web/totp'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import * as QRCode from 'qrcode'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import { Divider } from '@repo/ui/divider'
import { PageTitle } from '@repo/ui/page-title'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { AdvancedSettingsCard } from '#app/components/settings/cards/advanced-settings-card.tsx'
import { ConnectionsCard } from '#app/components/settings/cards/connections-card.tsx'
import { DangerCard } from '#app/components/settings/cards/danger-card.tsx'
import { SecurityCard } from '#app/components/settings/cards/security-card.tsx'

import { requireUserId } from '#app/utils/auth.server.ts'
import { cache, cachified } from '#app/utils/cache.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userSecuritySelect } from '#app/utils/user-security.server.ts'
import {
	deleteDataAction,
	signOutOfSessionsAction,
} from '../settings+/actions/account.actions'
import { disconnectProviderAction } from '../settings+/actions/connections.actions'
import {
	changePasswordAction,
	disable2FAAction,
	enable2FAAction,
	setPasswordAction,
} from '../settings+/actions/security.actions'
import { twoFAVerificationType } from '../settings+/profile.two-factor'
import { twoFAVerifyVerificationType } from '../settings+/profile.two-factor.verify'
import { useLoaderData } from 'react-router'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	// Run all database queries in parallel for better performance
	// User query is cached with short TTL for security-sensitive data
	// Cache invalidated on security updates via invalidateUserSecurityCache()
	// Using Promise.allSettled for resilient error handling - non-critical queries
	// (connections, passkeys) gracefully degrade on failure
	const results = await Promise.allSettled([
		cachified({
			key: `user-security:${userId}`,
			cache,
			ttl: 1000 * 30, // 30 seconds for security-sensitive data
			getFreshValue: () =>
				prisma.user.findUniqueOrThrow({
					where: { id: userId },
					select: userSecuritySelect,
				}),
		}),
		prisma.verification.findUnique({
			select: { id: true },
			where: { target_type: { type: twoFAVerificationType, target: userId } },
		}),
		prisma.password.findUnique({
			select: { userId: true },
			where: { userId },
		}),
		prisma.connection.findMany({
			select: {
				id: true,
				providerName: true,
				providerId: true,
				createdAt: true,
			},
			where: { userId },
		}),
		// Get passkeys for this user
		prisma.passkey.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				deviceType: true,
				createdAt: true,
			},
		}),
	])

	// Extract results with error handling
	const user =
		results[0].status === 'fulfilled' ? results[0].value : (() => { throw results[0].reason })()
	const twoFactorVerification =
		results[1].status === 'fulfilled' ? results[1].value : null
	const password = results[2].status === 'fulfilled' ? results[2].value : null
	const connections =
		results[3].status === 'fulfilled' ? results[3].value : []
	const passkeys = results[4].status === 'fulfilled' ? results[4].value : []

	// Generate TOTP QR code if 2FA is not enabled
	let qrCode = null
	let otpUri = null
	if (!twoFactorVerification) {
		const { otp: _otp, ...config } = await generateTOTP()
		otpUri = getTOTPAuthUri({
			...config,
			accountName: user.email,
			issuer: 'Epic Stack',
		})

		qrCode = await QRCode.toDataURL(otpUri)

		const verificationData = {
			...config,
			type: twoFAVerifyVerificationType,
			target: userId,
		}

		// Store the TOTP config in the database temporarily
		await prisma.verification.upsert({
			where: {
				target_type: { target: userId, type: twoFAVerifyVerificationType },
			},
			create: verificationData,
			update: verificationData,
		})
	}

	return {
		user,
		hasPassword: Boolean(password),
		isTwoFactorEnabled: Boolean(twoFactorVerification),
		connections,
		qrCode,
		otpUri,
		passkeys,
	}
}

type SecurityActionArgs = {
	request: Request
	userId: string
	formData: FormData
}

export const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
export const deleteDataActionIntent = 'delete-data'
export const disconnectProviderActionIntent = 'disconnect-provider'
export const registerPasskeyActionIntent = 'register-passkey'
export const deletePasskeyActionIntent = 'delete-passkey'
export const changePasswordActionIntent = 'change-password'
export const setPasswordActionIntent = 'set-password'
export const enable2FAActionIntent = 'enable-2fa'
export const disable2FAActionIntent = 'disable-2fa'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	switch (intent) {
		case signOutOfSessionsActionIntent: {
			return signOutOfSessionsAction({ request, userId, formData })
		}
		case deleteDataActionIntent: {
			return deleteDataAction({ request, userId, formData })
		}
		case disconnectProviderActionIntent: {
			return disconnectProviderAction({ userId, formData })
		}
		case changePasswordActionIntent: {
			return changePasswordAction({ request, userId, formData })
		}
		case setPasswordActionIntent: {
			return setPasswordAction({ request, userId, formData })
		}
		case enable2FAActionIntent: {
			return enable2FAAction({ request, userId, formData })
		}
		case disable2FAActionIntent: {
			return disable2FAAction({ request, userId, formData })
		}
		case registerPasskeyActionIntent: {
			return registerPasskeyAction({ request, userId, formData })
		}
		case deletePasskeyActionIntent: {
			return deletePasskeyAction({ request, userId, formData })
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

// Mock function for passkey registration - in a real app, you'd use your passkey API
async function registerPasskeyAction({}: SecurityActionArgs) {
	return { status: 'success' }
}

async function deletePasskeyAction({ formData, userId }: SecurityActionArgs) {
	const passkeyId = formData.get('passkeyId')
	if (typeof passkeyId !== 'string') {
		throw new Response('Invalid passkey ID', { status: 400 })
	}

	await prisma.passkey.delete({
		where: {
			id: passkeyId,
			userId, // Ensure the passkey belongs to the user
		},
	})

	return { status: 'success' }
}

export default function SecuritySettings() {
	const data = useLoaderData<typeof loader>()
	const { _ } = useLingui()

	return (
		<div className="my-8 flex flex-1 flex-col gap-4 md:m-8">
			<AnnotatedLayout>
				<PageTitle
					title={_(t`Security Settings`)}
					description={_(t`Manage your password, two-factor authentication, connected accounts, and advanced security settings.`)}
				/>

				<AnnotatedSection>
					<SecurityCard
						hasPassword={data.hasPassword}
						isTwoFactorEnabled={data.isTwoFactorEnabled}
						passkeys={data.passkeys}
						user={data.user}
						qrCode={data.qrCode}
						otpUri={data.otpUri}
					/>
				</AnnotatedSection>

				<AnnotatedSection>
					<ConnectionsCard user={data.user} connections={data.connections} />
				</AnnotatedSection>

				<AnnotatedSection>
					<AdvancedSettingsCard user={data.user} />
				</AnnotatedSection>

				<AnnotatedSection>
					<Divider className="mt-2" />
					<DangerCard user={data.user} />
				</AnnotatedSection>
			</AnnotatedLayout>
		</div>
	)
}
