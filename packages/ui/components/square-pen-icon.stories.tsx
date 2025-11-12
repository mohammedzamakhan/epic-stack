import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { Button } from './button';
import { SquarePenIcon, SquarePenIconHandle } from './square-pen-icon';

const meta = {
  title: 'Components/SquarePenIcon',
  component: SquarePenIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'number',
    },
  },
} satisfies Meta<typeof SquarePenIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 28,
  },
};

export const Interactive: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-center">
      <p className="text-sm text-muted-foreground">Hover over the icon to see the animation</p>
      <SquarePenIcon size={48} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <SquarePenIcon size={24} />
        <span className="text-xs">24px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SquarePenIcon size={32} />
        <span className="text-xs">32px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SquarePenIcon size={48} />
        <span className="text-xs">48px</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <SquarePenIcon size={64} />
        <span className="text-xs">64px</span>
      </div>
    </div>
  ),
};

export const WithColors: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <SquarePenIcon size={40} className="text-blue-600" />
      <SquarePenIcon size={40} className="text-green-600" />
      <SquarePenIcon size={40} className="text-red-600" />
      <SquarePenIcon size={40} className="text-purple-600" />
    </div>
  ),
};

export const ControlledAnimation: Story = {
  render: () => {
    const iconRef = useRef<SquarePenIconHandle>(null);

    return (
      <div className="flex flex-col gap-4 items-center">
        <SquarePenIcon ref={iconRef} size={48} />
        <div className="flex gap-2">
          <Button onClick={() => iconRef.current?.startAnimation()}>
            Start Animation
          </Button>
          <Button onClick={() => iconRef.current?.stopAnimation()} variant="outline">
            Stop Animation
          </Button>
        </div>
      </div>
    );
  },
};

export const InButton: Story = {
  render: () => (
    <Button className="gap-2">
      <SquarePenIcon size={20} />
      Edit Document
    </Button>
  ),
};

export const MultipleIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <SquarePenIcon size={32} />
      <SquarePenIcon size={32} />
      <SquarePenIcon size={32} />
      <SquarePenIcon size={32} />
      <SquarePenIcon size={32} />
      <SquarePenIcon size={32} />
    </div>
  ),
};
