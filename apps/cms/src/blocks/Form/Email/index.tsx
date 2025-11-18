import type { EmailField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import React from 'react'

import { BaseInputField } from '../BaseInputField'

export const Email: React.FC<
	EmailField & {
		errors: Partial<FieldErrorsImpl>
		register: UseFormRegister<FieldValues>
	}
> = ({ name, defaultValue, errors, label, register, required, width }) => {
	return (
		<BaseInputField
			name={name}
			defaultValue={defaultValue}
			errors={errors}
			label={label}
			register={register}
			required={required}
			width={width}
			type="email"
			registerOptions={{ pattern: /^\S[^\s@]*@\S+$/ }}
		/>
	)
}
