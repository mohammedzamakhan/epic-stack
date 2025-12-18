import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'

const meta = {
	title: 'Components/DropdownMenu',
	component: DropdownMenu,
	tags: ['autodocs'],
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button>Open Menu</Button>} />
			<DropdownMenuContent>
				<DropdownMenuItem>Profile</DropdownMenuItem>
				<DropdownMenuItem>Settings</DropdownMenuItem>
				<DropdownMenuItem>Team</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>Logout</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}

export const WithLabels: Story = {
	args: {},
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button>Open Menu</Button>} />
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>Profile</DropdownMenuItem>
				<DropdownMenuItem>Billing</DropdownMenuItem>
				<DropdownMenuItem>Settings</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}

export const WithShortcuts: Story = {
	args: {},
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button>Open Menu</Button>} />
			<DropdownMenuContent className="w-56">
				<DropdownMenuItem>
					New Tab
					<DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					New Window
					<DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					Save
					<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}

export const WithCheckboxes: Story = {
	args: {},
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button>View Options</Button>} />
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>View</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem checked>
					Show Toolbar
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem>Show Sidebar</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem>Show Status Bar</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}

export const WithRadioGroup: Story = {
	args: {},
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button>Select Theme</Button>} />
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>Theme</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value="light">
					<DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}

export const WithSubmenu: Story = {
	args: {},
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button>Open Menu</Button>} />
			<DropdownMenuContent className="w-56">
				<DropdownMenuItem>Profile</DropdownMenuItem>
				<DropdownMenuItem>Settings</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>Share</DropdownMenuItem>
						<DropdownMenuItem>Duplicate</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>Archive</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem>Logout</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}

export const Destructive: Story = {
	args: {},
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button>Actions</Button>} />
			<DropdownMenuContent className="w-56">
				<DropdownMenuItem>Edit</DropdownMenuItem>
				<DropdownMenuItem>Duplicate</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}
