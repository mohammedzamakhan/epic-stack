import { parseWithZod } from '@conform-to/zod'
import { requireUserId } from '@repo/auth'
import { invalidateUserOrganizationsCache } from '@repo/cache'
import {
	parseSiteThemeConfig,
	serializeSiteThemeConfig,
} from '@repo/common/site-theme'
import { redirectWithToast } from '@repo/common/toast'
import { prisma } from '@repo/database'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useActionData,
} from 'react-router'
import { z } from 'zod'

import {
	SiteCard,
	SitePublishSchema,
	CustomDomainSchema,
	sitePublishActionIntent,
	addCustomDomainActionIntent,
	removeCustomDomainActionIntent,
	refreshCustomDomainActionIntent,
} from '#app/components/settings/cards/organization/site-card.tsx'
import {
	SiteThemeCard,
	SiteThemeSchema,
	siteThemeActionIntent,
} from '#app/components/settings/cards/organization/site-theme-card.tsx'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
} from '#app/utils/organization/permissions.server.ts'
import {
	createCustomHostname,
	deleteCustomHostname,
	getCustomHostname,
	getCustomHostnameCnameTarget,
	isCloudflareCustomHostnamesConfigured,
	isValidCustomDomain,
	normalizeCustomDomain,
} from '#app/utils/sites/cloudflare-custom-hostnames.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)

	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
		sitePublished: true,
		customDomain: true,
		customDomainStatus: true,
		cloudflareHostnameId: true,
		siteTheme: true,
	})

	return {
		organization,
		themeConfig: parseSiteThemeConfig(organization.siteTheme),
		cnameTarget: getCustomHostnameCnameTarget(),
		cloudflareConfigured: isCloudflareCustomHostnamesConfigured(),
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
		customDomain: true,
		customDomainStatus: true,
		cloudflareHostnameId: true,
	})

	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.UPDATE_SETTINGS_ANY,
	)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === sitePublishActionIntent) {
		const submission = parseWithZod(formData, {
			schema: SitePublishSchema,
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const { sitePublished } = submission.value
		const published = sitePublished === 'true'

		try {
			await prisma.organization.update({
				where: { id: organization.id },
				data: { sitePublished: published },
			})

			await invalidateUserOrganizationsCache(userId)

			return Response.json({
				status: 'success',
				sitePublished: published,
			})
		} catch {
			return Response.json(
				{ error: 'Failed to update site publish settings' },
				{ status: 500 },
			)
		}
	}

	if (intent === addCustomDomainActionIntent) {
		const submission = parseWithZod(formData, {
			schema: CustomDomainSchema.superRefine((data, ctx) => {
				const normalized = normalizeCustomDomain(data.customDomain)
				if (!isValidCustomDomain(normalized)) {
					ctx.addIssue({
						path: ['customDomain'],
						code: z.ZodIssueCode.custom,
						message: 'Enter a valid domain like www.example.com',
					})
				}
			}),
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const customDomain = normalizeCustomDomain(submission.value.customDomain)

		const existing = await prisma.organization.findFirst({
			where: {
				customDomain,
				NOT: { id: organization.id },
			},
			select: { id: true },
		})
		if (existing) {
			return Response.json({
				result: submission.reply({
					fieldErrors: {
						customDomain: [
							'This domain is already connected to another organization.',
						],
					},
				}),
			})
		}

		try {
			const hostname = await createCustomHostname(customDomain)
			await prisma.organization.update({
				where: { id: organization.id },
				data: {
					customDomain,
					customDomainStatus: hostname.status,
					cloudflareHostnameId: hostname.id,
					sitePublished: true,
				},
			})

			await invalidateUserOrganizationsCache(userId)

			return redirectWithToast(`/${organization.slug}/website`, {
				title: 'Custom domain added',
				description: `Point ${customDomain} to ${getCustomHostnameCnameTarget()} via CNAME.`,
				type: 'success',
			})
		} catch (error) {
			return Response.json({
				result: submission.reply({
					formErrors: [
						error instanceof Error
							? error.message
							: 'Failed to connect custom domain. Please try again.',
					],
				}),
			})
		}
	}

	if (intent === removeCustomDomainActionIntent) {
		try {
			if (organization.cloudflareHostnameId) {
				await deleteCustomHostname(organization.cloudflareHostnameId)
			}
			await prisma.organization.update({
				where: { id: organization.id },
				data: {
					customDomain: null,
					customDomainStatus: null,
					cloudflareHostnameId: null,
				},
			})
			await invalidateUserOrganizationsCache(userId)
			return redirectWithToast(`/${organization.slug}/website`, {
				title: 'Custom domain removed',
				description: 'Your custom domain has been disconnected.',
				type: 'success',
			})
		} catch {
			return Response.json(
				{ error: 'Failed to remove custom domain' },
				{ status: 500 },
			)
		}
	}

	if (intent === refreshCustomDomainActionIntent) {
		try {
			if (!organization.cloudflareHostnameId || !organization.customDomain) {
				return Response.json(
					{ error: 'No custom domain configured' },
					{ status: 400 },
				)
			}

			const hostname = await getCustomHostname(
				organization.cloudflareHostnameId,
			)
			const status =
				hostname?.status || organization.customDomainStatus || 'pending'

			await prisma.organization.update({
				where: { id: organization.id },
				data: { customDomainStatus: status },
			})
			await invalidateUserOrganizationsCache(userId)

			return redirectWithToast(`/${organization.slug}/website`, {
				title: 'Domain status updated',
				description: `Status is now “${status}”.`,
				type: 'success',
			})
		} catch {
			return Response.json(
				{ error: 'Failed to refresh custom domain status' },
				{ status: 500 },
			)
		}
	}

	if (intent === siteThemeActionIntent) {
		const submission = parseWithZod(formData, {
			schema: SiteThemeSchema,
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const { baseColor, theme, radius, mode } = submission.value

		try {
			await prisma.organization.update({
				where: { id: organization.id },
				data: {
					siteTheme: serializeSiteThemeConfig({
						baseColor,
						theme,
						radius,
						mode,
					}),
				},
			})

			await invalidateUserOrganizationsCache(userId)

			return redirectWithToast(`/${organization.slug}/website`, {
				title: 'Branding updated',
				description: 'Your website look has been saved.',
				type: 'success',
			})
		} catch {
			return Response.json({
				result: submission.reply({
					formErrors: ['Failed to update theme. Please try again.'],
				}),
			})
		}
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function WebsiteGeneralSettings() {
	const { organization, themeConfig, cnameTarget, cloudflareConfigured } =
		useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<AnnotatedLayout>
			<AnnotatedSection>
				<SiteCard
					organization={organization}
					cnameTarget={cnameTarget}
					cloudflareConfigured={cloudflareConfigured}
					actionData={actionData}
				/>
			</AnnotatedSection>

			<AnnotatedSection>
				<SiteThemeCard
					organization={organization}
					themeConfig={themeConfig}
					actionData={actionData}
				/>
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
