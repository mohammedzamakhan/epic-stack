import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { i18n } from '@lingui/core'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { prisma } from '@repo/database'
import { Button } from '@repo/ui/button'
import { Field, FieldLabel, FieldError, FieldGroup } from '@repo/ui/field'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { StatusButton } from '@repo/ui/status-button'
import { NameSchema, UsernameSchema } from '@repo/validation'
import { Img } from 'openimg/react'
import { data, Link, useFetcher } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'

import { requireUserId, sessionKey } from '#app/utils/auth.server.ts'
import { getUserImgSrc, useDoubleCheck } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { getUserSecurityData } from '#app/utils/user-security.server.ts'
import { type Route } from './+types/profile.index.ts'
import { twoFAVerificationType } from './profile.two-factor.tsx'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export const ProfileFormSchema = z.object({
	name: NameSchema.nullable().default(null),
	username: UsernameSchema,
})

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const { user, password, twoFactorVerification } = await getUserSecurityData(
		userId,
		twoFAVerificationType,
	)

	return {
		user,
		hasPassword: Boolean(password),
		isTwoFactorEnabled: Boolean(twoFactorVerification),
	}
}

type ProfileActionArgs = {
	request: Request
	userId: string
	formData: FormData
}
const profileUpdateActionIntent = 'update-profile'
const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
const deleteDataActionIntent = 'delete-data'

export async function action({ request }: Route.ActionArgs) {
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
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

export default function EditUserProfile({ loaderData }: Route.ComponentProps) {
	const { _ } = useLingui()

	return (
		<div className="flex flex-col gap-12">
			<div className="flex justify-center">
				<div className="relative size-52">
					<Img
						src={getUserImgSrc(loaderData.user.image?.objectKey)}
						alt={loaderData.user.name ?? loaderData.user.username}
						className="h-full w-full rounded-full object-cover"
						width={832}
						height={832}
						isAboveFold
					/>
					<Button
						variant="outline"
						className="absolute top-3 -right-3 flex size-10 items-center justify-center rounded-full p-0"
					>
						<Link
							preventScrollReset
							to="photo"
							title={_(t`Change profile photo`)}
							aria-label={_(t`Change profile photo`)}
						>
							<Icon name="camera" className="size-4" />
						</Link>
					</Button>
				</div>
			</div>
			<UpdateProfile loaderData={loaderData} />

			<div className="border-foreground col-span-6 my-6 h-1 border-b-[1.5px]" />
			<div className="col-span-full flex flex-col gap-6">
				<div>
					<Link to="change-email">
						<Icon name="mail">
							<Trans>Change email from {loaderData.user.email}</Trans>
						</Icon>
					</Link>
				</div>
				<div>
					<Link to="two-factor">
						{loaderData.isTwoFactorEnabled ? (
							<Icon name="lock">
								<Trans>2FA is enabled</Trans>
							</Icon>
						) : (
							<Icon name="unlock">
								<Trans>Enable 2FA</Trans>
							</Icon>
						)}
					</Link>
				</div>
				<div>
					<Link to={loaderData.hasPassword ? 'password' : 'password/create'}>
						<Icon name="more-horizontal">
							{loaderData.hasPassword ? (
								<Trans>Change Password</Trans>
							) : (
								<Trans>Create a Password</Trans>
							)}
						</Icon>
					</Link>
				</div>
				<div>
					<Link to="connections">
						<Icon name="link-2">
							<Trans>Manage connections</Trans>
						</Icon>
					</Link>
				</div>
				<div>
					<Link to="passkeys">
						<Icon name="passkey">
							<Trans>Manage passkeys</Trans>
						</Icon>
					</Link>
				</div>
				<div>
					<Link
						reloadDocument
						download="my-epic-notes-data.json"
						to="/resources/download-user-data"
					>
						<Icon name="download">
							<Trans>Download your data</Trans>
						</Icon>
					</Link>
				</div>
				<SignOutOfSessions loaderData={loaderData} />
				<DeleteData />
			</div>
		</div>
	)
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
					message: i18n._(t`A user already exists with this username`),
				})
			}
		}),
	})
	if (submission.status !== 'success') {
		return data(
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

	return {
		result: submission.reply(),
	}
}

function UpdateProfile({
	loaderData,
}: {
	loaderData: Route.ComponentProps['loaderData']
}) {
	const fetcher = useFetcher<typeof profileUpdateAction>()

	const [form, fields] = useForm({
		id: 'edit-profile',
		constraint: getZodConstraint(ProfileFormSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProfileFormSchema })
		},
		defaultValue: {
			username: loaderData.user.username,
			name: loaderData.user.name,
		},
	})

	return (
		<fetcher.Form method="POST" {...getFormProps(form)}>
			<FieldGroup>
				<div className="grid grid-cols-6 gap-x-10">
					<Field
						className="col-span-3"
						data-invalid={fields.username.errors?.length ? true : undefined}
					>
						<FieldLabel htmlFor={fields.username.id}>
							<Trans>Username</Trans>
						</FieldLabel>
						<Input
							{...getInputProps(fields.username, { type: 'text' })}
							aria-invalid={fields.username.errors?.length ? true : undefined}
						/>
						<FieldError
							errors={convertErrorsToFieldFormat(fields.username.errors)}
						/>
					</Field>

					<Field
						className="col-span-3"
						data-invalid={fields.name.errors?.length ? true : undefined}
					>
						<FieldLabel htmlFor={fields.name.id}>
							<Trans>Name</Trans>
						</FieldLabel>
						<Input
							{...getInputProps(fields.name, { type: 'text' })}
							aria-invalid={fields.name.errors?.length ? true : undefined}
						/>
						<FieldError
							errors={convertErrorsToFieldFormat(fields.name.errors)}
						/>
					</Field>
				</div>

				<ErrorList errors={form.errors} id={form.errorId} />

				<div className="mt-8 flex justify-center">
					<StatusButton
						size="sm"
						type="submit"
						name="intent"
						value={profileUpdateActionIntent}
						status={
							fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')
						}
					>
						<Trans>Save changes</Trans>
					</StatusButton>
				</div>
			</FieldGroup>
		</fetcher.Form>
	)
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
	return { status: 'success' } as const
}

