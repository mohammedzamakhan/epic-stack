import { type Meta, type StoryObj } from '@storybook/react'
import * as React from 'react'
import { Toggle } from '../ui/toggle'

const meta = {
	title: 'Components/Toggle',
	component: Toggle,

	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'outline'],
		},
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg'],
		},
	},
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		children: 'Toggle',
	},
}

export const Outline: Story = {
	args: {
		children: 'Toggle',
		variant: 'outline',
	},
}

export const Small: Story = {
	args: {
		children: 'Small',
		size: 'sm',
	},
}

export const Large: Story = {
	args: {
		children: 'Large',
		size: 'lg',
	},
}

export const WithIcon: Story = {
	args: {
		children: '⭐',
	},
}

export const Disabled: Story = {
	args: {
		children: 'Disabled',
		disabled: true,
	},
}

export const TextFormatting: Story = {
	render: () => (
		<div className="flex gap-1">
			<Toggle aria-label="Toggle bold">
				<strong>B</strong>
			</Toggle>
			<Toggle aria-label="Toggle italic">
				<em>I</em>
			</Toggle>
			<Toggle aria-label="Toggle underline">
				<u>U</u>
			</Toggle>
			<Toggle aria-label="Toggle strikethrough">
				<s>S</s>
			</Toggle>
		</div>
	),
}

export const Interactive: Story = {
	render: () => {
		const [pressed, setPressed] = React.useState(false)

		return (
			<div className="space-y-2">
				<Toggle
					pressed={pressed}
					onPressedChange={setPressed}
					aria-label="Toggle favorite"
				>
					{pressed ? '⭐' : '☆'} Favorite
				</Toggle>
				<p className="text-muted-foreground text-sm">
					Status: {pressed ? 'Favorited' : 'Not favorited'}
				</p>
			</div>
		)
	},
}
