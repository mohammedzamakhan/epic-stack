import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms'

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
		<Card>
			<CardHeader>
				<CardTitle>Team Size</CardTitle>
				<CardDescription>
					Help us understand your organization size to provide better
					recommendations.
				</CardDescription>
			</CardHeader>
			<Form method="POST" {...getFormProps(form)}>
				<input type="hidden" name="intent" value="update-team-size" />
				<input {...getInputProps(fields.organizationId, { type: 'hidden' })} />
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={fields.size.id} className="mb-2 block">
							Organization Size
						</Label>
						<Select
							name={fields.size.name}
							defaultValue={organization.size || ''}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select team size" />
							</SelectTrigger>
							<SelectContent>
								{teamSizeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<ErrorList errors={fields.size.errors} />
					</div>
					<ErrorList errors={form.errors} id={form.errorId} />
				</CardContent>
				<CardFooter className="justify-end">
					<Button size="sm" type="submit">
						Update
					</Button>
				</CardFooter>
			</Form>
		</Card>
	)
}
