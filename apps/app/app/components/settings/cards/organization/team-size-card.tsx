import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Field, FieldLabel, FieldError } from '@repo/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import { Form } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'

export const TeamSizeSchema = z.object({
	size: z.string().min(1, 'Team size is required'),
	organizationId: z.string(),
})

const teamSizeOptions = [
	{ value: '1-10', label: '1-10 people' },
	{ value: '11-50', label: '11-50 people' },
	{ value: '51-200', label: '51-200 people' },
	{ value: '201-500', label: '201-500 people' },
	{ value: '500+', label: '500+ people' },
]

export default function TeamSizeCard({
	organization,
	actionData,
}: {
	organization: { id: string; size?: string | null }
	actionData?: any
}) {
	const [form, fields] = useForm({
		id: 'team-size-form',
		constraint: getZodConstraint(TeamSizeSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: TeamSizeSchema })
		},
		defaultValue: {
			size: organization.size || '',
			organizationId: organization.id,
		},
	})

	return (
		<Form method="POST" {...getFormProps(form)}>
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Team Size</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Help us understand your organization size to provide better
							recommendations.
						</Trans>
					</CardDescription>
				</CardHeader>
				<input type="hidden" name="intent" value="update-team-size" />
				<input {...getInputProps(fields.organizationId, { type: 'hidden' })} />
				<CardContent>
					<Field data-invalid={fields.size.errors?.length ? true : undefined}>
						<FieldLabel htmlFor={fields.size.id}>
							<Trans>Organization Size</Trans>
						</FieldLabel>
						<Select
							name={fields.size.name}
							defaultValue={organization.size || ''}
						>
							<SelectTrigger>Select team size</SelectTrigger>
							<SelectContent>
								{teamSizeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldError
							errors={convertErrorsToFieldFormat(fields.size.errors)}
						/>
					</Field>
					<ErrorList errors={form.errors} id={form.errorId} />
				</CardContent>
				<CardFooter className="justify-end">
					<Button size="sm" type="submit">
						<Trans>Update</Trans>
					</Button>
				</CardFooter>
			</Card>
		</Form>
	)
}
