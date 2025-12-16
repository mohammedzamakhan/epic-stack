import { type Meta, type StoryObj } from '@storybook/react'
import * as React from 'react'
import { Label } from '../ui/label'
import { Progress } from '../ui/progress'

const meta = {
	title: 'Components/Progress',
	component: Progress,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		value: {
			control: { type: 'range', min: 0, max: 100, step: 1 },
		},
	},
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		value: 50,
		className: 'w-[300px]',
	},
}

export const Empty: Story = {
	args: {
		value: 0,
		className: 'w-[300px]',
	},
}

export const Complete: Story = {
	args: {
		value: 100,
		className: 'w-[300px]',
	},
}

export const WithLabel: Story = {
	args: { value: 50 },
	render: (args) => (
		<div className="w-[300px] space-y-2">
			<div className="flex justify-between text-sm">
				<Label>Uploading...</Label>
				<span className="text-muted-foreground">50%</span>
			</div>
			<Progress {...args} />
		</div>
	),
}

export const MultipleProgress: Story = {
	args: { value: 50 },
	render: () => (
		<div className="w-[400px] space-y-6">
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<Label>Profile Completion</Label>
					<span className="text-muted-foreground">25%</span>
				</div>
				<Progress value={25} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<Label>Storage Used</Label>
					<span className="text-muted-foreground">66%</span>
				</div>
				<Progress value={66} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<Label>Tasks Completed</Label>
					<span className="text-muted-foreground">90%</span>
				</div>
				<Progress value={90} />
			</div>
		</div>
	),
}

export const Sizes: Story = {
	args: { value: 60 },
	render: (args) => (
		<div className="w-[300px] space-y-4">
			<div className="space-y-2">
				<Label>Small</Label>
				<Progress {...args} className="h-1" />
			</div>
			<div className="space-y-2">
				<Label>Default</Label>
				<Progress {...args} />
			</div>
			<div className="space-y-2">
				<Label>Large</Label>
				<Progress {...args} className="h-4" />
			</div>
		</div>
	),
}

export const Animated: Story = {
	args: { value: 0 },
	render: () => {
		const [progress, setProgress] = React.useState(0)

		React.useEffect(() => {
			const timer = setInterval(() => {
				setProgress((prev) => {
					if (prev >= 100) {
						return 0
					}
					return prev + 10
				})
			}, 500)

			return () => clearInterval(timer)
		}, [])

		return (
			<div className="w-[300px] space-y-2">
				<div className="flex justify-between text-sm">
					<Label>Loading...</Label>
					<span className="text-muted-foreground">{progress}%</span>
				</div>
				<Progress value={progress} />
			</div>
		)
	},
}
