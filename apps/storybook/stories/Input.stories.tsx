import type { Meta, StoryObj } from '@storybook/react'
import { Input, Label } from '@repo/ui'

const meta = {
	title: 'Components/Input',
	component: Input,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		placeholder: 'Enter text...',
	},
}

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<Label htmlFor="email">Email</Label>
			<Input type="email" id="email" placeholder="Email" />
		</div>
	),
}

export const Disabled: Story = {
	args: {
		placeholder: 'Disabled input',
		disabled: true,
	},
}

export const File: Story = {
	args: {
		type: 'file',
	},
}
