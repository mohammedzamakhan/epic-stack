import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { Button } from './button';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const OnText: Story = {
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
};

export const Positions: Story = {
  render: () => (
    <div className="flex flex-col gap-12 items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Top (default)</Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex gap-12">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Left</Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tooltip on left</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Right</Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Tooltip on right</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon">
          ?
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Click here for help</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const RichContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">View Details</Button>
      </TooltipTrigger>
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
};

export const MultipleTooltips: Story = {
  render: () => (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            ✏️
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            🗑️
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            📋
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            💾
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Save</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const KeyboardShortcut: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Save</Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <span>Save file</span>
          <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">
            ⌘S
          </kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
};
