import { render } from '@react-email/components'
import { type ReactElement } from 'react'
import { z } from 'zod'
import { logger } from './logger.server.ts'

const resendErrorSchema = z.union([
	z.object({
		name: z.string(),
		message: z.string(),
		statusCode: z.number(),
	}),
	z.object({
		name: z.literal('UnknownError'),
		message: z.literal('Unknown Error'),
		statusCode: z.literal(500),
		cause: z.any(),
	}),
])
type ResendError = z.infer<typeof resendErrorSchema>

const resendSuccessSchema = z.object({
	id: z.string(),
})

export async function sendEmail({
	react,
	...options
}: {
	to: string
	subject: string
} & (
	| { html: string; text: string; react?: never }
	| { react: ReactElement; html?: never; text?: never }
)) {
	const from = 'hello@epicstack.dev'

	const email = {
		from,
		...options,
		...(react ? await renderReactEmail(react) : null),
	}

	// FORCE HTTP REQUEST FOR TESTS - bypass the environment check
	// This ensures MSW can intercept the request
	if (process.env.NODE_ENV === 'test') {
		logger.debug(
			{ to: options.to, subject: options.subject },
			'Test mode: sendEmail called',
		)
	} else {
		// Production check - feel free to remove this condition once you've set up resend
		if (!process.env.RESEND_API_KEY && !process.env.MOCKS) {
			logger.warn(
				{ email },
				'RESEND_API_KEY not set and not in mocks mode. Email not sent.',
			)
			return {
				status: 'success',
				data: { id: 'mocked' },
			} as const
		}
	}

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		body: JSON.stringify(email),
		headers: {
			Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
	})
	const data = await response.json()
	const parsedData = resendSuccessSchema.safeParse(data)

	if (response.ok && parsedData.success) {
		return {
			status: 'success',
			data: parsedData,
		} as const
	} else {
		const parseResult = resendErrorSchema.safeParse(data)
		if (parseResult.success) {
			return {
				status: 'error',
				error: parseResult.data,
			} as const
		} else {
			return {
				status: 'error',
				error: {
					name: 'UnknownError',
					message: 'Unknown Error',
					statusCode: 500,
					cause: data,
				} satisfies ResendError,
			} as const
		}
	}
}

async function renderReactEmail(react: ReactElement) {
	const [html, text] = await Promise.all([
		render(react),
		render(react, { plainText: true }),
	])
	return { html, text }
}
