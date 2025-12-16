import { type Meta, type StoryObj } from '@storybook/react'
import {
	REGEXP_ONLY_DIGITS,
	REGEXP_ONLY_CHARS,
	REGEXP_ONLY_DIGITS_AND_CHARS,
} from 'input-otp'
import { Field, FieldLabel, FieldError, FieldDescription } from '../ui/field'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from '../ui/input-otp'

const meta = {
	title: 'Components/InputOTP',
	component: InputOTP,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof InputOTP>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<InputOTP maxLength={6}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
}

export const WithSeparator: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<InputOTP maxLength={6}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
			</InputOTPGroup>
			<InputOTPSeparator />
			<InputOTPGroup>
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
}

export const DigitsOnly: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
}

export const CharsOnly: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<InputOTP maxLength={6} pattern={REGEXP_ONLY_CHARS}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
}

export const Disabled: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<InputOTP maxLength={6} disabled>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
				<InputOTPSlot index={4} />
				<InputOTPSlot index={5} />
			</InputOTPGroup>
		</InputOTP>
	),
}

export const WithField: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<Field className="w-auto">
			<FieldLabel htmlFor="otp-field">Verification Code</FieldLabel>
			<InputOTP
				id="otp-field"
				maxLength={6}
				pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
			>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
			<FieldDescription>
				Enter the 6-digit verification code sent to your email.
			</FieldDescription>
		</Field>
	),
}

export const TwoFactorAuth: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<div className="max-w-md space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					Enter the code from your authenticator app
				</p>
			</div>
			<Field className="w-auto">
				<FieldLabel htmlFor="2fa-code">Authentication Code</FieldLabel>
				<InputOTP id="2fa-code" maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
					</InputOTPGroup>
					<InputOTPSeparator />
					<InputOTPGroup>
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
				<FieldDescription>Your code expires in 30 seconds</FieldDescription>
			</Field>
		</div>
	),
}

export const WithError: Story = {
	args: {
		maxLength: 6,
		children: <></>,
	},
	render: () => (
		<Field className="w-auto" data-invalid="true">
			<FieldLabel htmlFor="otp-error">Verification Code</FieldLabel>
			<InputOTP
				id="otp-error"
				maxLength={6}
				pattern={REGEXP_ONLY_DIGITS}
				aria-invalid="true"
			>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
			<FieldError>Invalid code. Please try again.</FieldError>
		</Field>
	),
}
