import { type Meta, type StoryObj } from '@storybook/react'
import * as React from 'react'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

const meta = {
	title: 'Components/Switch',
	component: Switch,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		disabled: {
			control: 'boolean',
		},
		checked: {
			control: 'boolean',
		},
	},
} satisfies Meta<typeof Switch>

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
			<Switch id="airplane-mode" />
			<Label htmlFor="airplane-mode">Airplane Mode</Label>
		</div>
	),
}

export const SettingsPanel: Story = {
	render: () => (
		<div className="w-[350px] space-y-4">
			<div className="flex items-center justify-between">
				<Label htmlFor="notifications" className="cursor-pointer">
					Push Notifications
				</Label>
				<Switch id="notifications" defaultChecked />
			</div>
			<div className="flex items-center justify-between">
				<Label htmlFor="email" className="cursor-pointer">
					Email Notifications
				</Label>
				<Switch id="email" />
			</div>
			<div className="flex items-center justify-between">
				<Label htmlFor="sms" className="cursor-pointer">
					SMS Notifications
				</Label>
				<Switch id="sms" defaultChecked />
			</div>
			<div className="flex items-center justify-between">
				<Label htmlFor="marketing" className="cursor-pointer">
					Marketing Emails
				</Label>
				<Switch id="marketing" />
			</div>
		</div>
	),
}

export const WithDescription: Story = {
	render: () => (
		<div className="w-[400px] space-y-4">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-0.5">
					<Label htmlFor="analytics" className="cursor-pointer">
						Usage Analytics
					</Label>
					<p className="text-muted-foreground text-sm">
						Help us improve by sending anonymous usage data
					</p>
				</div>
				<Switch id="analytics" />
			</div>
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-0.5">
					<Label htmlFor="auto-save" className="cursor-pointer">
						Auto-save
					</Label>
					<p className="text-muted-foreground text-sm">
						Automatically save your work every 5 minutes
					</p>
				</div>
				<Switch id="auto-save" defaultChecked />
			</div>
		</div>
	),
}

export const Interactive: Story = {
	render: () => {
		const [enabled, setEnabled] = React.useState(false)

		return (
			<div className="space-y-4">
				<div className="flex items-center space-x-2">
					<Switch
						id="interactive"
						checked={enabled}
						onCheckedChange={setEnabled}
					/>
					<Label htmlFor="interactive">Toggle me</Label>
				</div>
				<p className="text-muted-foreground text-sm">
					Status: {enabled ? 'Enabled' : 'Disabled'}
				</p>
			</div>
		)
	},
}
