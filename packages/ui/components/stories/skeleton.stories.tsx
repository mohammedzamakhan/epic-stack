import { type Meta, type StoryObj } from '@storybook/react'
import { Skeleton } from '../ui/skeleton'

const meta = {
	title: 'Components/Skeleton',
	component: Skeleton,

	tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		className: 'w-[200px] h-[20px]',
	},
}

export const Circle: Story = {
	args: {
		className: 'w-12 h-12 rounded-full',
	},
}

export const Card: Story = {
	render: () => (
		<div className="w-[350px] space-y-4 rounded-lg border p-6">
			<Skeleton className="h-12 w-12 rounded-full" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-[250px]" />
				<Skeleton className="h-4 w-[200px]" />
			</div>
		</div>
	),
}

export const ProfileCard: Story = {
	render: () => (
		<div className="w-[300px] space-y-4 rounded-lg border p-6">
			<div className="flex items-center space-x-4">
				<Skeleton className="h-12 w-12 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-[150px]" />
					<Skeleton className="h-4 w-[100px]" />
				</div>
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</div>
		</div>
	),
}

export const ListItems: Story = {
	render: () => (
		<div className="w-[400px] space-y-4">
			{[...Array(5)].map((_, i) => (
				<div key={i} className="flex items-center space-x-4">
					<Skeleton className="h-12 w-12 rounded-md" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				</div>
			))}
		</div>
	),
}

export const Table: Story = {
	render: () => (
		<div className="w-[600px] space-y-2">
			<div className="flex gap-4">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 flex-1" />
			</div>
			{[...Array(5)].map((_, i) => (
				<div key={i} className="flex gap-4">
					<Skeleton className="h-8 flex-1" />
					<Skeleton className="h-8 flex-1" />
					<Skeleton className="h-8 flex-1" />
				</div>
			))}
		</div>
	),
}

export const ArticlePreview: Story = {
	render: () => (
		<div className="w-[500px] space-y-4">
			<Skeleton className="h-[200px] w-full rounded-lg" />
			<div className="space-y-2">
				<Skeleton className="h-8 w-3/4" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-2/3" />
			</div>
			<div className="flex gap-2">
				<Skeleton className="h-6 w-16 rounded-full" />
				<Skeleton className="h-6 w-16 rounded-full" />
				<Skeleton className="h-6 w-16 rounded-full" />
			</div>
		</div>
	),
}
