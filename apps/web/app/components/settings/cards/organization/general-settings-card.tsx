import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { Field, ErrorList } from '#app/components/forms'
import { Card, CardContent, CardFooter } from '#app/components/ui/card'
import { StatusButton } from '#app/components/ui/status-button'
import { OrganizationPhoto } from './organization-photo-card'

const SettingsSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	slug: z.string().min(1, 'Slug is required'),
})

export const organizationUpdateActionIntent = 'update-settings'

interface Organization {
	id: string
	name: string
	slug: string
	image?: { objectKey: string; id: string } | null
}

export function GeneralSettingsCard({
	organization,
}: {
	organization: Organization
}) {
	const fetcher = useFetcher()

	const [form, fields] = useForm({
		id: 'organization-settings-form',
		constraint: getZodConstraint(SettingsSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SettingsSchema })
		},
		defaultValue: {
			name: organization.name,
			slug: organization.slug,
		},
	})

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="mb-6 flex flex-col gap-6 md:flex-row">
					<div className="w-32 flex-shrink-0">
						<OrganizationPhoto organization={organization} size="small" />
					</div>
					<div className="flex-grow">
						<fetcher.Form method="POST" {...getFormProps(form)}>
							<input
								type="hidden"
								name="intent"
								value={organizationUpdateActionIntent}
							/>
							<div className="flex flex-col">
								<Field
									labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
									inputProps={getInputProps(fields.name, { type: 'text' })}
									errors={fields.name.errors}
								/>
								<Field
									labelProps={{ htmlFor: fields.slug.id, children: 'Slug' }}
									inputProps={getInputProps(fields.slug, { type: 'text' })}
									errors={fields.slug.errors}
								/>
							</div>
							<ErrorList id={form.errorId} errors={form.errors} />
						</fetcher.Form>
					</div>
				</div>
			</CardContent>
			<CardFooter className="border-muted justify-end border-t pt-4">
				<StatusButton
					form={form.id}
					type="submit"
					variant="outline"
					name="intent"
					value={organizationUpdateActionIntent}
					status={
						fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')
					}
				>
					Save changes
				</StatusButton>
			</CardFooter>
		</Card>
	)
}
