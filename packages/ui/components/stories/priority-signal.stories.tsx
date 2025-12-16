import { type Meta, type StoryObj } from '@storybook/react'
import { PrioritySignal } from '../priority-signal'

const meta = {
	title: 'Components/PrioritySignal',
	component: PrioritySignal,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		priority: {
			control: 'select',
			options: ['low', 'medium', 'high'],
		},
		theme: {
			control: 'select',
			options: ['light', 'dark'],
		},
	},
} satisfies Meta<typeof PrioritySignal>

export default meta
type Story = StoryObj<typeof meta>

export const Low: Story = {
	args: {
		priority: 'low',
		theme: 'light',
	},
}

export const Medium: Story = {
	args: {
		priority: 'medium',
		theme: 'light',
	},
}

export const High: Story = {
	args: {
		priority: 'high',
		theme: 'light',
	},
}

export const DarkThemeLow: Story = {
	args: {
		priority: 'low',
		theme: 'dark',
	},
}

export const DarkThemeMedium: Story = {
	args: {
		priority: 'medium',
		theme: 'dark',
	},
}

export const DarkThemeHigh: Story = {
	args: {
		priority: 'high',
		theme: 'dark',
	},
}

export const AllPriorities: Story = {
	args: {
		priority: 'low',
	},
	render: () => (
		<div className="flex items-center gap-4">
			<div className="flex flex-col items-center gap-2">
				<PrioritySignal priority="low" />
				<span className="text-xs">Low</span>
			</div>
			<div className="flex flex-col items-center gap-2">
				<PrioritySignal priority="medium" />
				<span className="text-xs">Medium</span>
			</div>
			<div className="flex flex-col items-center gap-2">
				<PrioritySignal priority="high" />
				<span className="text-xs">High</span>
			</div>
		</div>
	),
}
