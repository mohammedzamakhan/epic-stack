import { startRegistration } from '@simplewebauthn/browser'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { Form, useRevalidator } from 'react-router'
import { z } from 'zod'
import { Trans } from '@lingui/macro'

import { deletePasskeyActionIntent } from '#app/routes/_app+/security.tsx'
import { Button, Icon } from '@repo/ui'

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

interface PasskeyData {
	passkeys: Array<{
		id: string
		deviceType: string | null
		createdAt: Date
	}>
}

export function PasskeyManager({ data }: { data: PasskeyData }) {
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
					<Icon name="plus" />
					<Trans>Register new passkey</Trans>
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
									<Icon name="lock" />
									<span className="font-semibold">
										{passkey.deviceType === 'platform' ? (
											<Trans>Device</Trans>
										) : (
											<Trans>Security Key</Trans>
										)}
									</span>
								</div>
								<div className="text-muted-foreground text-sm">
									<Trans>
										Registered {formatDistanceToNow(new Date(passkey.createdAt))}{' '}
										ago
									</Trans>
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
									<Icon name="trash-2" />
									<span>
										<Trans>Delete</Trans>
									</span>
								</Button>
							</Form>
						</li>
					))}
				</ul>
			) : (
				<div className="text-muted-foreground text-center">
					<Trans>No passkeys registered yet</Trans>
				</div>
			)}
		</div>
	)
}
