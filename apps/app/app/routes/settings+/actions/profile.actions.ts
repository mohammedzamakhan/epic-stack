import { NameSchema, UsernameSchema } from '@repo/validation'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
import {
	createSuccessResponse,
	validateAndReturnError,
} from './_action-helpers.server.ts'

export const ProfileFormSchema = z.object({
	name: NameSchema.nullable().default(null),
	username: UsernameSchema,
})

type ProfileActionArgs = {
	userId: string
	formData: FormData
}

export async function profileUpdateAction({
	userId,
	formData,
}: ProfileActionArgs) {
	const result = await validateAndReturnError(
		formData,
		ProfileFormSchema.superRefine(async ({ username }, ctx) => {
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
	)

	if (!result.success) {
		return result.response
	}

	const { username, name } = result.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			name: name,
			username: username,
		},
	})

	return createSuccessResponse(result.submission)
}
