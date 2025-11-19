import { PasswordAndConfirmPasswordSchema } from '@repo/validation'
import { z } from 'zod'

import { isCodeValid } from '#app/routes/_auth+/verify.server.ts'
import {
	verifyUserPassword,
	getPasswordHash,
	checkIsCommonPassword,
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { twoFAVerificationType } from '../profile.two-factor'
import { twoFAVerifyVerificationType } from '../profile.two-factor.verify'
import {
	createSuccessResponse,
	validateAndReturnError,
} from './_action-helpers.server.ts'

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
	const result = await validateAndReturnError(
		formData,
		ChangePasswordSchema.superRefine(
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
		{
			hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
		},
	)

	if (!result.success) {
		return result.response
	}

	const { newPassword } = result.value

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

	return createSuccessResponse(result.submission)
}

export async function setPasswordAction({
	userId,
	formData,
}: SecurityActionArgs) {
	const result = await validateAndReturnError(
		formData,
		PasswordAndConfirmPasswordSchema.superRefine(
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
		{
			hideFields: ['password', 'confirmPassword'],
		},
	)

	if (!result.success) {
		return result.response
	}

	const { password } = result.value

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

	return createSuccessResponse(result.submission)
}

export async function enable2FAAction({
	formData,
	userId,
}: SecurityActionArgs) {
	const result = await validateAndReturnError(
		formData,
		Enable2FASchema.superRefine(async (data, ctx) => {
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
	)

	if (!result.success) {
		return result.response
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
