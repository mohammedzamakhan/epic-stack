import type { Meta, StoryObj } from '@storybook/react';
import { PrioritySignal } from './priority-signal';

const meta = {
  title: 'Components/PrioritySignal',
  component: PrioritySignal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    priority: {
      control: 'select',
      options: ['low', 'medium', 'high'],
    },
    theme: {
      control: 'select',
      options: ['light', 'dark'],
    },
  },
} satisfies Meta<typeof PrioritySignal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Low: Story = {
  args: {
    priority: 'low',
  },
};

export const Medium: Story = {
  args: {
    priority: 'medium',
  },
};

export const High: Story = {
  args: {
    priority: 'high',
  },
};

export const AllPriorities: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <PrioritySignal priority="low" />
        <span className="text-sm">Low</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PrioritySignal priority="medium" />
        <span className="text-sm">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PrioritySignal priority="high" />
        <span className="text-sm">High</span>
      </div>
    </div>
  ),
};

export const WithLabels: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <PrioritySignal priority="low" />
        <span className="text-sm">Low priority task</span>
      </div>
      <div className="flex items-center gap-2">
        <PrioritySignal priority="medium" />
        <span className="text-sm">Medium priority task</span>
      </div>
      <div className="flex items-center gap-2">
        <PrioritySignal priority="high" />
        <span className="text-sm">High priority task</span>
      </div>
    </div>
  ),
};

export const InList: Story = {
  args: {},
  render: () => (
    <div className="w-96 space-y-2">
      {[
        { title: 'Fix critical bug', priority: 'high' as const },
        { title: 'Update documentation', priority: 'low' as const },
        { title: 'Implement new feature', priority: 'medium' as const },
        { title: 'Review pull request', priority: 'medium' as const },
        { title: 'Deploy to production', priority: 'high' as const },
      ].map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50"
        >
          <PrioritySignal priority={item.priority} />
          <span className="text-sm">{item.title}</span>
        </div>
      ))}
    </div>
  ),
};

export const LargeSizes: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <PrioritySignal priority="low" className="w-8 h-8" />
        <span className="text-sm">Large Low</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PrioritySignal priority="medium" className="w-8 h-8" />
        <span className="text-sm">Large Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PrioritySignal priority="high" className="w-8 h-8" />
        <span className="text-sm">Large High</span>
      </div>
    </div>
  ),
};

export const DarkTheme: Story = {
  args: {},
  render: () => (
    <div className="bg-slate-900 p-8 rounded-lg">
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <PrioritySignal priority="low" theme="dark" />
          <span className="text-sm text-white">Low</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <PrioritySignal priority="medium" theme="dark" />
          <span className="text-sm text-white">Medium</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <PrioritySignal priority="high" theme="dark" />
          <span className="text-sm text-white">High</span>
        </div>
      </div>
    </div>
  ),
};
