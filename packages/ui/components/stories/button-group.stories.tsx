import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
} from '../ui/button-group'

const meta = {
	title: 'Components/ButtonGroup',
	component: ButtonGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
	},
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">Left</Button>
			<Button variant="outline">Center</Button>
			<Button variant="outline">Right</Button>
		</ButtonGroup>
	),
}

export const WithSeparators: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">Copy</Button>
			<ButtonGroupSeparator />
			<Button variant="outline">Paste</Button>
			<ButtonGroupSeparator />
			<Button variant="outline">Cut</Button>
		</ButtonGroup>
	),
}

export const Vertical: Story = {
	render: () => (
		<ButtonGroup orientation="vertical">
			<Button variant="outline">Top</Button>
			<Button variant="outline">Middle</Button>
			<Button variant="outline">Bottom</Button>
		</ButtonGroup>
	),
}

export const WithText: Story = {
	render: () => (
		<ButtonGroup>
			<ButtonGroupText>Sort by:</ButtonGroupText>
			<Button variant="outline">Name</Button>
			<Button variant="outline">Date</Button>
			<Button variant="outline">Size</Button>
		</ButtonGroup>
	),
}

export const Mixed: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">⬅️</Button>
			<ButtonGroupSeparator />
			<Button variant="outline">1</Button>
			<Button variant="outline">2</Button>
			<Button variant="outline">3</Button>
			<ButtonGroupSeparator />
			<Button variant="outline">➡️</Button>
		</ButtonGroup>
	),
}

export const Actions: Story = {
	render: () => (
		<ButtonGroup>
			<Button variant="outline">✏️ Edit</Button>
			<Button variant="outline">📋 Copy</Button>
			<Button variant="outline" className="text-destructive">
				🗑️ Delete
			</Button>
		</ButtonGroup>
	),
}
