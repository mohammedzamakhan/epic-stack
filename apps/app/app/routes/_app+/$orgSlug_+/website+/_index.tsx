import { parseWithZod } from '@conform-to/zod'
import { parseFormData } from '@mjackson/form-data-parser'
import { requireUserId } from '@repo/auth'
import { invalidateUserOrganizationsCache } from '@repo/cache'
import {
	parseSiteLocalesConfig,
	serializeSiteLocales,
	type SiteContentLocale,
} from '@repo/common/site-locales'
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
	SiteIconCard,
	uploadSiteIconActionIntent,
	deleteSiteIconActionIntent,
} from '#app/components/settings/cards/organization/site-icon-card.tsx'
import {
	SiteLocalesCard,
	SiteLocalesSchema,
	siteLocalesActionIntent,
} from '#app/components/settings/cards/organization/site-locales-card.tsx'
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
import { uploadSiteIcon } from '#app/utils/storage.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)

	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		name: true,
		slug: true,
		sitePublished: true,
		customDomain: true,
		customDomainStatus: true,
		cloudflareHostnameId: true,
		siteTheme: true,
		siteLocales: true,
		siteDefaultLocale: true,
		siteIconKey: true,
		siteIconAssets: {
			select: { type: true, status: true },
		},
	})

	return {
		organization,
		themeConfig: parseSiteThemeConfig(organization.siteTheme),
		localesConfig: parseSiteLocalesConfig(
			organization.siteLocales,
			organization.siteDefaultLocale,
		),
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
		siteIconKey: true,
	})

	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.UPDATE_SETTINGS_ANY,
	)

	const contentType = request.headers.get('content-type')

	if (contentType?.includes('multipart/form-data')) {
		const formData = await parseFormData(request, {
			maxFileSize: 1024 * 1024 * 5, // 5MB
		})
		const intent = formData.get('intent')

		if (intent === uploadSiteIconActionIntent) {
			const iconFile = formData.get('iconFile') as File | null

			if (!iconFile || !(iconFile instanceof File) || iconFile.size <= 0) {
				return Response.json({ error: 'No file provided' }, { status: 400 })
			}

			try {
				const siteIconKey = await uploadSiteIcon(organization.id, iconFile)

				await prisma.organization.update({
					where: { id: organization.id },
					data: { siteIconKey },
				})

				await invalidateUserOrganizationsCache(userId)

				return Response.json({ status: 'success' })
			} catch (error) {
				return Response.json(
					{
						error:
							error instanceof Error
								? error.message
								: 'Failed to upload site icon',
					},
					{ status: 500 },
				)
			}
		}

		return Response.json(
			{ error: `Invalid multipart intent: ${intent}` },
			{ status: 400 },
		)
	}

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

	if (intent === siteLocalesActionIntent) {
		const submission = parseWithZod(formData, {
			schema: SiteLocalesSchema,
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const { locales, defaultLocale } = submission.value

		try {
			await prisma.organization.update({
				where: { id: organization.id },
				data: {
					siteLocales: serializeSiteLocales(locales as SiteContentLocale[]),
					siteDefaultLocale: defaultLocale,
				},
			})

			await invalidateUserOrganizationsCache(userId)

			return redirectWithToast(`/${organization.slug}/website`, {
				title: 'Languages updated',
				description: 'Your website languages have been saved.',
				type: 'success',
			})
		} catch {
			return Response.json({
				result: submission.reply({
					formErrors: ['Failed to update languages. Please try again.'],
				}),
			})
		}
	}

	if (intent === deleteSiteIconActionIntent) {
		const orgId = formData.get('organizationId')

		if (orgId !== organization.id) {
			return Response.json({ error: 'Organization mismatch' }, { status: 400 })
		}

		try {
			await prisma.organizationSiteAsset.deleteMany({
				where: { organizationId: organization.id },
			})
			await prisma.organization.update({
				where: { id: organization.id },
				data: { siteIconKey: null },
			})

			await invalidateUserOrganizationsCache(userId)

			return Response.json({ status: 'success' })
		} catch {
			return Response.json(
				{ error: 'Failed to delete site icon' },
				{ status: 500 },
			)
		}
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function WebsiteGeneralSettings() {
	const {
		organization,
		themeConfig,
		localesConfig,
		cnameTarget,
		cloudflareConfigured,
	} = useLoaderData<typeof loader>()
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
				<SiteIconCard organization={organization} />
			</AnnotatedSection>

			<AnnotatedSection>
				<SiteLocalesCard
					organization={organization}
					localesConfig={localesConfig}
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
