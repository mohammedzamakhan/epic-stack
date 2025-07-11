import { generateTOTP, getTOTPAuthUri } from '@epic-web/totp'
import { parseFormData } from '@mjackson/form-data-parser'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import * as QRCode from 'qrcode'
import { useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { AdvancedSettingsCard } from '#app/components/settings/cards/advanced-settings-card.tsx'
import { ConnectionsCard } from '#app/components/settings/cards/connections-card.tsx'
import { EmailCard } from '#app/components/settings/cards/email-card.tsx'
import { ProfileCard } from '#app/components/settings/cards/profile-card.tsx'
import { ProfilePhoto } from '#app/components/settings/cards/profile-photo.tsx'
import { SecurityCard } from '#app/components/settings/cards/security-card.tsx'
import { AnnotatedLayout, AnnotatedSection } from '#app/components/ui/annotated-layout.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { deleteDataAction, signOutOfSessionsAction } from './actions/account.actions'
import { disconnectProviderAction } from './actions/connections.actions'
import { changeEmailAction } from './actions/email.actions'
import { photoAction } from './actions/photo.actions'
import { profileUpdateAction } from './actions/profile.actions'
import { changePasswordAction, disable2FAAction, enable2FAAction, setPasswordAction } from './actions/security.actions'
import { twoFAVerificationType } from './profile.two-factor'
import { twoFAVerifyVerificationType } from './profile.two-factor.verify'

export const handle: SEOHandle = {
  getSitemapEntries: () => null,
}

// Photo upload schema
const MAX_SIZE = 1024 * 1024 * 3 // 3MB

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			image: {
				select: { objectKey: true },
			},
			_count: {
				select: {
					sessions: {
						where: {
							expirationDate: { gt: new Date() },
						},
					},
				},
			},
		},
	})

	const twoFactorVerification = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { type: twoFAVerificationType, target: userId } },
	})

	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})

	const connections = await prisma.connection.findMany({
		select: {
			id: true,
			providerName: true,
			providerId: true,
			createdAt: true,
		},
		where: { userId },
	})

  // Get passkeys for this user
  const passkeys = await prisma.passkey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      deviceType: true,
      createdAt: true,
    },
  })

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
        target_type: { target: userId, type: twoFAVerifyVerificationType},
      },
      create: verificationData,
      update: verificationData,
    })
  }

	return Response.json({
		user,
		hasPassword: Boolean(password),
		isTwoFactorEnabled: Boolean(twoFactorVerification),
		connections,
    qrCode,
    otpUri,
    passkeys
	})
}

type ProfileActionArgs = {
	request: Request
	userId: string
	formData: FormData
}

export const profileUpdateActionIntent = 'update-profile'
export const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
export const deleteDataActionIntent = 'delete-data'
export const disconnectProviderActionIntent = 'disconnect-provider'
export const registerPasskeyActionIntent = 'register-passkey'
export const deletePasskeyActionIntent = 'delete-passkey'
export const changeEmailActionIntent = 'change-email'
export const changePasswordActionIntent = 'change-password'
export const setPasswordActionIntent = 'set-password'
export const enable2FAActionIntent = 'enable-2fa'
export const disable2FAActionIntent = 'disable-2fa'
export const uploadPhotoActionIntent = 'upload-photo'
export const deletePhotoActionIntent = 'delete-photo'

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
	const userId = await requireUserId(request)
  const contentType = request.headers.get('content-type')
  
  let intent
	
	if (contentType?.includes('multipart/form-data')) {
    const formData = await parseFormData(request, { maxFileSize: MAX_SIZE })
		intent = formData.get('intent')
		
		if (intent === uploadPhotoActionIntent || intent === deletePhotoActionIntent) {
      return photoAction({ userId, formData, request })
		}
	}
  
  const formData = await request.formData()
	intent = formData.get('intent')

	switch (intent) {
		case profileUpdateActionIntent: {
			return profileUpdateAction({ userId, formData })
		}
		case signOutOfSessionsActionIntent: {
			return signOutOfSessionsAction({ request, userId, formData })
		}
		case deleteDataActionIntent: {
			return deleteDataAction({ request, userId, formData })
		}
		case disconnectProviderActionIntent: {
			return disconnectProviderAction({ userId, formData })
		}
    case changeEmailActionIntent: {
      return changeEmailAction({ request, userId, formData })
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
async function registerPasskeyAction({ request, userId, formData }: ProfileActionArgs) {
  return Response.json({ status: 'success' })
}

async function deletePasskeyAction({ formData, userId }: ProfileActionArgs) {
  const passkeyId = formData.get('passkeyId')
  if (typeof passkeyId !== 'string') {
    return Response.json(
      { status: 'error', error: 'Invalid passkey ID' },
      { status: 400 },
    )
  }

  await prisma.passkey.delete({
    where: {
      id: passkeyId,
      userId, // Ensure the passkey belongs to the user
    },
  })
  
  return Response.json({ status: 'success' })
}

export default function GeneralSettings() {
	const data = useLoaderData()

	return (
		<AnnotatedLayout>
			<AnnotatedSection
				title="Profile"
				description="Update your photo and personal details here."
			>
				<ProfileCard user={data.user} />
			</AnnotatedSection>

			<AnnotatedSection
				title="Email"
				description="Manage your email address and preferences."
			>
				<EmailCard email={data.user.email} />
			</AnnotatedSection>

			<AnnotatedSection
				title="Security"
				description="Manage your password and two-factor authentication settings."
			>
				<SecurityCard hasPassword={data.hasPassword} isTwoFactorEnabled={data.isTwoFactorEnabled} passkeys={data.passkeys} user={data.user} qrCode={data.qrCode} otpUri={data.otpUri} />
			</AnnotatedSection>

			<AnnotatedSection
				title="Connected accounts"
				description="Sign up faster to your account by linking it to Google or Microsoft."
			>
				<ConnectionsCard user={data.user} connections={data.connections} />
			</AnnotatedSection>

			<AnnotatedSection
				title="Advanced"
				description="Manage your sessions and delete your account data."
			>
				<AdvancedSettingsCard user={data.user} />
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
