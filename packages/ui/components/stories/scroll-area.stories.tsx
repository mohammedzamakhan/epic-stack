import { type Meta, type StoryObj } from '@storybook/react'
import { ScrollArea } from '../ui/scroll-area'

const meta = {
	title: 'Components/ScrollArea',
	component: ScrollArea,

	tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
			<div className="space-y-4">
				{[...Array(20)].map((_, i) => (
					<div key={i} className="text-sm">
						Item {i + 1}
					</div>
				))}
			</div>
		</ScrollArea>
	),
}

export const LongContent: Story = {
	render: () => (
		<ScrollArea className="h-[300px] w-[400px] rounded-md border p-4">
			<div className="space-y-2">
				<h3 className="font-semibold">Long Content</h3>
				{[...Array(50)].map((_, i) => (
					<p key={i} className="text-muted-foreground text-sm">
						This is line {i + 1} of scrollable content.
					</p>
				))}
			</div>
		</ScrollArea>
	),
}