function SignOutOfSessions({
	loaderData,
}: {
	loaderData: Route.ComponentProps['loaderData']
}) {
	const dc = useDoubleCheck()

	const fetcher = useFetcher<typeof signOutOfSessionsAction>()
	const otherSessionsCount = loaderData.user._count.sessions - 1
	return (
		<div>
			{otherSessionsCount ? (
				<fetcher.Form method="POST">
					<StatusButton
						{...dc.getButtonProps({
							type: 'submit',
							name: 'intent',
							value: signOutOfSessionsActionIntent,
						})}
						variant={dc.doubleCheck ? 'destructive' : 'default'}
						status={
							fetcher.state !== 'idle'
								? 'pending'
								: (fetcher.data?.status ?? 'idle')
						}
					>
						<Icon name="user">
							{dc.doubleCheck ? (
								<Trans>Are you sure?</Trans>
							) : (
								<Trans>Sign out of {otherSessionsCount} other sessions</Trans>
							)}
						</Icon>
					</StatusButton>
				</fetcher.Form>
			) : (
				<Icon name="user">
					<Trans>This is your only session</Trans>
				</Icon>
			)}
		</div>
	)
}

async function deleteDataAction({ userId }: ProfileActionArgs) {
	await prisma.user.delete({ where: { id: userId } })
	return redirectWithToast('/', {
		type: 'success',
		title: i18n._(t`Data Deleted`),
		description: i18n._(t`All of your data has been deleted`),
	})
}

function DeleteData() {
	const dc = useDoubleCheck()

	const fetcher = useFetcher<typeof deleteDataAction>()
	return (
		<div>
			<fetcher.Form method="POST">
				<StatusButton
					{...dc.getButtonProps({
						type: 'submit',
						name: 'intent',
						value: deleteDataActionIntent,
					})}
					variant={dc.doubleCheck ? 'destructive' : 'default'}
					status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				>
					<Icon name="trash-2">
						{dc.doubleCheck ? (
							<Trans>Are you sure?</Trans>
						) : (
							<Trans>Delete all your data</Trans>
						)}
					</Icon>
				</StatusButton>
			</fetcher.Form>
		</div>
	)
}
