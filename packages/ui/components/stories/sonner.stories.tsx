import { type Meta, type StoryObj } from '@storybook/react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { EpicToaster as Toaster } from '../ui/sonner'

const meta = {
	title: 'Components/Toaster',
	component: Toaster,

	tags: ['autodocs'],
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	render: () => (
		<>
			<Button onClick={() => toast('This is a toast message')}>
				Show Toast
			</Button>
			<Toaster />
		</>
	),
}

export const Success: Story = {
	args: {},
	render: () => (
		<>
			<Button onClick={() => toast.success('Successfully saved!')}>
				Show Success Toast
			</Button>
			<Toaster />
		</>
	),
}

export const Error: Story = {
	args: {},
	render: () => (
		<>
			<Button onClick={() => toast.error('Something went wrong!')}>
				Show Error Toast
			</Button>
			<Toaster />
		</>
	),
}

export const Warning: Story = {
	args: {},
	render: () => (
		<>
			<Button onClick={() => toast.warning('This is a warning!')}>
				Show Warning Toast
			</Button>
			<Toaster />
		</>
	),
}

export const Info: Story = {
	args: {},
	render: () => (
		<>
			<Button onClick={() => toast.info('This is some information')}>
				Show Info Toast
			</Button>
			<Toaster />
		</>
	),
}

export const WithAction: Story = {
	args: {},
	render: () => (
		<>
			<Button
				onClick={() =>
					toast('Event has been created', {
						action: {
							label: 'Undo',
							onClick: () => toast('Undo clicked'),
						},
					})
				}
			>
				Show Toast with Action
			</Button>
			<Toaster />
		</>
	),
}

export const WithDescription: Story = {
	args: {},
	render: () => (
		<>
			<Button
				onClick={() =>
					toast('Event scheduled', {
						description:
							'Your event has been scheduled for tomorrow at 10:00 AM',
					})
				}
			>
				Show Toast with Description
			</Button>
			<Toaster />
		</>
	),
}

export const Loading: Story = {
	args: {},
	render: () => (
		<>
			<Button onClick={() => toast.loading('Loading...')}>
				Show Loading Toast
			</Button>
			<Toaster />
		</>
	),
}

export const AllTypes: Story = {
	args: {},
	render: () => (
		<>
			<div className="flex flex-col gap-2">
				<Button onClick={() => toast('Default toast')}>Default</Button>
				<Button onClick={() => toast.success('Success toast')}>Success</Button>
				<Button onClick={() => toast.error('Error toast')}>Error</Button>
				<Button onClick={() => toast.warning('Warning toast')}>Warning</Button>
				<Button onClick={() => toast.info('Info toast')}>Info</Button>
			</div>
			<Toaster />
		</>
	),
}
