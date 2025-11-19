import type {
  FieldErrorsImpl,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
} from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'

export interface BaseInputFieldProps {
  name: string
  label: string | undefined
  defaultValue?: string | number
  errors: Partial<FieldErrorsImpl>
  register: UseFormRegister<FieldValues>
  required?: boolean
  width?: string | number
  type?: 'text' | 'email' | 'number'
  registerOptions?: RegisterOptions
}

export const BaseInputField: React.FC<BaseInputFieldProps> = ({
  name,
  defaultValue,
  errors,
  label,
  register,
  required,
  width,
  type = 'text',
  registerOptions = {},
}) => {
  return (
    <Width width={width}>
      <Label htmlFor={name}>
        {label}

        {required && (
          <span className="required">
            * <span className="sr-only">(required)</span>
          </span>
        )}
      </Label>
      <Input
        defaultValue={defaultValue}
        id={name}
        type={type}
        {...register(name, { required, ...registerOptions })}
      />
      {errors[name] && <Error name={name} />}
    </Width>
  )
}
