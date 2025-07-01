import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { generateTOTP, getTOTPAuthUri } from '@epic-web/totp'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { startRegistration } from '@simplewebauthn/browser'
import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import * as QRCode from 'qrcode'
import { useState, type ReactNode } from 'react'
import { useFetcher, useLoaderData, Link, useRevalidator, Form, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field, OTPField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '#app/components/ui/card.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { prepareVerification, isCodeValid } from '#app/routes/_auth+/verify.server.ts'
import { 
  requireUserId, 
  sessionKey,
  verifyUserPassword,
  getPasswordHash,
  checkIsCommonPassword
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getUserImgSrc, useDoubleCheck } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { 
  NameSchema, 
  UsernameSchema, 
  PasswordSchema,
  EmailSchema,
  PasswordAndConfirmPasswordSchema
} from '#app/utils/user-validation.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { newEmailAddressSessionKey } from './profile.change-email'
import { twoFAVerificationType } from './profile.two-factor'
import { twoFAVerifyVerificationType } from './profile.two-factor.verify'


// Types for components
interface PasskeyManagerProps {
  data: {
    passkeys: Array<{
      id: string
      deviceType: string | null
      createdAt: Date
    }>
  }
}

interface ConnectionsProps {
  data: {
    connections: Array<{
      id: string
      providerName: string
      providerId: string
      createdAt: Date
    }>
  }
}

interface DisconnectProviderProps {
  connectionId: string
  children?: ReactNode
}

interface SignOutOfSessionsProps {
  data: {
    user: {
      email: string
      _count: {
        sessions: number
      }
    }
  }
}

export const handle: SEOHandle = {
  getSitemapEntries: () => null,
}

const ProfileFormSchema = z.object({
	name: NameSchema.nullable().default(null),
	username: UsernameSchema,
})

const ChangeEmailSchema = z.object({
	email: EmailSchema,
})

const Enable2FASchema = z.object({
	code: z.string().min(6).max(6),
})

const ChangePasswordSchema = z
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

// Registration options schema for passkeys
const RegistrationOptionsSchema = z.object({
  options: z.object({
    rp: z.object({
      id: z.string(),
      name: z.string(),
    }),
    user: z.object({
      id: z.string(),
      name: z.string(),
      displayName: z.string(),
    }),
    challenge: z.string(),
    pubKeyCredParams: z.array(
      z.object({
        type: z.literal('public-key'),
        alg: z.number(),
      }),
    ),
    authenticatorSelection: z
      .object({
        authenticatorAttachment: z
          .enum(['platform', 'cross-platform'])
          .optional(),
        residentKey: z
          .enum(['required', 'preferred', 'discouraged'])
          .optional(),
        userVerification: z
          .enum(['required', 'preferred', 'discouraged'])
          .optional(),
        requireResidentKey: z.boolean().optional(),
      })
      .optional(),
  }),
})

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

    // Store the TOTP config in the database temporarily
    await prisma.verification.upsert({
      where: {
        target_type: { target: userId, type: twoFAVerifyVerificationType},
      },
      create: { target: userId, type: twoFAVerifyVerificationType, ...config },
      update: config,
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
const profileUpdateActionIntent = 'update-profile'
const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
const deleteDataActionIntent = 'delete-data'
const disconnectProviderActionIntent = 'disconnect-provider'
const registerPasskeyActionIntent = 'register-passkey'
const deletePasskeyActionIntent = 'delete-passkey'
const changeEmailActionIntent = 'change-email'
const changePasswordActionIntent = 'change-password'
const setPasswordActionIntent = 'set-password'
const enable2FAActionIntent = 'enable-2fa'
const disable2FAActionIntent = 'disable-2fa'

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	switch (intent) {
		case profileUpdateActionIntent: {
			return profileUpdateAction({ request, userId, formData })
		}
		case signOutOfSessionsActionIntent: {
			return signOutOfSessionsAction({ request, userId, formData })
		}
		case deleteDataActionIntent: {
			return deleteDataAction({ request, userId, formData })
		}
		case disconnectProviderActionIntent: {
			return disconnectProviderAction({ request, userId, formData })
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

async function profileUpdateAction({ userId, formData }: ProfileActionArgs) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ProfileFormSchema.superRefine(async ({ username }, ctx) => {
			const existingUsername = await prisma.user.findUnique({
				where: { username },
				select: { id: true },
			})
			if (existingUsername && existingUsername.id !== userId) {
				ctx.addIssue({
					path: ['username'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this username',
				})
			}
		}),
	})
	if (submission.status !== 'success') {
		return Response.json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { username, name } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			name: name,
			username: username,
		},
	})

	return Response.json({
		result: submission.reply(),
	})
}

async function signOutOfSessionsAction({ request, userId }: ProfileActionArgs) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	invariantResponse(
		sessionId,
		'You must be authenticated to sign out of other sessions',
	)
	await prisma.session.deleteMany({
		where: {
			userId,
			id: { not: sessionId },
		},
	})
	return Response.json({ status: 'success' })
}

