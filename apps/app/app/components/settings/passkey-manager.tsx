import { Trans } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { startRegistration } from '@simplewebauthn/browser'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { Form, useRevalidator } from 'react-router'
import { z } from 'zod'

// Registration options schema for passkeys (exported for reuse)
export const RegistrationOptionsSchema = z.object({
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

export function PasskeyManager({
	data,
	deleteIntent = 'delete',
}: {
	data: PasskeyData
	deleteIntent?: string
}) {
	const [error, setError] = useState<string | null>(null)
	const revalidator = useRevalidator()

	async function handlePasskeyRegistration() {
		try {
			setError(null)
			const resp = await fetch('/webauthn/registration', {
				credentials: 'include',
			})

			if (!resp.ok) {
				const text = await resp.text()
				console.error('GET /webauthn/registration failed:', resp.status, text)
				throw new Error(`Server error: ${text}`)
			}

			const jsonResult = await resp.json()
			const parsedResult = RegistrationOptionsSchema.parse(jsonResult)

			const regResult = await startRegistration({
				optionsJSON: parsedResult.options,
			})

			const verificationResp = await fetch('/webauthn/registration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(regResult),
			})

			if (!verificationResp.ok) {
				const text = await verificationResp.text()
				console.error(
					'POST /webauthn/registration failed:',
					verificationResp.status,
					text,
				)
				let errorMsg = 'Failed to verify registration'
				try {
					const errorData = JSON.parse(text) as { error?: string }
					errorMsg = errorData.error || errorMsg
				} catch {
					errorMsg = text || errorMsg
				}
				throw new Error(errorMsg)
			}

			void revalidator.revalidate()
		} catch (err) {
			console.error('Failed to create passkey:', err)
			if (err instanceof Error && err.name === 'NotAllowedError') {
				setError('Passkey registration was cancelled.')
			} else if (err instanceof Error && err.name === 'AbortError') {
				setError('Passkey registration was cancelled.')
			} else if (err instanceof Error) {
				setError(err.message || 'Failed to create passkey. Please try again.')
			} else {
				setError('Failed to create passkey. Please try again.')
			}
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
										Registered{' '}
										{formatDistanceToNow(new Date(passkey.createdAt))} ago
									</Trans>
								</div>
							</div>
							<Form method="POST">
								<input type="hidden" name="passkeyId" value={passkey.id} />
								<Button
									type="submit"
									name="intent"
									value={deleteIntent}
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
