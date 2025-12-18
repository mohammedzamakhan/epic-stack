import { type Meta, type StoryObj } from '@storybook/react'
import { Input } from '../ui/input'

const meta = {
	title: 'Components/Input',
	component: Input,

	tags: ['autodocs'],
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
		},
		disabled: {
			control: 'boolean',
		},
		placeholder: {
			control: 'text',
		},
	},
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		placeholder: 'Enter text...',
		type: 'text',
	},
}

export const Email: Story = {
	args: {
		type: 'email',
		placeholder: 'Enter your email',
	},
}

export const Password: Story = {
	args: {
		type: 'password',
		placeholder: 'Enter password',
	},
}

export const Disabled: Story = {
	args: {
		placeholder: 'Disabled input',
		disabled: true,
	},
}

export const WithValue: Story = {
	args: {
		value: 'Hello World',
		placeholder: 'Enter text...',
	},
}

export const Search: Story = {
	args: {
		type: 'search',
		placeholder: 'Search...',
	},
}

export const Number: Story = {
	args: {
		type: 'number',
		placeholder: 'Enter a number',
	},
}

export const FormExample: Story = {
	render: () => (
		<form className="w-[350px] space-y-4">
			<div className="space-y-2">
				<label htmlFor="name" className="text-sm font-medium">
					Name
				</label>
				<Input id="name" placeholder="John Doe" />
			</div>
			<div className="space-y-2">
				<label htmlFor="email" className="text-sm font-medium">
					Email
				</label>
				<Input id="email" type="email" placeholder="john@example.com" />
			</div>
			<div className="space-y-2">
				<label htmlFor="password" className="text-sm font-medium">
					Password
				</label>
				<Input id="password" type="password" placeholder="••••••••" />
			</div>
		</form>
	),
}
