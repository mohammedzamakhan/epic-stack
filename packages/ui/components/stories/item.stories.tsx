import { type Meta, type StoryObj } from '@storybook/react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Icon } from '../icon'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from '../ui/item'

const meta = {
	title: 'Components/Item',
	component: Item,

	tags: ['autodocs'],
} satisfies Meta<typeof Item>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<div className="w-96">
			<Item>
				<ItemContent>
					<ItemTitle>Item Title</ItemTitle>
					<ItemDescription>This is a description of the item.</ItemDescription>
				</ItemContent>
			</Item>
		</div>
	),
}

export const WithIcon: Story = {
	render: () => (
		<div className="w-96">
			<Item>
				<ItemMedia variant="icon">
					<Icon name="mail" />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Messages</ItemTitle>
					<ItemDescription>You have 3 unread messages</ItemDescription>
				</ItemContent>
			</Item>
		</div>
	),
}

export const WithActions: Story = {
	render: () => (
		<div className="w-96">
			<Item>
				<ItemContent>
					<ItemTitle>Project Name</ItemTitle>
					<ItemDescription>Last updated 2 hours ago</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button size="sm" variant="ghost">
						<Icon name="more-horizontal" />
					</Button>
				</ItemActions>
			</Item>
		</div>
	),
}

export const WithBadge: Story = {
	render: () => (
		<div className="w-96">
			<Item>
				<ItemMedia variant="icon">
					<Icon name="folder" />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Documents</ItemTitle>
					<ItemDescription>24 files</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Badge variant="secondary">New</Badge>
				</ItemActions>
			</Item>
		</div>
	),
}

export const GroupedItems: Story = {
	render: () => (
		<div className="w-96">
			<ItemGroup>
				<Item variant="outline">
					<ItemMedia variant="icon">
						<Icon name="mail" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Inbox</ItemTitle>
						<ItemDescription>12 new messages</ItemDescription>
					</ItemContent>
				</Item>
				<ItemSeparator />
				<Item variant="outline">
					<ItemMedia variant="icon">
						<Icon name="send" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Sent</ItemTitle>
						<ItemDescription>45 sent messages</ItemDescription>
					</ItemContent>
				</Item>
				<ItemSeparator />
				<Item variant="outline">
					<ItemMedia variant="icon">
						<Icon name="trash-2" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>Trash</ItemTitle>
						<ItemDescription>3 items</ItemDescription>
					</ItemContent>
				</Item>
			</ItemGroup>
		</div>
	),
}

export const SmallSize: Story = {
	render: () => (
		<div className="w-96">
			<Item size="sm">
				<ItemMedia variant="icon">
					<Icon name="user" />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>John Doe</ItemTitle>
				</ItemContent>
			</Item>
		</div>
	),
}

export const MutedVariant: Story = {
	render: () => (
		<div className="w-96">
			<Item variant="muted">
				<ItemContent>
					<ItemTitle>Muted Item</ItemTitle>
					<ItemDescription>This item has a muted background</ItemDescription>
				</ItemContent>
			</Item>
		</div>
	),
}
