import { type Meta, type StoryObj } from '@storybook/react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

const meta = {
	title: 'Components/Popover',
	component: Popover,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger
				render={<Button variant="outline">Open Popover</Button>}
			></PopoverTrigger>
			<PopoverContent>
				<div className="space-y-2">
					<h4 className="font-medium">Popover Title</h4>
					<p className="text-muted-foreground text-sm">
						This is a popover with some content.
					</p>
				</div>
			</PopoverContent>
		</Popover>
	),
}

export const WithForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger
				render={<Button variant="outline">Dimensions</Button>}
			></PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium">Dimensions</h4>
						<p className="text-muted-foreground text-sm">
							Set the dimensions for the layer.
						</p>
					</div>
					<div className="grid gap-2">
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="width">Width</Label>
							<Input
								id="width"
								defaultValue="100%"
								className="col-span-2 h-8"
							/>
						</div>
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="height">Height</Label>
							<Input
								id="height"
								defaultValue="25px"
								className="col-span-2 h-8"
							/>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
}

export const Positions: Story = {
	render: () => (
		<div className="flex gap-4">
			<Popover>
				<PopoverTrigger
					render={<Button variant="outline">Top</Button>}
				></PopoverTrigger>
				<PopoverContent side="top">Popover on top</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger
					render={<Button variant="outline">Bottom</Button>}
				></PopoverTrigger>
				<PopoverContent side="bottom">Popover on bottom</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger
					render={<Button variant="outline">Left</Button>}
				></PopoverTrigger>
				<PopoverContent side="left">Popover on left</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger
					render={<Button variant="outline">Right</Button>}
				></PopoverTrigger>
				<PopoverContent side="right">Popover on right</PopoverContent>
			</Popover>
		</div>
	),
}