async function deleteDataAction({ userId }: ProfileActionArgs) {
	await prisma.user.delete({ where: { id: userId } })
	return redirectWithToast('/', {
		type: 'success',
		title: 'Data Deleted',
		description: 'All of your data has been deleted',
	})
}

async function disconnectProviderAction({ formData, userId }: ProfileActionArgs) {
	const connectionId = formData.get('connectionId')
	invariantResponse(typeof connectionId === 'string', 'connectionId is required')
	
	await prisma.connection.delete({
		where: { id: connectionId, userId },
	})
	
	return Response.json({ status: 'success' })
}

async function changeEmailAction({ formData, userId, request }: ProfileActionArgs) {
  const submission = await parseWithZod(formData, {
    schema: ChangeEmailSchema.superRefine(async (data, ctx) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingUser) {
        ctx.addIssue({
          path: ['email'],
          code: z.ZodIssueCode.custom,
          message: 'This email is already in use.',
        })
      }
    }),
    async: true,
  })

  if (submission.status !== 'success') {
    return Response.json(
      { result: submission.reply(), status: 'error' },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }
  
  const { otp, redirectTo, verifyUrl } = await prepareVerification({
    period: 10 * 60,
    request,
    target: userId,
    type: 'change-email',
  })

  const verifySession = await verifySessionStorage.getSession()
  verifySession.set(newEmailAddressSessionKey, submission.value.email)
  
  return Response.json({
    status: 'success',
    result: submission.reply(),
    verificationInfo: {
      otp,
      verifyUrl: verifyUrl.toString(),
      email: submission.value.email
    }
  }, {
    headers: {
      'set-cookie': await verifySessionStorage.commitSession(verifySession),
    },
  })
}

