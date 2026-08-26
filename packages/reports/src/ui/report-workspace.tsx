import { useEffect, useState } from 'react'
import {
	useFetcher,
	useLocation,
	useNavigate,
	useSearchParams,
} from 'react-router'
import { type ReportCatalog, type ReportScope } from '../catalog.ts'
import { type ReportDefinition, reportDefinitionSchema } from '../dsl.ts'
import { definitionForNewReport, templatesFor } from '../templates.ts'
import { ReportBuilder } from './report-builder.tsx'
import { ReportLibrary, type SavedReportSummary } from './report-library.tsx'
import { useReportRunner } from './use-report-runner.ts'

function cloneDefinition(definition: ReportDefinition): ReportDefinition {
	return reportDefinitionSchema.parse(definition)
}

export function ReportWorkspace({
	catalog,
	scope,
	initialDefinition,
	controlPlaneRunUrl,
	tenantTokenUrl,
	tenantApiUrl,
	backHref,
	hasTenantDb,
	savedReports,
}: {
	catalog: ReportCatalog
	scope: ReportScope
	initialDefinition: ReportDefinition
	controlPlaneRunUrl: string
	tenantTokenUrl?: string | null
	tenantApiUrl?: string | null
	backHref: string
	hasTenantDb?: boolean
	savedReports: SavedReportSummary[]
}) {
	const [definition, setDefinition] = useState(() =>
		cloneDefinition(initialDefinition),
	)
	const [searchParams] = useSearchParams()
	const location = useLocation()
	const fetcher = useFetcher<{ ok?: boolean; id?: string; error?: string }>()
	const navigate = useNavigate()
	const { result, error, loading, updatedAt } = useReportRunner({
		catalog,
		definition,
		controlPlaneRunUrl,
		tenantTokenUrl,
		tenantApiUrl,
	})
	const templateId = searchParams.get('template')
	const isNewReport = location.pathname.endsWith('/new')

	useEffect(() => {
		if (!isNewReport) return
		setDefinition(cloneDefinition(definitionForNewReport(scope, templateId)))
	}, [isNewReport, scope, templateId])

	useEffect(() => {
		if (fetcher.data?.ok && fetcher.data.id && fetcher.state === 'idle') {
			const nextHref = `${backHref}/${fetcher.data.id}`
			if (!window.location.pathname.endsWith(`/${fetcher.data.id}`)) {
				navigate(nextHref, { replace: true })
			}
		}
	}, [backHref, fetcher.data, fetcher.state, navigate])

	return (
		<div className="flex h-full min-h-0 overflow-hidden">
			<ReportLibrary
				scope={scope}
				templates={templatesFor(scope)}
				savedReports={savedReports}
				basePath={backHref}
				activeTemplateId={searchParams.get('template')}
				compact
			/>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<ReportBuilder
					catalog={catalog}
					definition={definition}
					onChange={setDefinition}
					result={result}
					error={error}
					loading={loading}
					updatedAt={updatedAt}
					saving={fetcher.state !== 'idle'}
					saveError={fetcher.data?.error}
					backHref={backHref}
					hasTenantDb={hasTenantDb}
					onSave={() => {
						fetcher.submit(
							{
								intent: 'save',
								definition: JSON.stringify(definition),
							},
							{ method: 'post' },
						)
					}}
				/>
			</div>
		</div>
	)
}
