import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './icon';

const meta = {
  title: 'Components/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['font', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'check',
  },
};

export const Sizes: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-4">
      <Icon name="check" size="xs" />
      <Icon name="check" size="sm" />
      <Icon name="check" size="md" />
      <Icon name="check" size="lg" />
      <Icon name="check" size="xl" />
    </div>
  ),
};

export const FontSize: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        <Icon name="check" /> Small text with icon
      </p>
      <p className="text-base">
        <Icon name="check" /> Normal text with icon
      </p>
      <p className="text-lg">
        <Icon name="check" /> Large text with icon
      </p>
      <p className="text-2xl">
        <Icon name="check" /> Extra large text with icon
      </p>
    </div>
  ),
};

export const WithChildren: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-4">
      <Icon name="check" size="sm">
        Task completed
      </Icon>
      <Icon name="calendar" size="md">
        Schedule meeting
      </Icon>
      <Icon name="folder" size="lg">
        Documents folder
      </Icon>
    </div>
  ),
};

export const CommonIcons: Story = {
  args: {},
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      <div className="flex flex-col items-center gap-2">
        <Icon name="check" size="lg" />
        <span className="text-xs">check</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="x" size="lg" />
        <span className="text-xs">x</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="plus" size="lg" />
        <span className="text-xs">plus</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="pencil" size="lg" />
        <span className="text-xs">pencil</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="trash-2" size="lg" />
        <span className="text-xs">trash-2</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="gear" size="lg" />
        <span className="text-xs">gear</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="search" size="lg" />
        <span className="text-xs">search</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="calendar" size="lg" />
        <span className="text-xs">calendar</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="folder" size="lg" />
        <span className="text-xs">folder</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="file-text" size="lg" />
        <span className="text-xs">file-text</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="person" size="lg" />
        <span className="text-xs">person</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Icon name="mail" size="lg" />
        <span className="text-xs">mail</span>
      </div>
    </div>
  ),
};

export const WithCustomStyles: Story = {
  args: {},
  render: () => (
    <div className="flex gap-4">
      <Icon name="check" size="lg" className="text-green-600" />
      <Icon name="x" size="lg" className="text-red-600" />
      <Icon name="alert-triangle" size="lg" className="text-yellow-600" />
      <Icon name="help-circle" size="lg" className="text-blue-600" />
    </div>
  ),
};

export const WithTitle: Story = {
  args: {},
  render: () => (
    <Icon name="check" size="lg" title="This task is completed" />
  ),
};

export const InButtons: Story = {
  args: {},
  render: () => (
    <div className="flex gap-2">
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md">
        <Icon name="check" size="sm" />
        Confirm
      </button>
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md">
        <Icon name="trash-2" size="sm" />
        Delete
      </button>
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md">
        <Icon name="pencil" size="sm" />
        Edit
      </button>
    </div>
  ),
};
