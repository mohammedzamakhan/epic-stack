import { type Meta, type StoryObj } from '@storybook/react'
import * as React from 'react'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'

const meta = {
	title: 'Components/ToggleGroup',
	component: ToggleGroup,

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
		type: {
			control: 'select',
			options: ['single', 'multiple'],
		},
	},
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		type: 'single',
		children: (
			<>
				<ToggleGroupItem value="left">Left</ToggleGroupItem>
				<ToggleGroupItem value="center">Center</ToggleGroupItem>
				<ToggleGroupItem value="right">Right</ToggleGroupItem>
			</>
		),
	},
}

export const Outline: Story = {
	args: {
		type: 'single',
		variant: 'outline',
		children: (
			<>
				<ToggleGroupItem value="left">Left</ToggleGroupItem>
				<ToggleGroupItem value="center">Center</ToggleGroupItem>
				<ToggleGroupItem value="right">Right</ToggleGroupItem>
			</>
		),
	},
}

export const Multiple: Story = {
	args: {
		type: 'multiple',
		variant: 'outline',
		children: (
			<>
				<ToggleGroupItem value="bold">
					<strong>B</strong>
				</ToggleGroupItem>
				<ToggleGroupItem value="italic">
					<em>I</em>
				</ToggleGroupItem>
				<ToggleGroupItem value="underline">
					<u>U</u>
				</ToggleGroupItem>
			</>
		),
	},
}

export const Small: Story = {
	args: {
		type: 'single',
		size: 'sm',
		variant: 'outline',
		children: (
			<>
				<ToggleGroupItem value="xs">XS</ToggleGroupItem>
				<ToggleGroupItem value="s">S</ToggleGroupItem>
				<ToggleGroupItem value="m">M</ToggleGroupItem>
				<ToggleGroupItem value="l">L</ToggleGroupItem>
				<ToggleGroupItem value="xl">XL</ToggleGroupItem>
			</>
		),
	},
}

export const Large: Story = {
	args: {
		type: 'single',
		size: 'lg',
		variant: 'outline',
		children: (
			<>
				<ToggleGroupItem value="grid">Grid</ToggleGroupItem>
				<ToggleGroupItem value="list">List</ToggleGroupItem>
			</>
		),
	},
}

export const TextAlignment: Story = {
	args: {},
	render: () => (
		<ToggleGroup type="single" variant="outline">
			<ToggleGroupItem value="left" aria-label="Align left">
				⬅️
			</ToggleGroupItem>
			<ToggleGroupItem value="center" aria-label="Align center">
				↕️
			</ToggleGroupItem>
			<ToggleGroupItem value="right" aria-label="Align right">
				➡️
			</ToggleGroupItem>
			<ToggleGroupItem value="justify" aria-label="Justify">
				↔️
			</ToggleGroupItem>
		</ToggleGroup>
	),
}

export const ViewMode: Story = {
	args: {},
	render: () => {
		const [view, setView] = React.useState('grid')

		return (
			<div className="space-y-4">
				<ToggleGroup
					type="single"
					value={view}
					onValueChange={setView}
					variant="outline"
				>
					<ToggleGroupItem value="grid">🔲 Grid</ToggleGroupItem>
					<ToggleGroupItem value="list">📋 List</ToggleGroupItem>
					<ToggleGroupItem value="table">📊 Table</ToggleGroupItem>
				</ToggleGroup>
				<p className="text-muted-foreground text-sm">
					Current view: {view || 'none'}
				</p>
			</div>
		)
	},
}
