// import { ChartAreaInteractive } from "#app/components/chart-area-interactive.tsx"
import { DataTable } from '#app/components/data-table.tsx'
import { SectionCards } from '#app/components/section-cards.tsx'
import data from '#app/dashboard/data.json'

export default function MarketingDashboard() {
	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<SectionCards />
			<DataTable data={data} />
		</div>
	)
}
