import { z } from 'zod'
import { prisma } from '#app/utils/db.server.ts'
import { uploadProfileImage } from '#app/utils/storage.server.ts'
import { validateAndReturnError } from './_action-helpers.server.ts'

// Photo upload schema
export const DeleteImageSchema = z.object({
	intent: z.literal('delete-photo'),
})

const MAX_SIZE = 1024 * 1024 * 3 // 3MB

export const NewImageSchema = z.object({
	intent: z.literal('upload-photo'),
	photoFile: z
		.instanceof(File)
		.refine((file) => file.size > 0, 'Image is required')
		.refine(
			(file) => file.size <= MAX_SIZE,
			'Image size must be less than 3MB',
		),
})

export const PhotoFormSchema = z.discriminatedUnion('intent', [
	DeleteImageSchema,
	NewImageSchema,
])

type PhotoActionArgs = {
	request: Request
	formData: FormData
	userId: string
}

export async function photoAction({ formData, userId }: PhotoActionArgs) {
	const result = await validateAndReturnError(
		formData,
		PhotoFormSchema.transform(async (data) => {
			if (data.intent === 'delete-photo') return { intent: 'delete-photo' }
			if (data.photoFile.size <= 0) return z.NEVER
			return {
				intent: data.intent,
				image: { objectKey: await uploadProfileImage(userId, data.photoFile) },
			}
		}),
	)

	if (!result.success) {
		return result.response
	}

	const { image, intent } = result.value as {
		intent: string
		image?: { objectKey: string }
	}

	if (intent === 'delete-photo') {
		await prisma.userImage.deleteMany({ where: { userId } })
		return Response.json({ status: 'success' })
	}

	await prisma.$transaction(async ($prisma) => {
		await $prisma.userImage.deleteMany({ where: { userId } })
		await $prisma.user.update({
			where: { id: userId },
			data: { image: { create: image! } },
		})
	})

	return Response.json({ status: 'success' })
}
