import { requireUserId } from '@repo/auth'
import { definitionForNewReport, getCatalog, getSubject } from '@repo/reports'
import {
	listSavedReports,
	parseDefinition,
	saveReport,
} from '@repo/reports/server'
import { ReportWorkspace } from '@repo/reports/ui'
import { redirect, useLoaderData } from 'react-router'
import { ENV } from 'varlock/env'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'
import { type Route } from './+types/new.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
		hasProvisionedDb: true,
		dataRegion: true,
	})
	const url = new URL(request.url)
	const catalog = getCatalog('organization')
	const saved = await listSavedReports({
		scope: 'organization',
		organizationId: organization.id,
	})
	const definition = definitionForNewReport(
		'organization',
		url.searchParams.get('template'),
	)

	return {
		catalog,
		definition,
		orgSlug: organization.slug,
		savedReports: saved.map((report) => ({
			id: report.id,
			title: report.title,
			updatedAt: report.updatedAt.toISOString(),
			subject: parseDefinition(report.definition).subject,
		})),
		hasProvisionedDb: organization.hasProvisionedDb,
		tenantApiUrl:
			organization.dataRegion === 'ksa'
				? (
						process.env.PUBLIC_TENANT_API_URL_KSA ||
						ENV.TENANT_API_URL_KSA ||
						'http://localhost:3009'
					).replace(/\/$/, '')
				: (
						process.env.PUBLIC_TENANT_API_URL ||
						ENV.TENANT_API_URL ||
						'http://localhost:3007'
					).replace(/\/$/, ''),
	}
}

export async function action({ request, params }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
	})
	const form = await request.formData()
	const definition = parseDefinition(form.get('definition'))
	const saved = await saveReport({
		scope: 'organization',
		organizationId: organization.id,
		createdById: userId,
		definition,
	})
	if (!saved) {
		return { ok: false as const, error: 'Could not save report' }
	}
	throw redirect(`/${organization.slug}/reports/${saved.id}`)
}

export default function NewReportRoute() {
	const data = useLoaderData<typeof loader>()
	const subject = getSubject(data.catalog, data.definition.subject)

	return (
		<div className="-mx-4 h-[calc(100dvh-var(--header-height,3rem))] min-h-0 md:-mx-2">
			<ReportWorkspace
				catalog={data.catalog}
				scope="organization"
				initialDefinition={data.definition}
				controlPlaneRunUrl={`/${data.orgSlug}/reports/run`}
				tenantTokenUrl={
					subject?.source === 'tenant-api'
						? `/${data.orgSlug}/reports/token`
						: null
				}
				tenantApiUrl={data.tenantApiUrl}
				backHref={`/${data.orgSlug}/reports`}
				hasTenantDb={data.hasProvisionedDb}
				savedReports={data.savedReports}
			/>
		</div>
	)
}
