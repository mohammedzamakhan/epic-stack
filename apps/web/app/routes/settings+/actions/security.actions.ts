import { parseWithZod } from '@conform-to/zod'
import { z } from 'zod'

import { isCodeValid } from '#app/routes/_auth+/verify.server.ts'
import {
	verifyUserPassword,
	getPasswordHash,
	checkIsCommonPassword,
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { PasswordAndConfirmPasswordSchema } from '#app/utils/user-validation.ts'
import { twoFAVerificationType } from '../profile.two-factor'
import { twoFAVerifyVerificationType } from '../profile.two-factor.verify'

export const ChangePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: z.string().min(8, 'Password must be at least 8 characters'),
		confirmNewPassword: z.string().min(1, 'Confirm your new password'),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: 'Passwords do not match',
		path: ['confirmNewPassword'],
	})

export const Enable2FASchema = z.object({
	code: z.string().min(6, { message: 'Code is required' }),
})

type SecurityActionArgs = {
	userId: string
	formData: FormData
	request?: Request
}

export async function changePasswordAction({
	userId,
	formData,
}: SecurityActionArgs) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ChangePasswordSchema.superRefine(
			async ({ currentPassword, newPassword }, ctx) => {
				if (currentPassword && newPassword) {
					const user = await verifyUserPassword({ id: userId }, currentPassword)
					if (!user) {
						ctx.addIssue({
							path: ['currentPassword'],
							code: z.ZodIssueCode.custom,
							message: 'Incorrect password.',
						})
					}
					const isCommonPassword = await checkIsCommonPassword(newPassword)
					if (isCommonPassword) {
						ctx.addIssue({
							path: ['newPassword'],
							code: 'custom',
							message: 'Password is too common',
						})
					}
				}
			},
		),
	})

	if (submission.status !== 'success') {
		return Response.json(
			{
				result: submission.reply({
					hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { newPassword } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				update: {
					hash: await getPasswordHash(newPassword),
				},
			},
		},
	})

	return Response.json({
		status: 'success',
		result: submission.reply(),
	})
}

export async function setPasswordAction({
	userId,
	formData,
}: SecurityActionArgs) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema: PasswordAndConfirmPasswordSchema.superRefine(
			async ({ password }, ctx) => {
				const isCommonPassword = await checkIsCommonPassword(password)
				if (isCommonPassword) {
					ctx.addIssue({
						path: ['password'],
						code: 'custom',
						message: 'Password is too common',
					})
				}
			},
		),
	})

	if (submission.status !== 'success') {
		return Response.json(
			{
				result: submission.reply({
					hideFields: ['password', 'confirmPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { password } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				create: {
					hash: await getPasswordHash(password),
				},
			},
		},
	})

	return Response.json({
		status: 'success',
		result: submission.reply(),
	})
}

export async function enable2FAAction({
	formData,
	userId,
}: SecurityActionArgs) {
	const submission = await parseWithZod(formData, {
		schema: Enable2FASchema.superRefine(async (data, ctx) => {
			const codeIsValid = await isCodeValid({
				code: data.code,
				type: twoFAVerifyVerificationType,
				target: userId,
			})
			if (!codeIsValid) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: `Invalid code`,
				})
				return z.NEVER
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return Response.json(
			{ result: submission.reply(), status: 'error' },
			{ status: 400 },
		)
	}

	await prisma.verification.update({
		where: {
			target_type: { type: twoFAVerifyVerificationType, target: userId },
		},
		data: { type: twoFAVerificationType },
	})

	return Response.json({ status: 'success' })
}

export async function disable2FAAction({ userId }: SecurityActionArgs) {
	await prisma.verification.delete({
		where: {
			target_type: { target: userId, type: twoFAVerificationType },
		},
	})

	return Response.json({ status: 'success' })
}
