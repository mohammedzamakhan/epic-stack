import type { StateField } from '@payloadcms/plugin-form-builder/types'
import type { Control, FieldErrorsImpl } from 'react-hook-form'

import React from 'react'

import { BaseSelectField } from '../BaseSelectField'
import { stateOptions } from './options'

export const State: React.FC<
	StateField & {
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
			options={stateOptions}
			required={required}
			width={width}
			defaultValue=""
		/>
	)
}
