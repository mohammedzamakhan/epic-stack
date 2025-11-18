import type { SelectField } from '@payloadcms/plugin-form-builder/types'
import type { Control, FieldErrorsImpl } from 'react-hook-form'

import React from 'react'

import { BaseSelectField } from '../BaseSelectField'

export const Select: React.FC<
	SelectField & {
		control: Control
		errors: Partial<FieldErrorsImpl>
	}
> = ({ name, control, errors, label, options, required, width, defaultValue }) => {
	return (
		<BaseSelectField
			name={name}
			control={control}
			errors={errors}
			label={label}
			options={options}
			required={required}
			width={width}
			defaultValue={defaultValue}
		/>
	)
}
