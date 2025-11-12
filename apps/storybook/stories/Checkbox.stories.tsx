import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox, Label } from '@repo/ui'

const meta = {
	title: 'Components/Checkbox',
	component: Checkbox,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		id: 'checkbox',
	},
}

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
}

export const Disabled: Story = {
	args: {
		disabled: true,
	},
}
