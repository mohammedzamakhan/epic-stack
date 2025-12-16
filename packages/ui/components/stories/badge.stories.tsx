import { type Meta, type StoryObj } from '@storybook/react'
import { Badge } from '../ui/badge'
import { Icon } from '../icon'

const meta = {
	title: 'Components/Badge',
	component: Badge,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'secondary', 'destructive', 'outline'],
		},
	},
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		children: 'Badge',
		variant: 'default',
	},
}

export const Secondary: Story = {
	args: {
		children: 'Secondary',
		variant: 'secondary',
	},
}

export const Destructive: Story = {
	args: {
		children: 'Destructive',
		variant: 'destructive',
	},
}

export const Outline: Story = {
	args: {
		children: 'Outline',
		variant: 'outline',
	},
}

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	),
}

export const WithIcon: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge>
				<Icon name="check-circle" size="xs" />
				Success
			</Badge>
			<Badge variant="destructive">
				<Icon name="x" size="xs" />
				Error
			</Badge>
			<Badge variant="secondary">
				<Icon name="clock" size="xs" />
				Pending
			</Badge>
			<Badge variant="outline">
				<Icon name="loader" size="xs" />
				Processing
			</Badge>
		</div>
	),
}

export const StatusBadges: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<h3 className="mb-2 text-sm font-medium">Project Status</h3>
				<div className="flex gap-2">
					<Badge variant="default">
						<Icon name="check-circle" size="xs" />
						Active
					</Badge>
					<Badge variant="secondary">
						<Icon name="clock" size="xs" />
						On Hold
					</Badge>
					<Badge variant="outline">
						<Icon name="circle-check" size="xs" />
						Completed
					</Badge>
				</div>
			</div>
			<div>
				<h3 className="mb-2 text-sm font-medium">Priority Levels</h3>
				<div className="flex gap-2">
					<Badge variant="destructive">
						<Icon name="alert-triangle" size="xs" />
						Critical
					</Badge>
					<Badge variant="default">
						<Icon name="trending-up" size="xs" />
						High
					</Badge>
					<Badge variant="secondary">Medium</Badge>
					<Badge variant="outline">Low</Badge>
				</div>
			</div>
			<div>
				<h3 className="mb-2 text-sm font-medium">User Roles</h3>
				<div className="flex gap-2">
					<Badge variant="default">
						<Icon name="shield" size="xs" />
						Admin
					</Badge>
					<Badge variant="secondary">
						<Icon name="user" size="xs" />
						Member
					</Badge>
					<Badge variant="outline">
						<Icon name="user" size="xs" />
						Viewer
					</Badge>
				</div>
			</div>
		</div>
	),
}
