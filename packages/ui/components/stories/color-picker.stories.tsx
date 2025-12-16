import { type Meta, type StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ColorPicker } from '../color-picker'

const meta = {
	title: 'Components/ColorPicker',
	component: ColorPicker,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof ColorPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		value: '#6b7280',
		onChange: () => {},
	},
	render: () => {
		const [color, setColor] = useState('#6b7280')
		return (
			<div className="flex items-center gap-4">
				<ColorPicker value={color} onChange={setColor} />
				<span className="text-sm">Selected: {color}</span>
			</div>
		)
	},
}

export const WithInitialColor: Story = {
	args: {
		value: '#3b82f6',
		onChange: () => {},
	},
	render: () => {
		const [color, setColor] = useState('#3b82f6')
		return (
			<div className="flex items-center gap-4">
				<ColorPicker value={color} onChange={setColor} />
				<span className="text-sm">Selected: {color}</span>
			</div>
		)
	},
}

export const Disabled: Story = {
	args: {
		value: '#6b7280',
		onChange: () => {},
	},
	render: () => {
		const [color, setColor] = useState('#6b7280')
		return (
			<div className="flex items-center gap-4">
				<ColorPicker value={color} onChange={setColor} disabled />
				<span className="text-muted-foreground text-sm">Disabled</span>
			</div>
		)
	},
}

export const MultipleColorPickers: Story = {
	args: {
		value: '#3b82f6',
		onChange: () => {},
	},
	render: () => {
		const [primaryColor, setPrimaryColor] = useState('#3b82f6')
		const [secondaryColor, setSecondaryColor] = useState('#ec4899')
		const [accentColor, setAccentColor] = useState('#22c55e')

		return (
			<div className="space-y-4">
				<div className="flex items-center gap-4">
					<ColorPicker value={primaryColor} onChange={setPrimaryColor} />
					<span className="text-sm">Primary: {primaryColor}</span>
				</div>
				<div className="flex items-center gap-4">
					<ColorPicker value={secondaryColor} onChange={setSecondaryColor} />
					<span className="text-sm">Secondary: {secondaryColor}</span>
				</div>
				<div className="flex items-center gap-4">
					<ColorPicker value={accentColor} onChange={setAccentColor} />
					<span className="text-sm">Accent: {accentColor}</span>
				</div>
			</div>
		)
	},
}
