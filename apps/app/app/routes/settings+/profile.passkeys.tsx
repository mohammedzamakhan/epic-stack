import { i18n } from '@lingui/core'
import { Trans, t } from '@lingui/macro'

import { prisma } from '@repo/database'
import { Icon } from '@repo/ui/icon'
import { PasskeyManager } from '#app/components/settings/passkey-manager.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { type Route } from './+types/profile.passkeys.ts'

export const handle = {
	breadcrumb: (
		<Icon name="passkey">
			<Trans>Passkeys</Trans>
		</Icon>
	),
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const passkeys = await prisma.passkey.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			deviceType: true,
			createdAt: true,
		},
	})
	return { passkeys }
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'delete') {
		const passkeyId = formData.get('passkeyId')
		if (typeof passkeyId !== 'string') {
			return Response.json(
				{ status: 'error', error: i18n._(t`Invalid passkey ID`) },
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

	return Response.json(
		{ status: 'error', error: i18n._(t`Invalid intent`) },
		{ status: 400 },
	)
}

export default function Passkeys({ loaderData }: Route.ComponentProps) {
	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-h1">
				<Trans>Passkeys</Trans>
			</h1>
			<PasskeyManager data={{ passkeys: loaderData.passkeys }} />
		</div>
	)
}
