import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Form, useSearchParams } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList, OTPField } from '#app/components/forms.tsx'

import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { type Route } from './+types/verify.ts'
import { validateRequest } from './verify.server.ts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusButton,
} from '@repo/ui'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export const codeQueryParam = 'code'
export const targetQueryParam = 'target'
export const typeQueryParam = 'type'
export const redirectToQueryParam = 'redirectTo'
const types = ['onboarding', 'reset-password', 'change-email', '2fa'] as const
const VerificationTypeSchema = z.enum(types)
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>

export const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
})

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	await checkHoneypot(formData)
	return validateRequest(request, formData)
}

export default function VerifyRoute({ actionData }: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const isPending = useIsPending()
	const parseWithZoddType = VerificationTypeSchema.safeParse(
		searchParams.get(typeQueryParam),
	)
	const type = parseWithZoddType.success ? parseWithZoddType.data : null

	const checkEmail = {
		title: 'Check your email',
		description: "We've sent you a code to verify your email address.",
	}

	const headings: Record<
		VerificationTypes,
		{ title: string; description: string }
	> = {
		onboarding: checkEmail,
		'reset-password': checkEmail,
		'change-email': checkEmail,
		'2fa': {
			title: 'Check your 2FA app',
			description: 'Please enter your 2FA code to verify your identity.',
		},
	}

	const [form, fields] = useForm({
		id: 'verify-form',
		constraint: getZodConstraint(VerifySchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VerifySchema })
		},
		defaultValue: {
			code: searchParams.get(codeQueryParam),
			type: type,
			target: searchParams.get(targetQueryParam),
			redirectTo: searchParams.get(redirectToQueryParam),
		},
	})

	const currentHeading = type
		? headings[type]
		: {
				title: 'Invalid Verification Type',
				description: 'Please check your verification link.',
			}

	return (
		<Card className="bg-muted/80 border-0 shadow-2xl">
			<CardHeader>
				<CardTitle className="text-xl">{currentHeading.title}</CardTitle>
				<CardDescription>{currentHeading.description}</CardDescription>
			</CardHeader>
			<CardContent>
				<Form method="POST" {...getFormProps(form)}>
					<HoneypotInputs />
					<div className="grid gap-6">
						<div className="flex items-center justify-center">
							<OTPField
								labelProps={{
									htmlFor: fields[codeQueryParam].id,
									children: 'Verification Code',
								}}
								inputProps={{
									...getInputProps(fields[codeQueryParam], { type: 'text' }),
									autoComplete: 'one-time-code',
									autoFocus: true,
								}}
								errors={fields[codeQueryParam].errors}
							/>
						</div>

						<input
							{...getInputProps(fields[typeQueryParam], { type: 'hidden' })}
						/>
						<input
							{...getInputProps(fields[targetQueryParam], { type: 'hidden' })}
						/>
						<input
							{...getInputProps(fields[redirectToQueryParam], {
								type: 'hidden',
							})}
						/>

						<ErrorList errors={form.errors} id={form.errorId} />

						<StatusButton
							className="w-full"
							status={isPending ? 'pending' : (form.status ?? 'idle')}
							type="submit"
							disabled={isPending}
						>
							Verify
						</StatusButton>
					</div>
				</Form>
			</CardContent>
		</Card>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
