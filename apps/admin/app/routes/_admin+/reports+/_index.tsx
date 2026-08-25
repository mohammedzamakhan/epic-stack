import { requireUserWithRole } from '@repo/auth'
import { templatesFor } from '@repo/reports'
import { listSavedReports, parseDefinition } from '@repo/reports/server'
import { ReportLibrary, ReportStart } from '@repo/reports/ui'
import { useLoaderData } from 'react-router'
import { type Route } from './+types/_index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')
	const saved = await listSavedReports({ scope: 'platform' })
	return {
		savedReports: saved.map((report) => ({
			id: report.id,
			title: report.title,
			updatedAt: report.updatedAt.toISOString(),
			subject: parseDefinition(report.definition).subject,
		})),
		templates: templatesFor('platform'),
	}
}

export default function AdminReportsIndex() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="flex h-full min-h-0 overflow-hidden">
			<ReportLibrary
				scope="platform"
				templates={data.templates}
				savedReports={data.savedReports}
				basePath="/reports"
			/>
			<ReportStart
				heading="Analytics & Reports"
				description="Platform reports for organizations, operators, waitlist, and audit activity. These use control-plane data only. Customer PII stays in each organization's regional tenant database."
				templates={data.templates}
				savedReports={data.savedReports}
				basePath="/reports"
			/>
		</div>
	)
}
