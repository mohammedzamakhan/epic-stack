import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const meta = {
	title: 'Components/Drawer',
	component: Drawer,
	tags: ['autodocs'],
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger>
				<Button>Open Drawer</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Drawer Title</DrawerTitle>
					<DrawerDescription>
						This is a drawer description. You can add any content here.
					</DrawerDescription>
				</DrawerHeader>
				<div className="p-4">
					<p className="text-sm">Drawer content goes here.</p>
				</div>
				<DrawerFooter>
					<DrawerClose>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
}

export const WithForm: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger>
				<Button>Edit Profile</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Edit Profile</DrawerTitle>
					<DrawerDescription>
						Make changes to your profile here. Click save when you're done.
					</DrawerDescription>
				</DrawerHeader>
				<div className="grid gap-4 p-4">
					<div className="grid gap-2">
						<Label htmlFor="drawer-name">Name</Label>
						<Input id="drawer-name" defaultValue="John Doe" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="drawer-email">Email</Label>
						<Input
							id="drawer-email"
							type="email"
							defaultValue="john@example.com"
						/>
					</div>
				</div>
				<DrawerFooter>
					<Button>Save Changes</Button>
					<DrawerClose>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
}

export const Confirmation: Story = {
	render: () => (
		<Drawer>
			<DrawerTrigger>
				<Button variant="destructive">Delete Account</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Are you absolutely sure?</DrawerTitle>
					<DrawerDescription>
						This action cannot be undone. This will permanently delete your
						account and remove your data from our servers.
					</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter>
					<Button variant="destructive">Delete</Button>
					<DrawerClose>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	),
}
