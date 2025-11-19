import type { Submission } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import type { z } from 'zod'

/**
 * Creates a JSON response for a submission that has validation errors
 */
export function createValidationErrorResponse(
	submission: Submission,
	options?: {
		hideFields?: string[]
	},
) {
	return Response.json(
		{
			result: submission.reply(options),
		},
		{ status: submission.status === 'error' ? 400 : 200 },
	)
}

/**
 * Creates a JSON response for a successful submission
 */
export function createSuccessResponse(
	submission: Submission,
	additionalData?: Record<string, unknown>,
) {
	return Response.json({
		status: 'success',
		result: submission.reply(),
		...additionalData,
	})
}

/**
 * Helper to parse form data with Zod schema
 * Returns both the submission and a boolean indicating success
 */
export async function parseFormData<Schema extends z.ZodTypeAny>(
	formData: FormData,
	schema: Schema,
) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema,
	})

	return {
		submission,
		isSuccess: submission.status === 'success',
	}
}

/**
 * Combined helper that parses form data and returns appropriate response if there are errors
 * Returns null if validation succeeded (allowing action to continue)
 * Returns Response if validation failed (action should return immediately)
 */
export async function validateAndReturnError<Schema extends z.ZodTypeAny>(
	formData: FormData,
	schema: Schema,
	options?: {
		hideFields?: string[]
	},
): Promise<
	| { success: false; response: Response; submission: Submission }
	| { success: true; submission: Submission; value: z.infer<Schema> }
> {
	const submission = await parseWithZod(formData, {
		async: true,
		schema,
	})

	if (submission.status !== 'success') {
		return {
			success: false,
			response: createValidationErrorResponse(submission, options),
			submission,
		}
	}

	return {
		success: true,
		submission,
		value: submission.value,
	}
}
