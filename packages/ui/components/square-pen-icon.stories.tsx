import type { Meta, StoryObj } from '@storybook/react';
import { SquarePenIcon } from './square-pen-icon';
import { useRef } from 'react';
import { Button } from './button';
import type { SquarePenIconHandle } from './square-pen-icon';

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

export const Large: Story = {
  args: {
    size: 48,
  },
};

export const Small: Story = {
  args: {
    size: 20,
  },
};

export const WithHoverEffect: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SquarePenIcon size={32} />
      <p className="text-sm text-muted-foreground">Hover over the icon</p>
    </div>
  ),
};

export const ControlledAnimation: Story = {
  render: () => {
    const iconRef = useRef<SquarePenIconHandle>(null);

    return (
      <div className="flex flex-col items-center gap-4">
        <SquarePenIcon ref={iconRef} size={32} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => iconRef.current?.startAnimation()}>
            Start Animation
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => iconRef.current?.stopAnimation()}
          >
            Stop Animation
          </Button>
        </div>
      </div>
    );
  },
};