async function changePasswordAction({ userId, formData }: ProfileActionArgs) {
  const submission = await parseWithZod(formData, {
    async: true,
    schema: ChangePasswordSchema.superRefine(
      async ({ currentPassword, newPassword }, ctx) => {
        if (currentPassword && newPassword) {
          const user = await verifyUserPassword({ id: userId }, currentPassword)
          if (!user) {
            ctx.addIssue({
              path: ['currentPassword'],
              code: z.ZodIssueCode.custom,
              message: 'Incorrect password.',
            })
          }
          const isCommonPassword = await checkIsCommonPassword(newPassword)
          if (isCommonPassword) {
            ctx.addIssue({
              path: ['newPassword'],
              code: 'custom',
              message: 'Password is too common',
            })
          }
        }
      },
    ),
  })
  
  if (submission.status !== 'success') {
    return Response.json(
      { 
        result: submission.reply({
          hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
        }),
      },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { newPassword } = submission.value

  await prisma.user.update({
    select: { username: true },
    where: { id: userId },
    data: {
      password: {
        update: {
          hash: await getPasswordHash(newPassword),
        },
      },
    },
  })

  return Response.json({
    status: 'success',
    result: submission.reply(),
  })
}

async function setPasswordAction({ userId, formData }: ProfileActionArgs) {
  const submission = await parseWithZod(formData, {
    async: true,
    schema: PasswordAndConfirmPasswordSchema.superRefine(async ({ password }, ctx) => {
      const isCommonPassword = await checkIsCommonPassword(password)
      if (isCommonPassword) {
        ctx.addIssue({
          path: ['password'],
          code: 'custom',
          message: 'Password is too common',
        })
      }
    }),
  })
  
  if (submission.status !== 'success') {
    return Response.json(
      {
        result: submission.reply({
          hideFields: ['password', 'confirmPassword'],
        }),
      },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }

  const { password } = submission.value

  await prisma.user.update({
    select: { username: true },
    where: { id: userId },
    data: {
      password: {
        create: {
          hash: await getPasswordHash(password),
        },
      },
    },
  })

  return Response.json({
    status: 'success',
    result: submission.reply(),
  })
}

async function enable2FAAction({ formData, userId }: ProfileActionArgs) {
  const submission = await parseWithZod(formData, {
    schema: Enable2FASchema.superRefine(async (data, ctx) => {
      const codeIsValid = await isCodeValid({
        code: data.code,
        type: twoFAVerifyVerificationType,
        target: userId,
      })
      if (!codeIsValid) {
        ctx.addIssue({
          path: ['code'],
          code: z.ZodIssueCode.custom,
          message: `Invalid code`,
        })
        return z.NEVER
      }
    }),
    async: true,
  })
  
  if (submission.status !== 'success') {
    return Response.json({ result: submission.reply(), status: 'error' }, { status: 400 })
  }

  await prisma.verification.update({
    where: {
      target_type: { type: twoFAVerifyVerificationType, target: userId },
    },
    data: { type: twoFAVerificationType },
  })
  
  return Response.json({ status: 'success' })
}

async function disable2FAAction({ userId }: ProfileActionArgs) {
  await prisma.verification.delete({
    where: {
      target_type: { target: userId, type: twoFAVerificationType },
    },
  })
  
  return Response.json({ status: 'success' })
}

// Mock function for passkey registration - in a real app, you'd use your passkey API
async function registerPasskeyAction({ request }: ActionFunctionArgs) {
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
  const fetcher = useFetcher()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false)
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const revalidator = useRevalidator()
  
  const [form, fields] = useForm({
    id: 'edit-profile',
    constraint: getZodConstraint(ProfileFormSchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ProfileFormSchema })
    },
    defaultValue: {
      username: data.user.username,
      name: data.user.name,
    },
  })

	return (
		<div className="flex flex-col gap-12">
			<div className="flex justify-center">
				<div className="relative size-52">
					<Img
						src={getUserImgSrc(data.user.image?.objectKey)}
						alt={data.user.name ?? data.user.username}
						className="h-full w-full rounded-full object-cover"
						width={832}
						height={832}
						isAboveFold
					/>
					<Button
						asChild
						variant="outline"
						className="absolute top-3 -right-3 flex size-10 items-center justify-center rounded-full p-0"
					>
						<Link
							preventScrollReset
							to="/settings/profile/photo"
							title="Change profile photo"
							aria-label="Change profile photo"
						>
							<Icon name="camera" className="size-4" />
						</Link>
					</Button>
				</div>
			</div>
			
      <Card className="w-full">
        <CardHeader className="border-b border-muted">
          <CardTitle className="text-xl">Your profile</CardTitle>
          <CardDescription>Customize how you appear to others</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-0">
          <fetcher.Form method="POST" {...getFormProps(form)}>
            <div className="grid grid-cols-6 gap-x-10">
              <Field
                className="col-span-3"
                labelProps={{
                  htmlFor: fields.username.id,
                  children: 'Username',
                }}
                inputProps={getInputProps(fields.username, { type: 'text' })}
                errors={fields.username.errors}
              />
              <Field
                className="col-span-3"
                labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
                inputProps={getInputProps(fields.name, { type: 'text' })}
                errors={fields.name.errors}
              />
            </div>
            <ErrorList errors={form.errors} id={form.errorId} />
          </fetcher.Form>
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

      <Card className="w-full">
        <CardHeader className="border-b border-muted">
          <CardTitle className="text-xl">Email address</CardTitle>
          <CardDescription>Change your email address</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="flex justify-between items-center">
            <div>
              <p>Current email: <strong>{data.user.email}</strong></p>
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

      <Card className="w-full">
        <CardHeader className="border-b border-muted">
          <CardTitle className="text-xl">Security</CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">
                  {data.hasPassword ? 'Change Password' : 'Create Password'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {data.hasPassword
                    ? 'Change your password to something new'
                    : 'Create a password to secure your account'}
                </p>
              </div>
              <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    {data.hasPassword ? 'Change Password' : 'Create Password'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {data.hasPassword ? 'Change Password' : 'Create Password'}
                    </DialogTitle>
                  </DialogHeader>
                  <PasswordForm 
                    hasPassword={data.hasPassword} 
                    setIsOpen={setIsPasswordModalOpen} 
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">
                  {data.isTwoFactorEnabled ? 'Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {data.isTwoFactorEnabled
                    ? 'Your account is secured with two-factor authentication'
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
              <Dialog open={isTwoFactorModalOpen} onOpenChange={setIsTwoFactorModalOpen}>
                <DialogTrigger asChild>
                  <Button variant={data.isTwoFactorEnabled ? "destructive" : "outline"}>
                    {data.isTwoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Two-Factor Authentication</DialogTitle>
                  </DialogHeader>
                  <TwoFactorForm 
                    isTwoFactorEnabled={data.isTwoFactorEnabled}
                    qrCode={data.qrCode}
                    otpUri={data.otpUri}
                    setIsOpen={setIsTwoFactorModalOpen}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Passkeys</h3>
                <p className="text-sm text-muted-foreground">
                  {data.passkeys?.length > 0 
                    ? `You're signed in on ${data.user._count.sessions} device${data.user._count.sessions === 1 ? '' : 's'} as ${data.user.email}`
                    : 'Register a passkey to log in without a password'}
                </p>
              </div>
              <Dialog open={isPasskeyModalOpen} onOpenChange={setIsPasskeyModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Manage Passkeys</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Manage Passkeys</DialogTitle>
                  </DialogHeader>
                  <PasskeyManager data={data} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.connections.length > 0 && (
        <Card className="w-full">
          <CardHeader className="border-b border-muted">
            <CardTitle className="text-xl">Connected Accounts</CardTitle>
            <CardDescription>Manage your connections to external services</CardDescription>
          </CardHeader>
          <CardContent>
            <Connections data={data} />
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader className="border-b border-muted">
          <CardTitle className="text-xl">Advanced Settings</CardTitle>
          <CardDescription>Manage your data and account sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex items-center">
              <Icon name="download" className="mr-2" />
              <Link
                reloadDocument
                download="my-epic-notes-data.json"
                to="/resources/download-user-data"
                className="hover:underline"
              >
                Download your data
              </Link>
            </div>
            <SignOutOfSessions data={data} />
            <DeleteData />
          </div>
        </CardContent>
      </Card>
		</div>
	)
}


function EmailChangeForm({ setIsOpen }: { setIsOpen: (open: boolean) => void}) {
  const fetcher = useFetcher()
  
  const [form, fields] = useForm({
    id: 'change-email-form',
    constraint: getZodConstraint(ChangeEmailSchema),
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ChangeEmailSchema })
    },
  })
  
  if (fetcher.data?.status === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          A verification email has been sent to <strong>{fetcher.data.verificationInfo.email}</strong>. 
          Please check your inbox and follow the instructions to verify your new email address.
        </p>
        <p className="text-sm">Verification code: <strong>{fetcher.data.verificationInfo.otp}</strong></p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </div>
      </div>
    )
  }
  
  return (
    <fetcher.Form method="POST" {...getFormProps(form)}>
      <input type="hidden" name="intent" value={changeEmailActionIntent} />
      <Field
        labelProps={{ children: 'New Email' }}
        inputProps={{
          ...getInputProps(fields.email, { type: 'email' }),
          autoComplete: 'email',
        }}
        errors={fields.email.errors}
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
          Save
        </StatusButton>
      </div>
    </fetcher.Form>
  )
}

function PasswordForm({ hasPassword, setIsOpen }: { hasPassword: boolean; setIsOpen: (open: boolean) => void}) {
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

function TwoFactorForm({ isTwoFactorEnabled, qrCode, otpUri, setIsOpen }: { isTwoFactorEnabled: boolean, qrCode: string, otpUri: string, setIsOpen: (open: boolean) => void }) {
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

function PasskeyManager({ data }: PasskeyManagerProps) {
  const [error, setError] = useState<string | null>(null)
  const revalidator = useRevalidator()

  async function handlePasskeyRegistration() {
    try {
      setError(null)
      const resp = await fetch('/webauthn/registration')
      const jsonResult = await resp.json()
      const parsedResult = RegistrationOptionsSchema.parse(jsonResult)

      const regResult = await startRegistration({
        optionsJSON: parsedResult.options,
      })

      const verificationResp = await fetch('/webauthn/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResult),
      })

      if (!verificationResp.ok) {
        throw new Error('Failed to verify registration')
      }

      void revalidator.revalidate()
    } catch (err) {
      console.error('Failed to create passkey:', err)
      setError('Failed to create passkey. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between gap-4">
        <Button
          type="button"
          variant="secondary"
          className="flex items-center gap-2"
          onClick={handlePasskeyRegistration}
        >
          <Icon name="plus">Register new passkey</Icon>
        </Button>
      </div>

      {error ? (
        <div className="bg-destructive/15 text-destructive rounded-lg p-4">
          {error}
        </div>
      ) : null}

      {data.passkeys?.length ? (
        <ul className="flex flex-col gap-4" title="passkeys">
          {data.passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="border-muted-foreground flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="lock-closed" />
                  <span className="font-semibold">
                    {passkey.deviceType === 'platform'
                      ? 'Device'
                      : 'Security Key'}
                  </span>
                </div>
                <div className="text-muted-foreground text-sm">
                  Registered {formatDistanceToNow(new Date(passkey.createdAt))}{' '}
                  ago
                </div>
              </div>
              <Form method="POST">
                <input type="hidden" name="passkeyId" value={passkey.id} />
                <Button
                  type="submit"
                  name="intent"
                  value={deletePasskeyActionIntent}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Icon name="trash" />
                  <span>Delete</span>
                </Button>
              </Form>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-muted-foreground text-center">
          No passkeys registered yet
        </div>
      )}
    </div>
  )
}

function Connections({ data }: ConnectionsProps) {
	if (!data.connections.length) {
		return null
	}

	return (
		<div className="flex flex-col gap-4">
			<ul className="flex flex-col gap-4">
				{data.connections.map(connection => (
					<li key={connection.id} className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Icon name="link-2" />
							<span>{connection.providerName}</span>
              <span className="text-xs text-muted-foreground">
                Connected on {new Date(connection.createdAt).toLocaleDateString()}
              </span>
						</div>
						<DisconnectProvider connectionId={connection.id} />
					</li>
				))}
			</ul>
		</div>
	)
}

function DisconnectProvider({ connectionId, children: _children }: DisconnectProviderProps) {
	const dc = useDoubleCheck()
	const fetcher = useFetcher()
	
	return (
		<fetcher.Form method="POST">
			<input type="hidden" name="connectionId" value={connectionId} />
			<StatusButton
				{...dc.getButtonProps({
					type: 'submit',
					name: 'intent',
					value: disconnectProviderActionIntent,
				})}
				variant={dc.doubleCheck ? 'destructive' : 'outline'}
				status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				size="sm"
			>
				{dc.doubleCheck ? 'Are you sure?' : 'Disconnect'}
			</StatusButton>
		</fetcher.Form>
	)
}

function SignOutOfSessions({ data }: SignOutOfSessionsProps) {
	const dc = useDoubleCheck()

	const fetcher = useFetcher()
	const otherSessionsCount = data.user._count.sessions - 1
	
	if (otherSessionsCount <= 0) {
		return (
			<div className="flex items-center">
				<Icon name="avatar" className="mr-2" />
				<span>This is your only active session</span>
			</div>
		)
	}
	
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center">
				<Icon name="avatar" className="mr-2" />
				<span>You have {otherSessionsCount} other active {otherSessionsCount === 1 ? 'session' : 'sessions'}</span>
			</div>
			<fetcher.Form method="POST">
				<StatusButton
					{...dc.getButtonProps({
						type: 'submit',
						name: 'intent',
						value: signOutOfSessionsActionIntent,
					})}
					variant={dc.doubleCheck ? 'destructive' : 'outline'}
					status={
						fetcher.state !== 'idle'
							? 'pending'
							: (fetcher.data?.status ?? 'idle')
					}
				>
					{dc.doubleCheck
						? 'Are you sure?'
						: `Sign out of other ${otherSessionsCount === 1 ? 'session' : 'sessions'}`}
				</StatusButton>
			</fetcher.Form>
		</div>
	)
}

function DeleteData() {
	const dc = useDoubleCheck()

	const fetcher = useFetcher()
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center">
				<Icon name="trash" className="mr-2" />
				<span>Delete all your data and account</span>
			</div>
			<fetcher.Form method="POST">
				<StatusButton
					{...dc.getButtonProps({
						type: 'submit',
						name: 'intent',
						value: deleteDataActionIntent,
					})}
					variant={dc.doubleCheck ? 'destructive' : 'outline'}
					status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				>
					{dc.doubleCheck ? 'Are you sure?' : 'Delete account'}
				</StatusButton>
			</fetcher.Form>
		</div>
	)
}