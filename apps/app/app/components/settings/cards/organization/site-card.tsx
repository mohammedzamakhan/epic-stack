import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans } from '@lingui/macro'
import { getOrgSiteUrl } from '@repo/common/url'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { FieldGroup } from '@repo/ui/field'
import { Icon } from '@repo/ui/icon'
import { Switch } from '@repo/ui/switch'
import { useState } from 'react'
import { Form, useFetcher } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'

export const SitePublishSchema = z.object({
	sitePublished: z.enum(['true', 'false']),
	organizationId: z.string(),
})

export const CustomDomainSchema = z.object({
	customDomain: z.string().min(1, 'Domain is required'),
	organizationId: z.string(),
})

export const sitePublishActionIntent = 'update-site-publish'
export const addCustomDomainActionIntent = 'add-custom-domain'
export const removeCustomDomainActionIntent = 'remove-custom-domain'
export const refreshCustomDomainActionIntent = 'refresh-custom-domain'

export function SiteCard({
	organization,
	cnameTarget,
	cloudflareConfigured,
	actionData,
}: {
	organization: {
		id: string
		slug: string
		sitePublished: boolean
		customDomain: string | null
		customDomainStatus: string | null
	}
	cnameTarget: string
	cloudflareConfigured: boolean
	actionData?: { result?: unknown }
}) {
	const [isPublished, setIsPublished] = useState(organization.sitePublished)
	const publishFetcher = useFetcher()
	const domainFetcher = useFetcher()
	const DomainForm = domainFetcher.Form
	const siteUrl = getOrgSiteUrl(organization.slug)
	const customDomain = organization.customDomain
	const domainStatus = organization.customDomainStatus

	const [form, fields] = useForm({
		id: 'custom-domain',
		constraint: getZodConstraint(CustomDomainSchema),
		lastResult: actionData?.result as never,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CustomDomainSchema })
		},
		defaultValue: {
			customDomain: customDomain || '',
			organizationId: organization.id,
		},
	})

	const handleSwitchChange = (checked: boolean) => {
		setIsPublished(checked)
		void publishFetcher.submit(
			{
				intent: sitePublishActionIntent,
				organizationId: organization.id,
				sitePublished: checked ? 'true' : 'false',
			},
			{ method: 'POST' },
		)
	}

	const busy = publishFetcher.state !== 'idle' || domainFetcher.state !== 'idle'

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Switch
							checked={isPublished}
							onCheckedChange={handleSwitchChange}
							disabled={busy}
						/>
						<span>
							<Trans>Organization site</Trans>
						</span>
					</CardTitle>
				</div>
				<CardDescription>
					<Trans>
						Publish a public website for your organization. Visitors can reach
						it at your org subdomain, or a custom domain you connect.
					</Trans>
				</CardDescription>
			</CardHeader>

			{isPublished ? (
				<CardContent className="flex flex-col gap-6">
					<div className="bg-muted flex items-start gap-2 rounded-md p-3 text-sm">
						<Icon
							name="link-2"
							className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
						/>
						<div className="min-w-0">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								<Trans>Subdomain URL</Trans>
							</p>
							<a
								href={siteUrl}
								target="_blank"
								rel="noreferrer"
								className="text-primary break-all underline-offset-2 hover:underline"
							>
								{siteUrl}
							</a>
						</div>
					</div>

					<div className="border-border space-y-4 border-t pt-6">
						<div className="space-y-1">
							<p className="text-sm font-medium">
								<Trans>Custom domain</Trans>
							</p>
							<p className="text-muted-foreground text-sm">
								<Trans>
									Point your own domain at Sites with a CNAME record. SSL is
									provisioned automatically when Cloudflare for SaaS is
									configured.
								</Trans>
							</p>
						</div>

						{customDomain ? (
							<div className="space-y-4">
								<div className="bg-muted space-y-2 rounded-md p-3 text-sm">
									<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										<Trans>Connected domain</Trans>
									</p>
									<a
										href={`https://${customDomain}`}
										target="_blank"
										rel="noreferrer"
										className="text-primary block break-all underline-offset-2 hover:underline"
									>
										{customDomain}
									</a>
									<p className="text-muted-foreground text-xs">
										<Trans>Status</Trans>: {domainStatus || 'pending'}
									</p>
								</div>

								<div className="space-y-2 rounded-md border p-3 text-sm">
									<p className="font-medium">
										<Trans>DNS setup</Trans>
									</p>
									<p className="text-muted-foreground text-xs">
										<Trans>
											Add a CNAME record for your domain (or subdomain) pointing
											to:
										</Trans>
									</p>
									<code className="bg-muted block rounded-md px-2.5 py-2 font-mono text-xs break-all">
										{cnameTarget}
									</code>
									{!cloudflareConfigured ? (
										<p className="text-muted-foreground text-xs">
											<Trans>
												Cloudflare is not configured in this environment. Domain
												is stored for local testing; SSL automation requires
												CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.
											</Trans>
										</p>
									) : null}
								</div>

								<div className="flex flex-wrap gap-2">
									<DomainForm method="POST">
										<input
											type="hidden"
											name="intent"
											value={refreshCustomDomainActionIntent}
										/>
										<input
											type="hidden"
											name="organizationId"
											value={organization.id}
										/>
										<Button type="submit" variant="outline" disabled={busy}>
											<Trans>Refresh status</Trans>
										</Button>
									</DomainForm>
									<DomainForm method="POST">
										<input
											type="hidden"
											name="intent"
											value={removeCustomDomainActionIntent}
										/>
										<input
											type="hidden"
											name="organizationId"
											value={organization.id}
										/>
										<Button type="submit" variant="destructive" disabled={busy}>
											<Trans>Remove domain</Trans>
										</Button>
									</DomainForm>
								</div>
							</div>
						) : (
							<Form method="POST" {...getFormProps(form)} className="space-y-4">
								<input
									type="hidden"
									name="intent"
									value={addCustomDomainActionIntent}
								/>
								<input
									{...getInputProps(fields.organizationId, { type: 'hidden' })}
								/>
								<FieldGroup>
									<Field
										labelProps={{
											children: <Trans>Domain</Trans>,
										}}
										inputProps={{
											...getInputProps(fields.customDomain, { type: 'text' }),
											placeholder: 'www.example.com',
										}}
										className="w-full"
										errors={fields.customDomain.errors}
									/>
								</FieldGroup>
								<ErrorList id={form.errorId} errors={form.errors} />
								<div className="flex justify-end">
									<Button type="submit" disabled={busy}>
										<Trans>Connect domain</Trans>
									</Button>
								</div>
							</Form>
						)}
					</div>
				</CardContent>
			) : null}
		</Card>
	)
}
