import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const meta = {
	title: 'Components/Tooltip',
	component: Tooltip,

	tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	render: () => (
		<Tooltip>
			<TooltipTrigger render={<Button variant="outline">Hover me</Button>} />
			<TooltipContent>
				<p>This is a tooltip</p>
			</TooltipContent>
		</Tooltip>
	),
}

export const OnText: Story = {
	args: {},
	render: () => (
		<div className="text-center">
			<p>
				Hover over{' '}
				<Tooltip>
					<TooltipTrigger className="underline decoration-dotted">
						this text
					</TooltipTrigger>
					<TooltipContent>
						<p>Additional information appears here</p>
					</TooltipContent>
				</Tooltip>{' '}
				to see the tooltip.
			</p>
		</div>
	),
}

export const Positions: Story = {
	args: {},
	render: () => (
		<div className="flex flex-col items-center gap-12">
			<Tooltip>
				<TooltipTrigger
					render={<Button variant="outline">Top (default)</Button>}
				/>
				<TooltipContent side="top">
					<p>Tooltip on top</p>
				</TooltipContent>
			</Tooltip>

			<div className="flex gap-12">
				<Tooltip>
					<TooltipTrigger render={<Button variant="outline">Left</Button>} />
					<TooltipContent side="left">
						<p>Tooltip on left</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger render={<Button variant="outline">Right</Button>} />
					<TooltipContent side="right">
						<p>Tooltip on right</p>
					</TooltipContent>
				</Tooltip>
			</div>

			<Tooltip>
				<TooltipTrigger render={<Button variant="outline">Bottom</Button>} />
				<TooltipContent side="bottom">
					<p>Tooltip on bottom</p>
				</TooltipContent>
			</Tooltip>
		</div>
	),
}

export const WithIcon: Story = {
	args: {},
	render: () => (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button variant="outline" size="icon">
						?
					</Button>
				}
			/>
			<TooltipContent>
				<p>Click here for help</p>
			</TooltipContent>
		</Tooltip>
	),
}

export const RichContent: Story = {
	args: {},
	render: () => (
		<Tooltip>
			<TooltipTrigger
				render={<Button variant="outline">View Details</Button>}
			/>
			<TooltipContent className="max-w-xs">
				<div className="space-y-2">
					<p className="font-semibold">User Information</p>
					<p className="text-xs">
						This section contains detailed information about the user profile,
						including their settings and preferences.
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
	),
}

export const MultipleTooltips: Story = {
	args: {},
	render: () => (
		<div className="flex gap-2">
			<Tooltip>
				<TooltipTrigger
					render={
						<Button variant="outline" size="icon">
							✏️
						</Button>
					}
				/>
				<TooltipContent>
					<p>Edit</p>
				</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger
					render={
						<Button variant="outline" size="icon">
							🗑️
						</Button>
					}
				/>
				<TooltipContent>
					<p>Delete</p>
				</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger
					render={
						<Button variant="outline" size="icon">
							📋
						</Button>
					}
				/>
				<TooltipContent>
					<p>Copy</p>
				</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger
					render={
						<Button variant="outline" size="icon">
							💾
						</Button>
					}
				/>
				<TooltipContent>
					<p>Save</p>
				</TooltipContent>
			</Tooltip>
		</div>
	),
}

export const KeyboardShortcut: Story = {
	args: {},
	render: () => (
		<Tooltip>
			<TooltipTrigger render={<Button variant="outline">Save</Button>} />
			<TooltipContent>
				<div className="flex items-center gap-2">
					<span>Save file</span>
					<kbd className="bg-muted rounded border px-1.5 py-0.5 text-xs">
						⌘S
					</kbd>
				</div>
			</TooltipContent>
		</Tooltip>
	),
}
