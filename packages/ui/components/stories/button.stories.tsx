import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import { Icon as IconComponent } from '../icon'

const meta = {
	title: 'Components/Button',
	component: Button,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: [
				'default',
				'destructive',
				'outline',
				'secondary',
				'ghost',
				'link',
			],
		},
		size: {
			control: 'select',
			options: ['default', 'xs', 'sm', 'lg', 'icon'],
		},
		disabled: {
			control: 'boolean',
		},
	},
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		children: 'Button',
		variant: 'default',
	},
}

export const Destructive: Story = {
	args: {
		children: 'Delete',
		variant: 'destructive',
	},
}

export const Outline: Story = {
	args: {
		children: 'Outline',
		variant: 'outline',
	},
}

export const Secondary: Story = {
	args: {
		children: 'Secondary',
		variant: 'secondary',
	},
}

export const Ghost: Story = {
	args: {
		children: 'Ghost',
		variant: 'ghost',
	},
}

export const Link: Story = {
	args: {
		children: 'Link',
		variant: 'link',
	},
}

export const Small: Story = {
	args: {
		children: 'Small Button',
		size: 'sm',
	},
}

export const ExtraSmall: Story = {
	args: {
		children: 'Extra Small Button',
		size: 'xs',
	},
}

export const Large: Story = {
	args: {
		children: 'Large Button',
		size: 'lg',
	},
}

export const Icon: Story = {
	args: {
		children: '🚀',
		size: 'icon',
	},
}

export const Disabled: Story = {
	args: {
		children: 'Disabled',
		disabled: true,
	},
}

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-2">
				<Button variant="default">Default</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="link">Link</Button>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Button size="xs">Extra Small</Button>
				<Button size="sm">Small</Button>
				<Button size="default">Default</Button>
				<Button size="lg">Large</Button>
				<Button size="icon">🚀</Button>
			</div>
		</div>
	),
}

export const WithIcons: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Button>
				<IconComponent name="plus" />
				Create New
			</Button>
			<Button variant="outline">
				<IconComponent name="download" />
				Download
			</Button>
			<Button variant="destructive">
				<IconComponent name="trash-2" />
				Delete
			</Button>
			<Button variant="secondary">
				<IconComponent name="settings" />
				Settings
			</Button>
			<Button variant="ghost" size="icon">
				<IconComponent name="search" />
			</Button>
		</div>
	),
}

export const ActionButtons: Story = {
	render: () => (
		<div className="flex max-w-md flex-col gap-4">
			<div className="flex items-center justify-between">
				<h3 className="font-medium">Form Actions</h3>
				<div className="flex gap-2">
					<Button variant="outline">Cancel</Button>
					<Button>Save Changes</Button>
				</div>
			</div>
			<div className="flex items-center justify-between">
				<h3 className="font-medium">Confirmation Dialog</h3>
				<div className="flex gap-2">
					<Button variant="ghost">Maybe Later</Button>
					<Button variant="destructive">Delete Account</Button>
				</div>
			</div>
			<div className="flex items-center justify-between">
				<h3 className="font-medium">Navigation</h3>
				<div className="flex gap-2">
					<Button variant="ghost">
						<IconComponent name="chevron-left" />
						Back
					</Button>
					<Button>
						Next
						<IconComponent name="chevron-right" />
					</Button>
				</div>
			</div>
		</div>
	),
}
