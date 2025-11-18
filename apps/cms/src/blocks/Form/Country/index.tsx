import type { CountryField } from '@payloadcms/plugin-form-builder/types'
import type { Control, FieldErrorsImpl } from 'react-hook-form'

import React from 'react'

import { BaseSelectField } from '../BaseSelectField'
import { countryOptions } from './options'

export const Country: React.FC<
	CountryField & {
		control: Control
		errors: Partial<FieldErrorsImpl>
	}
> = ({ name, control, errors, label, required, width }) => {
	return (
		<BaseSelectField
			name={name}
			control={control}
			errors={errors}
			label={label}
			options={countryOptions}
			required={required}
			width={width}
			defaultValue=""
		/>
	)
}
