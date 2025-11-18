import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	FieldGroup,
	Switch,
} from '@repo/ui'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { InfoIcon } from 'lucide-react'
import { useState } from 'react'
import { Form, useFetcher } from 'react-router'
import { z } from 'zod'
import { Trans } from '@lingui/macro'
import { ErrorList, Field } from '#app/components/forms.tsx'

export const VerifiedDomainSchema = z.object({
	verifiedDomain: z.string().min(1, 'Domain is required'),
	organizationId: z.string(),
})

export default function VerifiedDomainCard({
	organization,
	actionData,
}: {
	organization: { id: string; verifiedDomain?: string | null }
	actionData?: any
}) {
	const [isChecked, setIsChecked] = useState(!!organization.verifiedDomain)

	const [form, fields] = useForm({
		id: 'verified-domain',
		constraint: getZodConstraint(VerifiedDomainSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, {
				schema: VerifiedDomainSchema,
			})
		},
		defaultValue: {
			verifiedDomain: organization.verifiedDomain || '',
			organizationId: organization.id,
		},
	})

	const toggleFetcher = useFetcher()

	const handleSwitchChange = (checked: boolean) => {
		setIsChecked(checked)
		form.reset()
		if (!checked) {
			void toggleFetcher.submit(
				{ intent: 'toggle-verified-domain', organizationId: organization.id },
				{ method: 'POST' },
			)
		}
	}

	return (
		<Card className="w-full gap-0">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg font-medium">
						<Switch checked={isChecked} onCheckedChange={handleSwitchChange} />
						<Trans>Verified domain</Trans>
					</CardTitle>
				</div>
				<CardDescription className="text-muted-foreground text-sm">
					<Trans>
						When someone signs up using an email that matches your verified
						domain, they will be automatically added to your organization as a
						member.
					</Trans>
				</CardDescription>
			</CardHeader>
			<div
				className={`-mt-2 overflow-hidden transition-all duration-300 ${
					isChecked ? 'max-h-50' : 'max-h-0'
				}`}
			>
				<Form method="POST" {...getFormProps(form)}>
					<input type="hidden" name="intent" value="verified-domain" />
					<input
						{...getInputProps(fields.organizationId, { type: 'hidden' })}
					/>
					<CardContent>
						<FieldGroup>
							<Field
								labelProps={{ children: <Trans>Verified domain</Trans> }}
								inputProps={{
									...getInputProps(fields.verifiedDomain, { type: 'text' }),
									placeholder: 'example.com',
								}}
								className="w-full pt-2"
								errors={fields.verifiedDomain.errors}
							/>
						</FieldGroup>
						<ErrorList id={form.errorId} errors={form.errors} />
					</CardContent>
					<CardFooter className="flex justify-between gap-4">
						<div className="text-primary flex items-center text-xs">
							<InfoIcon className="mt-0.5 mr-1 h-4 w-4 flex-shrink-0" />
							<p className="text-muted-foreground">
								<Trans>
									Verified domain must match your current email address domain for
									security.{' '}
									<a href="#" className="underline">
										Learn more
									</a>
								</Trans>
							</p>
						</div>
						<Button type="submit">
							<Trans>Save</Trans>
						</Button>
					</CardFooter>
				</Form>
			</div>
		</Card>
	)
}
