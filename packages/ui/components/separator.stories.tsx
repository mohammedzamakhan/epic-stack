import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';

const meta = {
  title: 'Components/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    className: 'w-[300px]',
  },
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center space-x-4">
      <span>Item 1</span>
      <Separator orientation="vertical" />
      <span>Item 2</span>
      <Separator orientation="vertical" />
      <span>Item 3</span>
    </div>
  ),
};

export const InContent: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <h2 className="text-lg font-semibold">Section Title</h2>
      <p className="text-sm text-muted-foreground">
        This is some content above the separator.
      </p>
      <Separator />
      <p className="text-sm text-muted-foreground">
        This is some content below the separator.
      </p>
    </div>
  ),
};

export const InNavigation: Story = {
  render: () => (
    <div className="w-[300px] space-y-1">
      <div className="p-2 hover:bg-accent rounded-md cursor-pointer">
        Profile
      </div>
      <div className="p-2 hover:bg-accent rounded-md cursor-pointer">
        Settings
      </div>
      <Separator className="my-2" />
      <div className="p-2 hover:bg-accent rounded-md cursor-pointer">
        Help
      </div>
      <div className="p-2 hover:bg-accent rounded-md cursor-pointer text-destructive">
        Logout
      </div>
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="w-[400px]">
      <div className="relative">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-background px-2 text-xs text-muted-foreground">
            OR
          </span>
        </div>
      </div>
    </div>
  ),
};

export const Card: Story = {
  render: () => (
    <div className="w-[350px] border rounded-lg p-6">
      <div className="space-y-1">
        <h3 className="font-semibold">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences
        </p>
      </div>
      <Separator className="my-4" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Email notifications</span>
          <span className="text-sm text-muted-foreground">Enabled</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Two-factor auth</span>
          <span className="text-sm text-muted-foreground">Disabled</span>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="flex gap-2">
        <button className="flex-1 px-4 py-2 text-sm border rounded-md">
          Cancel
        </button>
        <button className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md">
          Save
        </button>
      </div>
    </div>
  ),
};
