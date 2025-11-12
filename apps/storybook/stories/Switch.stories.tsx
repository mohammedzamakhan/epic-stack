import type { Meta, StoryObj } from '@storybook/react'
import { Switch, Label } from '@repo/ui'

const meta = {
	title: 'Components/Switch',
	component: Switch,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Switch id="airplane-mode" />
			<Label htmlFor="airplane-mode">Airplane Mode</Label>
		</div>
	),
}

export const Disabled: Story = {
	args: {
		disabled: true,
	},
}
