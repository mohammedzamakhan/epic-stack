import { type Meta, type StoryObj } from '@storybook/react'
import { Checkbox } from '../ui/checkbox'

const meta = {
	title: 'Components/Checkbox',
	component: Checkbox,

	tags: ['autodocs'],
	argTypes: {
		disabled: {
			control: 'boolean',
		},
		checked: {
			control: 'boolean',
		},
	},
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
}

export const Checked: Story = {
	args: {
		checked: true,
	},
}

export const Disabled: Story = {
	args: {
		disabled: true,
	},
}

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		checked: true,
	},
}

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" />
			<label
				htmlFor="terms"
				className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				Accept terms and conditions
			</label>
		</div>
	),
}

export const MultipleOptions: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex items-center space-x-2">
				<Checkbox id="option1" />
				<label htmlFor="option1" className="text-sm font-medium">
					Option 1
				</label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="option2" checked />
				<label htmlFor="option2" className="text-sm font-medium">
					Option 2 (Checked)
				</label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="option3" />
				<label htmlFor="option3" className="text-sm font-medium">
					Option 3
				</label>
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox id="option4" disabled />
				<label
					htmlFor="option4"
					className="cursor-not-allowed text-sm font-medium opacity-70"
				>
					Option 4 (Disabled)
				</label>
			</div>
		</div>
	),
}

export const FormExample: Story = {
	render: () => (
		<form className="w-[350px] space-y-4">
			<div className="space-y-3">
				<h3 className="text-sm font-medium">Notification Preferences</h3>
				<div className="flex items-center space-x-2">
					<Checkbox id="email-notif" checked />
					<label htmlFor="email-notif" className="text-sm">
						Email notifications
					</label>
				</div>
				<div className="flex items-center space-x-2">
					<Checkbox id="push-notif" />
					<label htmlFor="push-notif" className="text-sm">
						Push notifications
					</label>
				</div>
				<div className="flex items-center space-x-2">
					<Checkbox id="sms-notif" checked />
					<label htmlFor="sms-notif" className="text-sm">
						SMS notifications
					</label>
				</div>
			</div>
		</form>
	),
}
