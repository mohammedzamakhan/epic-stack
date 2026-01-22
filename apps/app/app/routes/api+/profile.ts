import { parseWithZod } from '@conform-to/zod'
import { prisma } from '@repo/database'
import { NameSchema, UsernameSchema } from '@repo/validation'
import { data } from 'react-router'
import { z } from 'zod'
import { requireAuth } from '#app/utils/jwt.server.ts'
import { type Route } from './+types/profile.ts'

const ProfileFormSchema = z.object({
	name: NameSchema.nullable().default(null),
	username: UsernameSchema,
})

export async function action({ request }: Route.ActionArgs) {
	try {
		const payload = requireAuth(request)
		const userId = payload.sub

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true },
		})

		if (!user) {
			return data(
				{
					success: false,
					error: 'user_not_found',
					message: 'User not found',
				},
				{ status: 404 },
			)
		}

		const formData = await request.formData()
		const intent = formData.get('intent')

		if (intent !== 'update-profile') {
			return data(
				{
					success: false,
					error: 'invalid_intent',
					message: 'Invalid intent',
				},
				{ status: 400 },
			)
		}

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
			return data(
				{
					success: false,
					error: 'validation_error',
					message: 'Validation failed',
					errors: submission.reply(),
				},
				{ status: 400 },
			)
		}

		const { username, name } = submission.value

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { name, username },
			select: {
				id: true,
				email: true,
				username: true,
				name: true,
				createdAt: true,
				updatedAt: true,
				image: { select: { objectKey: true } },
			},
		})

		return data({
			success: true,
			data: {
				user: {
					id: updatedUser.id,
					email: updatedUser.email,
					username: updatedUser.username,
					name: updatedUser.name,
					image: updatedUser.image?.objectKey,
					createdAt: updatedUser.createdAt.toISOString(),
					updatedAt: updatedUser.updatedAt.toISOString(),
				},
			},
		})
	} catch (error) {
		if (error instanceof Error && error.message.includes('authorization')) {
			return data(
				{
					success: false,
					error: 'unauthorized',
					message: 'Authentication required',
				},
				{ status: 401 },
			)
		}

		console.error('Profile API error:', error)
		return data(
			{
				success: false,
				error: 'internal_error',
				message: 'Failed to update profile',
			},
			{ status: 500 },
		)
	}
}

export async function loader() {
	return data(
		{
			success: false,
			error: 'method_not_allowed',
			message: 'Use POST method to update profile',
		},
		{ status: 405 },
	)
}
