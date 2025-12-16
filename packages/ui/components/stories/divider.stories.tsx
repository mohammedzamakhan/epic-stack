import { type Meta, type StoryObj } from '@storybook/react'
import { Divider } from '../divider'

const meta = {
	title: 'Components/Divider',
	component: Divider,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<div className="w-[300px]">
			<Divider />
		</div>
	),
}

export const InContent: Story = {
	render: () => (
		<div className="w-[400px] space-y-4">
			<p className="text-sm">Content above</p>
			<Divider />
			<p className="text-sm">Content below</p>
		</div>
	),
}
