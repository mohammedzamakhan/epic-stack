import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet'

const meta = {
	title: 'Components/Sheet',
	component: Sheet,

	tags: ['autodocs'],
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const Right: Story = {
	args: {},
	render: () => (
		<Sheet>
			<SheetTrigger render={<Button>Open Sheet (Right)</Button>} />
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Sheet Title</SheetTitle>
					<SheetDescription>
						This is a sheet that slides in from the right side.
					</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm">Sheet content goes here.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
}

export const Left: Story = {
	args: {},
	render: () => (
		<Sheet>
			<SheetTrigger render={<Button>Open Sheet (Left)</Button>} />
			<SheetContent side="left">
				<SheetHeader>
					<SheetTitle>Sheet Title</SheetTitle>
					<SheetDescription>
						This is a sheet that slides in from the left side.
					</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm">Sheet content goes here.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
}

export const Top: Story = {
	args: {},
	render: () => (
		<Sheet>
			<SheetTrigger render={<Button>Open Sheet (Top)</Button>} />
			<SheetContent side="top">
				<SheetHeader>
					<SheetTitle>Sheet Title</SheetTitle>
					<SheetDescription>
						This is a sheet that slides in from the top.
					</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm">Sheet content goes here.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
}

export const Bottom: Story = {
	args: {},
	render: () => (
		<Sheet>
			<SheetTrigger render={<Button>Open Sheet (Bottom)</Button>} />
			<SheetContent side="bottom">
				<SheetHeader>
					<SheetTitle>Sheet Title</SheetTitle>
					<SheetDescription>
						This is a sheet that slides in from the bottom.
					</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm">Sheet content goes here.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
}

export const WithForm: Story = {
	args: {},
	render: () => (
		<Sheet>
			<SheetTrigger render={<Button>Edit Profile</Button>} />
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Edit Profile</SheetTitle>
					<SheetDescription>
						Make changes to your profile here. Click save when you're done.
					</SheetDescription>
				</SheetHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="sheet-name">Name</Label>
						<Input id="sheet-name" defaultValue="John Doe" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="sheet-email">Email</Label>
						<Input
							id="sheet-email"
							type="email"
							defaultValue="john@example.com"
						/>
					</div>
				</div>
				<SheetFooter>
					<SheetClose render={<Button variant="outline">Cancel</Button>} />
					<Button>Save Changes</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
}
