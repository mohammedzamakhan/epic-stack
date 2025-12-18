import { type Meta, type StoryObj } from '@storybook/react'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const meta = {
	title: 'Components/Label',
	component: Label,

	tags: ['autodocs'],
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		children: 'Label Text',
	},
}

export const WithInput: Story = {
	render: () => (
		<div className="space-y-2">
			<Label htmlFor="email">Email</Label>
			<Input id="email" type="email" placeholder="Enter your email" />
		</div>
	),
}

export const WithCheckbox: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
}

export const FormFields: Story = {
	render: () => (
		<form className="w-[350px] space-y-6">
			<div className="space-y-2">
				<Label htmlFor="name">Full Name</Label>
				<Input id="name" placeholder="John Doe" />
			</div>
			<div className="space-y-2">
				<Label htmlFor="email">Email Address</Label>
				<Input id="email" type="email" placeholder="john@example.com" />
			</div>
			<div className="space-y-2">
				<Label htmlFor="message">Message</Label>
				<Input id="message" placeholder="Your message here..." />
			</div>
		</form>
	),
}

export const Required: Story = {
	render: () => (
		<div className="space-y-2">
			<Label htmlFor="required">
				Required Field <span className="text-destructive">*</span>
			</Label>
			<Input id="required" placeholder="This field is required" />
		</div>
	),
}

export const Disabled: Story = {
	render: () => (
		<div className="space-y-2">
			<Label htmlFor="disabled" className="opacity-70">
				Disabled Field
			</Label>
			<Input id="disabled" disabled placeholder="Cannot edit" />
		</div>
	),
}
