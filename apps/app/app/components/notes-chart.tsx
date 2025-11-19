import { Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@repo/ui/chart'
import { TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

const chartConfig = {
	notes: {
		label: 'Notes Created',
		color: 'var(--chart-2)',
	},
} satisfies ChartConfig

interface NotesChartProps {
	data: Array<{
		date: string
		day: string
		label: string
		notes: number
	}>
	daysShown: number
}

export function NotesChart({ data, daysShown }: NotesChartProps) {
	const { _: ignored_ } = useLingui()
	const totalNotes = data.reduce((sum, item) => sum + item.notes, 0)
	const avgNotesPerDay = Math.round((totalNotes / data.length) * 10) / 10

	// Calculate trend (comparing last half vs first half)
	const halfPoint = Math.floor(data.length / 2)
	const lastHalf = data.slice(halfPoint)
	const firstHalf = data.slice(0, halfPoint)
	const lastHalfTotal = lastHalf.reduce((sum, item) => sum + item.notes, 0)
	const firstHalfTotal = firstHalf.reduce((sum, item) => sum + item.notes, 0)

	const trendPercentage =
		firstHalfTotal === 0
			? lastHalfTotal > 0
				? 100
				: 0
			: Math.round(((lastHalfTotal - firstHalfTotal) / firstHalfTotal) * 100)

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Trans>Daily Notes Created</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						Notes created by your organization over the last {daysShown} days
					</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[250px] w-full"
				>
					<AreaChart
						accessibilityLayer
						data={data}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value) => value}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent indicator="dot" />}
						/>
						<Area
							dataKey="notes"
							type="step"
							fill="var(--color-notes)"
							fillOpacity={0.4}
							stroke="var(--color-notes)"
							strokeWidth={2}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
			<CardFooter>
				<div className="flex w-full items-start gap-2 text-sm">
					<div className="grid gap-2">
						<div className="flex items-center gap-2 leading-none font-medium">
							{trendPercentage >= 0 ? (
								<>
									<Trans>Trending up by {trendPercentage}% this period</Trans>{' '}
									<TrendingUp className="h-4 w-4" />
								</>
							) : (
								<>
									<Trans>
										Down by {Math.abs(trendPercentage)}% this period
									</Trans>{' '}
									<TrendingUp className="h-4 w-4 rotate-180" />
								</>
							)}
						</div>
						<div className="text-muted-foreground flex items-center gap-2 leading-none">
							<Trans>
								{totalNotes} total notes • {avgNotesPerDay} avg per day
							</Trans>
						</div>
					</div>
				</div>
			</CardFooter>
		</Card>
	)
}
