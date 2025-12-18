import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog'
import { Field, FieldLabel, FieldDescription } from '../ui/field'
import { Icon } from '../icon'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

const meta = {
	title: 'Components/Dialog',
	component: Dialog,

	tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger render={<Button>Open Dialog</Button>}></DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Dialog Title</DialogTitle>
					<DialogDescription>
						This is a dialog description. You can add any content here.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<p className="text-sm">Dialog content goes here.</p>
				</div>
			</DialogContent>
		</Dialog>
	),
}

export const WithForm: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger render={<Button>Edit Profile</Button>}></DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
					<DialogDescription>
						Make changes to your profile here. Click save when you're done.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input id="name" defaultValue="John Doe" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" defaultValue="john@example.com" />
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button>Save Changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
}

export const Confirmation: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger
				render={<Button variant="destructive">Delete Account</Button>}
			></DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Are you absolutely sure?</DialogTitle>
					<DialogDescription>
						This action cannot be undone. This will permanently delete your
						account and remove your data from our servers.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button variant="destructive">Delete</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
}

export const CreateNote: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger
				render={
					<Button>
						<Icon name="plus" />
						Create Note
					</Button>
				}
			></DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create New Note</DialogTitle>
					<DialogDescription>
						Create a new note to share with your team.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<Field>
						<FieldLabel htmlFor="note-title">Title</FieldLabel>
						<Input id="note-title" placeholder="Enter note title..." />
					</Field>
					<Field>
						<FieldLabel htmlFor="note-content">Content</FieldLabel>
						<Textarea
							id="note-content"
							placeholder="Write your note here..."
							className="min-h-32"
						/>
						<FieldDescription>
							Use markdown formatting for rich text.
						</FieldDescription>
					</Field>
				</div>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button>Create Note</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
}

export const InviteMember: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger
				render={
					<Button variant="secondary">
						<Icon name="user-plus" />
						Invite Member
					</Button>
				}
			></DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite Team Member</DialogTitle>
					<DialogDescription>
						Send an invitation to join your organization.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<Field>
						<FieldLabel htmlFor="invite-email">Email Address</FieldLabel>
						<Input
							id="invite-email"
							type="email"
							placeholder="colleague@example.com"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="invite-role">Role</FieldLabel>
						<select
							id="invite-role"
							className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none"
						>
							<option>Member</option>
							<option>Admin</option>
							<option>Viewer</option>
						</select>
						<FieldDescription>
							Choose the role for this team member.
						</FieldDescription>
					</Field>
				</div>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button>Send Invitation</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
}
