import { type Meta, type StoryObj } from '@storybook/react'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from '../ui/select'

const meta = {
	title: 'Components/Select',
	component: Select,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	render: () => (
		<Select>
			<SelectTrigger className="w-[180px]">Select a fruit</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="orange">Orange</SelectItem>
				<SelectItem value="grape">Grape</SelectItem>
			</SelectContent>
		</Select>
	),
}

export const WithGroups: Story = {
	args: {},
	render: () => (
		<Select>
			<SelectTrigger className="w-[180px]">Select a food</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Fruits</SelectLabel>
					<SelectItem value="apple">Apple</SelectItem>
					<SelectItem value="banana">Banana</SelectItem>
					<SelectItem value="orange">Orange</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Vegetables</SelectLabel>
					<SelectItem value="carrot">Carrot</SelectItem>
					<SelectItem value="potato">Potato</SelectItem>
					<SelectItem value="tomato">Tomato</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
}

export const SmallSize: Story = {
	args: {},
	render: () => (
		<Select>
			<SelectTrigger size="sm" className="w-[180px]">
				Select a fruit
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="orange">Orange</SelectItem>
			</SelectContent>
		</Select>
	),
}

export const Disabled: Story = {
	args: {},
	render: () => (
		<Select disabled>
			<SelectTrigger className="w-[180px]">Select a fruit</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
			</SelectContent>
		</Select>
	),
}
