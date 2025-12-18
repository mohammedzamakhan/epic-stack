import { type Meta, type StoryObj } from '@storybook/react'
import { Kbd, KbdGroup } from '../ui/kbd'

const meta = {
	title: 'Components/Kbd',
	component: Kbd,

	tags: ['autodocs'],
} satisfies Meta<typeof Kbd>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => <Kbd>⌘</Kbd>,
}

export const SingleKeys: Story = {
	render: () => (
		<div className="flex gap-2">
			<Kbd>⌘</Kbd>
			<Kbd>Shift</Kbd>
			<Kbd>Ctrl</Kbd>
			<Kbd>Alt</Kbd>
			<Kbd>Enter</Kbd>
			<Kbd>Esc</Kbd>
		</div>
	),
}

export const KeyCombinations: Story = {
	render: () => (
		<div className="flex flex-col gap-2">
			<KbdGroup>
				<Kbd>⌘</Kbd>
				<span className="text-muted-foreground">+</span>
				<Kbd>K</Kbd>
			</KbdGroup>
			<KbdGroup>
				<Kbd>Ctrl</Kbd>
				<span className="text-muted-foreground">+</span>
				<Kbd>Shift</Kbd>
				<span className="text-muted-foreground">+</span>
				<Kbd>P</Kbd>
			</KbdGroup>
			<KbdGroup>
				<Kbd>Alt</Kbd>
				<span className="text-muted-foreground">+</span>
				<Kbd>Tab</Kbd>
			</KbdGroup>
		</div>
	),
}

export const InText: Story = {
	render: () => (
		<p className="text-sm">
			Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to open the command palette, or{' '}
			<Kbd>Esc</Kbd> to close it.
		</p>
	),
}

export const ShortcutsList: Story = {
	render: () => (
		<div className="w-[400px] space-y-2 text-sm">
			<div className="flex items-center justify-between">
				<span>Copy</span>
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<span className="text-muted-foreground">+</span>
					<Kbd>C</Kbd>
				</KbdGroup>
			</div>
			<div className="flex items-center justify-between">
				<span>Paste</span>
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<span className="text-muted-foreground">+</span>
					<Kbd>V</Kbd>
				</KbdGroup>
			</div>
			<div className="flex items-center justify-between">
				<span>Save</span>
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<span className="text-muted-foreground">+</span>
					<Kbd>S</Kbd>
				</KbdGroup>
			</div>
			<div className="flex items-center justify-between">
				<span>Undo</span>
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<span className="text-muted-foreground">+</span>
					<Kbd>Z</Kbd>
				</KbdGroup>
			</div>
		</div>
	),
}
