import { msg } from '@lingui/macro'
import { type useLingui } from '@lingui/react'
import { z } from 'zod'

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20

type Translator = ReturnType<typeof useLingui>['_']

export function createUsernameSchema(_: Translator) {
	return z
		.string({ required_error: _(msg`Username is required`) })
		.min(USERNAME_MIN_LENGTH, { message: _(msg`Username is too short`) })
		.max(USERNAME_MAX_LENGTH, { message: _(msg`Username is too long`) })
		.regex(/^[a-zA-Z0-9_]+$/, {
			message: _(
				msg`Username can only include letters, numbers, and underscores`,
			),
		})
		.transform((value) => value.toLowerCase())
}

export function createPasswordSchema(_: Translator) {
	return z
		.string({ required_error: _(msg`Password is required`) })
		.min(6, { message: _(msg`Password is too short`) })
		.refine((val) => new TextEncoder().encode(val).length <= 72, {
			message: _(msg`Password is too long`),
		})
}

export function createNameSchema(_: Translator) {
	return z
		.string({ required_error: _(msg`Name is required`) })
		.min(3, { message: _(msg`Name is too short`) })
		.max(40, { message: _(msg`Name is too long`) })
}

export function createEmailSchema(_: Translator) {
	return z
		.string({ required_error: _(msg`Email is required`) })
		.email({ message: _(msg`Email is invalid`) })
		.min(3, { message: _(msg`Email is too short`) })
		.max(100, { message: _(msg`Email is too long`) })
		.transform((value) => value.toLowerCase())
}

export function createPasswordAndConfirmPasswordSchema(_: Translator) {
	const PasswordSchema = createPasswordSchema(_)
	return z
		.object({ password: PasswordSchema, confirmPassword: PasswordSchema })
		.superRefine(({ confirmPassword, password }, ctx) => {
			if (confirmPassword !== password) {
				ctx.addIssue({
					path: ['confirmPassword'],
					code: 'custom',
					message: _(msg`The passwords must match`),
				})
			}
		})
}
