import { type Meta, type StoryObj } from '@storybook/react'
import {
	Bar,
	BarChart,
	Line,
	LineChart,
	Pie,
	PieChart,
	CartesianGrid,
	XAxis,
} from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from '../ui/chart'

const meta = {
	title: 'Components/Chart',
	component: ChartContainer,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

const chartData = [
	{ month: 'January', desktop: 186, mobile: 80 },
	{ month: 'February', desktop: 305, mobile: 200 },
	{ month: 'March', desktop: 237, mobile: 120 },
	{ month: 'April', desktop: 73, mobile: 190 },
	{ month: 'May', desktop: 209, mobile: 130 },
	{ month: 'June', desktop: 214, mobile: 140 },
]

const chartConfig = {
	desktop: {
		label: 'Desktop',
		color: '#2563eb',
	},
	mobile: {
		label: 'Mobile',
		color: '#60a5fa',
	},
} satisfies ChartConfig

export const BarChartExample: Story = {
	args: {
		config: chartConfig,
		children: <></>,
	},
	render: () => (
		<ChartContainer
			config={chartConfig}
			className="min-h-[200px] w-full max-w-md"
		>
			<BarChart data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="month"
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					tickFormatter={(value) => value.slice(0, 3)}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend content={<ChartLegendContent />} />
				<Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
				<Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
			</BarChart>
		</ChartContainer>
	),
}

export const LineChartExample: Story = {
	args: {
		config: chartConfig,
		children: <></>,
	},
	render: () => (
		<ChartContainer
			config={chartConfig}
			className="min-h-[200px] w-full max-w-md"
		>
			<LineChart data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="month"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					tickFormatter={(value) => value.slice(0, 3)}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend content={<ChartLegendContent />} />
				<Line
					dataKey="desktop"
					type="monotone"
					stroke="var(--color-desktop)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					dataKey="mobile"
					type="monotone"
					stroke="var(--color-mobile)"
					strokeWidth={2}
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	),
}

const pieData = [
	{ browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
	{ browser: 'safari', visitors: 200, fill: 'var(--color-safari)' },
	{ browser: 'firefox', visitors: 187, fill: 'var(--color-firefox)' },
	{ browser: 'edge', visitors: 173, fill: 'var(--color-edge)' },
	{ browser: 'other', visitors: 90, fill: 'var(--color-other)' },
]

const pieChartConfig = {
	chrome: {
		label: 'Chrome',
		color: '#2563eb',
	},
	safari: {
		label: 'Safari',
		color: '#60a5fa',
	},
	firefox: {
		label: 'Firefox',
		color: '#f97316',
	},
	edge: {
		label: 'Edge',
		color: '#8b5cf6',
	},
	other: {
		label: 'Other',
		color: '#6b7280',
	},
} satisfies ChartConfig

export const PieChartExample: Story = {
	args: {
		config: pieChartConfig,
		children: <></>,
	},
	render: () => (
		<ChartContainer
			config={pieChartConfig}
			className="min-h-[200px] w-full max-w-md"
		>
			<PieChart>
				<ChartTooltip content={<ChartTooltipContent hideLabel />} />
				<Pie data={pieData} dataKey="visitors" nameKey="browser" />
			</PieChart>
		</ChartContainer>
	),
}
