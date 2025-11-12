import type { Meta, StoryObj } from '@storybook/react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from './chart';

const meta = {
  title: 'Components/Chart',
  component: ChartContainer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const chartData = [
  { month: 'January', desktop: 186, mobile: 80 },
  { month: 'February', desktop: 305, mobile: 200 },
  { month: 'March', desktop: 237, mobile: 120 },
  { month: 'April', desktop: 73, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'June', desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: '#2563eb',
  },
  mobile: {
    label: 'Mobile',
    color: '#60a5fa',
  },
};

export const BarChartExample: Story = {
  render: () => (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
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
};

export const LineChartExample: Story = {
  render: () => (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <LineChart data={chartData}>
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
        <Line
          type="monotone"
          dataKey="desktop"
          stroke="var(--color-desktop)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="mobile"
          stroke="var(--color-mobile)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  ),
};

const salesData = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 5000 },
  { name: 'Apr', sales: 4500 },
  { name: 'May', sales: 6000 },
  { name: 'Jun', sales: 5500 },
];

const salesConfig = {
  sales: {
    label: 'Sales',
    color: '#10b981',
  },
};

export const SimpleLine: Story = {
  render: () => (
    <ChartContainer config={salesConfig} className="min-h-[200px] w-full">
      <LineChart data={salesData}>
        <XAxis dataKey="name" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="sales"
          stroke="var(--color-sales)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  ),
};

export const SimpleBar: Story = {
  render: () => (
    <ChartContainer config={salesConfig} className="min-h-[200px] w-full">
      <BarChart data={salesData}>
        <XAxis dataKey="name" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};

const revenueData = [
  { quarter: 'Q1', revenue: 25000, profit: 12000 },
  { quarter: 'Q2', revenue: 32000, profit: 15000 },
  { quarter: 'Q3', revenue: 28000, profit: 13500 },
  { quarter: 'Q4', revenue: 40000, profit: 18000 },
];

const revenueConfig = {
  revenue: {
    label: 'Revenue',
    color: '#3b82f6',
  },
  profit: {
    label: 'Profit',
    color: '#10b981',
  },
};

export const MultipleDataSets: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Quarterly Performance</h3>
      <ChartContainer config={revenueConfig} className="min-h-[300px] w-full">
        <BarChart data={revenueData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="quarter" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};
