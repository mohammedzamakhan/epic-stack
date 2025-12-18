import { type Meta, type StoryObj } from '@storybook/react'
import { useState } from 'react'
import { StatusButton } from '../status-button'

const meta = {
	title: 'Components/StatusButton',
	component: StatusButton,

	tags: ['autodocs'],
	argTypes: {
		status: {
			control: 'select',
			options: ['idle', 'pending', 'success', 'error'],
		},
	},
} satisfies Meta<typeof StatusButton>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
	args: {
		status: 'idle',
		children: 'Submit',
	},
}

export const Pending: Story = {
	args: {
		status: 'pending',
		children: 'Submit',
		pendingText: 'Submitting...',
	},
}

export const Success: Story = {
	args: {
		status: 'success',
		children: 'Submit',
		successText: 'Submitted!',
	},
}

export const Error: Story = {
	args: {
		status: 'error',
		children: 'Submit',
		errorText: 'Failed',
	},
}

export const WithMessage: Story = {
	args: {
		status: 'success',
		children: 'Save',
		message: 'Changes saved successfully',
	},
}

export const Interactive: Story = {
	args: {
		status: 'idle',
		children: 'Submit Form',
	},
	render: () => {
		const [status, setStatus] = useState<
			'idle' | 'pending' | 'success' | 'error'
		>('idle')

		const handleClick = () => {
			setStatus('pending')
			setTimeout(() => {
				setStatus(Math.random() > 0.5 ? 'success' : 'error')
			}, 2000)
		}

		return (
			<StatusButton
				status={status}
				onClick={handleClick}
				onStatusChange={(newStatus) => setStatus(newStatus)}
			>
				Submit Form
			</StatusButton>
		)
	},
}
