import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '../ui/card'

const meta = {
	title: 'Components/Card',
	component: Card,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card description goes here.</CardDescription>
			</CardHeader>
			<CardContent></CardContent>
		</Card>
	),
}

export const WithFooter: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Create project</CardTitle>
				<CardDescription>Deploy your new project in one-click.</CardDescription>
			</CardHeader>
			<CardContent></CardContent>
			<CardFooter className="flex justify-between">
				<Button variant="outline">Cancel</Button>
				<Button>Deploy</Button>
			</CardFooter>
		</Card>
	),
}

export const WithContent: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Notifications</CardTitle>
				<CardDescription>You have 3 unread messages.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="flex items-center gap-4 text-sm">
						<div className="font-semibold">Push Notifications</div>
						<div className="text-muted-foreground ml-auto">Enabled</div>
					</div>
					<div className="flex items-center gap-4 text-sm">
						<div className="font-semibold">Email Notifications</div>
						<div className="text-muted-foreground ml-auto">Disabled</div>
					</div>
					<div className="flex items-center gap-4 text-sm">
						<div className="font-semibold">SMS Notifications</div>
						<div className="text-muted-foreground ml-auto">Enabled</div>
					</div>
				</div>
			</CardContent>
		</Card>
	),
}

export const Grid: Story = {
	render: () => (
		<div className="grid max-w-4xl grid-cols-2 gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Revenue</CardTitle>
					<CardDescription>Total revenue this month</CardDescription>
				</CardHeader>
				<CardContent>
					<div>
						<div className="text-2xl font-bold">$45,231.89</div>
						<p className="text-muted-foreground text-xs">
							+20.1% from last month
						</p>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Sales</CardTitle>
					<CardDescription>Total sales this month</CardDescription>
				</CardHeader>
				<CardContent>
					<div>
						<div className="text-2xl font-bold">+12,234</div>
						<p className="text-muted-foreground text-xs">
							+19% from last month
						</p>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Active Users</CardTitle>
					<CardDescription>Current active users</CardDescription>
				</CardHeader>
				<CardContent>
					<div>
						<div className="text-2xl font-bold">+573</div>
						<p className="text-muted-foreground text-xs">
							+201 since last hour
						</p>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Conversion Rate</CardTitle>
					<CardDescription>Overall conversion rate</CardDescription>
				</CardHeader>
				<CardContent>
					<div>
						<div className="text-2xl font-bold">24.5%</div>
						<p className="text-muted-foreground text-xs">
							+4.2% from last month
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	),
}

export const UpgradePrompt: Story = {
	render: () => (
		<Card className="bg-accent border-border w-[350px]">
			<CardHeader className="p-4">
				<CardDescription>
					There are <span className="font-bold text-red-400">7 days</span> left
					in your trial. Get in touch with questions or feedback.
				</CardDescription>
			</CardHeader>
			<CardContent className="-mt-2 flex flex-col gap-2 p-4 pt-0">
				<Button variant="secondary" size="sm" className="w-full">
					Upgrade Now
				</Button>
				<Button variant="link" size="sm" className="w-full">
					Get in touch
				</Button>
			</CardContent>
		</Card>
	),
}

export const SettingsCard: Story = {
	render: () => (
		<Card className="w-[450px]">
			<CardHeader>
				<CardTitle>Account Settings</CardTitle>
				<CardDescription>
					Manage your account preferences and settings
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">Email Notifications</p>
						<p className="text-muted-foreground text-xs">
							Receive emails about your account activity
						</p>
					</div>
					<Button variant="outline" size="sm">
						Configure
					</Button>
				</div>
				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">Two-Factor Authentication</p>
						<p className="text-muted-foreground text-xs">
							Add an extra layer of security
						</p>
					</div>
					<Button variant="outline" size="sm">
						Enable
					</Button>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button>Save Changes</Button>
			</CardFooter>
		</Card>
	),
}
