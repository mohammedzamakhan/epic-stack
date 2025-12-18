import { type Meta, type StoryObj } from '@storybook/react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

const meta = {
	title: 'Components/Avatar',
	component: Avatar,

	tags: ['autodocs'],
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Avatar>
			<AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
			<AvatarFallback>CN</AvatarFallback>
		</Avatar>
	),
}

export const FallbackOnly: Story = {
	render: () => (
		<Avatar>
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	),
}

export const WithoutImage: Story = {
	render: () => (
		<Avatar>
			<AvatarImage src="https://invalid-url.com/image.jpg" alt="Avatar" />
			<AvatarFallback>AB</AvatarFallback>
		</Avatar>
	),
}

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Avatar className="size-8">
				<AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
				<AvatarFallback>SM</AvatarFallback>
			</Avatar>
			<Avatar className="size-10">
				<AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
				<AvatarFallback>MD</AvatarFallback>
			</Avatar>
			<Avatar className="size-12">
				<AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
				<AvatarFallback>LG</AvatarFallback>
			</Avatar>
			<Avatar className="size-16">
				<AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
				<AvatarFallback>XL</AvatarFallback>
			</Avatar>
		</div>
	),
}

export const Group: Story = {
	render: () => (
		<div className="flex -space-x-2">
			<Avatar className="border-background border-2">
				<AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
				<AvatarFallback>CN</AvatarFallback>
			</Avatar>
			<Avatar className="border-background border-2">
				<AvatarFallback>JD</AvatarFallback>
			</Avatar>
			<Avatar className="border-background border-2">
				<AvatarFallback>AB</AvatarFallback>
			</Avatar>
			<Avatar className="border-background border-2">
				<AvatarFallback>+3</AvatarFallback>
			</Avatar>
		</div>
	),
}
