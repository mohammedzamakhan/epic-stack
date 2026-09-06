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
import { Form, useNavigation } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'

export const siteAnalyticsActionIntent = 'update-site-analytics'

// Schema used by the form — keeps googleAnalyticsId as string for conform compatibility.
// The action handler normalises the empty string to null before saving.
export const SiteAnalyticsSchema = z.object({
	organizationId: z.string(),
	googleAnalyticsId: z
		.string()
		.trim()
		.refine(
			(val) => val === '' || /^G-[A-Z0-9]+$/.test(val),
			'Enter a valid Measurement ID like G-XXXXXXXXXX, or leave blank to disable.',
		),
})

export function SiteAnalyticsCard({
	organization,
	actionData,
}: {
	organization: {
		id: string
		googleAnalyticsId?: string | null
	}
	actionData?: { result?: unknown }
}) {
	const navigation = useNavigation()
	const isSubmitting = navigation.state !== 'idle'

	const [form, fields] = useForm({
		id: 'site-analytics-form',
		constraint: getZodConstraint(SiteAnalyticsSchema),
		lastResult: actionData?.result as never,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SiteAnalyticsSchema })
		},
		defaultValue: {
			organizationId: organization.id,
			googleAnalyticsId: organization.googleAnalyticsId ?? '',
		},
	})

	return (
		<Form method="post" {...getFormProps(form)}>
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Google Analytics</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Add a Google Analytics 4 Measurement ID to track visitors on your
							tenant website. Leave blank to disable tracking.
						</Trans>
					</CardDescription>
				</CardHeader>
				<input type="hidden" name="intent" value={siteAnalyticsActionIntent} />
				<input type="hidden" name="organizationId" value={organization.id} />
				<CardContent className="space-y-4">
					<Field
						labelProps={{ children: <Trans>Measurement ID</Trans> }}
						inputProps={{
							...getInputProps(fields.googleAnalyticsId, { type: 'text' }),
							placeholder: 'G-XXXXXXXXXX',
							autoComplete: 'off',
						}}
						errors={fields.googleAnalyticsId.errors}
					/>
					<ErrorList errors={form.errors} id={form.errorId} />
				</CardContent>
				<CardFooter className="justify-end border-t">
					<Button type="submit" disabled={isSubmitting}>
						<Trans>Save changes</Trans>
					</Button>
				</CardFooter>
			</Card>
		</Form>
	)
}
