import { type Meta, type StoryObj } from '@storybook/react'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../ui/table'

const meta = {
	title: 'Components/Table',
	component: Table,

	tags: ['autodocs'],
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>John Doe</TableCell>
					<TableCell>john@example.com</TableCell>
					<TableCell>Admin</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Jane Smith</TableCell>
					<TableCell>jane@example.com</TableCell>
					<TableCell>User</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Bob Johnson</TableCell>
					<TableCell>bob@example.com</TableCell>
					<TableCell>Editor</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
}

export const WithCaption: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of your recent users.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>John Doe</TableCell>
					<TableCell>john@example.com</TableCell>
					<TableCell>Admin</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Jane Smith</TableCell>
					<TableCell>jane@example.com</TableCell>
					<TableCell>User</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
}

export const WithFooter: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Product</TableHead>
					<TableHead>Quantity</TableHead>
					<TableHead>Price</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>Widget A</TableCell>
					<TableCell>10</TableCell>
					<TableCell>$100</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Widget B</TableCell>
					<TableCell>5</TableCell>
					<TableCell>$50</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
}
