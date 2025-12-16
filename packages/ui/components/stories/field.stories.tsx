import { type Meta, type StoryObj } from '@storybook/react'
import { Checkbox } from '../ui/checkbox'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
} from '../ui/field'
import { Input } from '../ui/input'

const meta = {
	title: 'Components/Field',
	component: Field,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Field className="w-80">
			<FieldLabel htmlFor="name">Name</FieldLabel>
			<Input id="name" placeholder="Enter your name" />
			<FieldDescription>Please enter your full name.</FieldDescription>
		</Field>
	),
}

export const WithError: Story = {
	render: () => (
		<Field className="w-80">
			<FieldLabel htmlFor="email">Email</FieldLabel>
			<Input id="email" placeholder="Enter your email" aria-invalid="true" />
			<FieldError>Please enter a valid email address.</FieldError>
		</Field>
	),
}

export const Horizontal: Story = {
	render: () => (
		<Field orientation="horizontal" className="w-80">
			<FieldLabel htmlFor="username">Username</FieldLabel>
			<Input id="username" placeholder="Enter username" />
		</Field>
	),
}

export const WithFieldSet: Story = {
	render: () => (
		<FieldSet className="w-80">
			<FieldLegend>Personal Information</FieldLegend>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="first-name">First Name</FieldLabel>
					<Input id="first-name" placeholder="John" />
				</Field>
				<Field>
					<FieldLabel htmlFor="last-name">Last Name</FieldLabel>
					<Input id="last-name" placeholder="Doe" />
				</Field>
			</FieldGroup>
		</FieldSet>
	),
}

export const WithSeparator: Story = {
	render: () => (
		<FieldSet className="w-80">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="field1">Field 1</FieldLabel>
					<Input id="field1" />
				</Field>
				<FieldSeparator>Or</FieldSeparator>
				<Field>
					<FieldLabel htmlFor="field2">Field 2</FieldLabel>
					<Input id="field2" />
				</Field>
			</FieldGroup>
		</FieldSet>
	),
}

export const WithCheckbox: Story = {
	render: () => (
		<Field orientation="horizontal" className="w-80">
			<Checkbox id="terms" />
			<FieldContent>
				<FieldLabel htmlFor="terms">Accept terms and conditions</FieldLabel>
				<FieldDescription>
					You agree to our Terms of Service and Privacy Policy.
				</FieldDescription>
			</FieldContent>
		</Field>
	),
}

export const ProfileForm: Story = {
	render: () => (
		<FieldSet className="w-full max-w-lg">
			<FieldLegend>Profile Settings</FieldLegend>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="profile-username">Username</FieldLabel>
					<Input
						id="profile-username"
						placeholder="john_doe"
						defaultValue="john_doe"
					/>
					<FieldDescription>
						This is your public display name. It can be your real name or a
						pseudonym.
					</FieldDescription>
				</Field>
				<Field>
					<FieldLabel htmlFor="profile-name">Full Name</FieldLabel>
					<Input
						id="profile-name"
						placeholder="John Doe"
						defaultValue="John Doe"
					/>
				</Field>
				<Field data-invalid="true">
					<FieldLabel htmlFor="profile-email">Email</FieldLabel>
					<Input
						id="profile-email"
						type="email"
						placeholder="john@example.com"
						defaultValue="invalid-email"
						aria-invalid="true"
					/>
					<FieldError>Please enter a valid email address.</FieldError>
				</Field>
			</FieldGroup>
		</FieldSet>
	),
}

export const LoginForm: Story = {
	render: () => (
		<div className="w-full max-w-md space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Welcome back</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					Enter your credentials to access your account
				</p>
			</div>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="login-email">Email</FieldLabel>
					<Input id="login-email" type="email" placeholder="you@example.com" />
				</Field>
				<Field>
					<FieldLabel htmlFor="login-password">Password</FieldLabel>
					<Input
						id="login-password"
						type="password"
						placeholder="Enter your password"
					/>
				</Field>
				<Field orientation="horizontal">
					<Checkbox id="remember" />
					<FieldContent>
						<FieldLabel htmlFor="remember">Remember me</FieldLabel>
					</FieldContent>
				</Field>
			</FieldGroup>
		</div>
	),
}
