import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';
import { Button } from './button';
import { EpicToaster } from './sonner';

const meta = {
  title: 'Components/Sonner',
  component: EpicToaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EpicToaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <Button onClick={() => toast('This is a toast message')}>
        Show Toast
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const Success: Story = {
  render: () => (
    <div>
      <Button onClick={() => toast.success('Success! Your changes have been saved.')}>
        Show Success Toast
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div>
      <Button onClick={() => toast.error('Error! Something went wrong.')}>
        Show Error Toast
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const Warning: Story = {
  render: () => (
    <div>
      <Button onClick={() => toast.warning('Warning! Please review your changes.')}>
        Show Warning Toast
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const Info: Story = {
  render: () => (
    <div>
      <Button onClick={() => toast.info('Info: New updates are available.')}>
        Show Info Toast
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div>
      <Button
        onClick={() =>
          toast('Event has been created', {
            description: 'Sunday, December 03, 2023 at 9:00 AM',
          })
        }
      >
        Show Toast with Description
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <div>
      <Button
        onClick={() =>
          toast('Event has been created', {
            action: {
              label: 'Undo',
              onClick: () => toast('Undo action triggered'),
            },
          })
        }
      >
        Show Toast with Action
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div>
      <Button
        onClick={() => {
          const toastId = toast.loading('Loading...');
          setTimeout(() => {
            toast.success('Loaded successfully!', { id: toastId });
          }, 2000);
        }}
      >
        Show Loading Toast
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const Promise: Story = {
  render: () => (
    <div>
      <Button
        onClick={() => {
          const promise = () =>
            new Promise((resolve) => setTimeout(() => resolve({ name: 'Toast' }), 2000));

          toast.promise(promise, {
            loading: 'Loading...',
            success: (data) => {
              return `${data.name} has been added`;
            },
            error: 'Error',
          });
        }}
      >
        Show Promise Toast
      </Button>
      <EpicToaster />
    </div>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Button onClick={() => toast('Default toast message')}>Default</Button>
      <Button onClick={() => toast.success('Success message')}>Success</Button>
      <Button onClick={() => toast.error('Error message')}>Error</Button>
      <Button onClick={() => toast.warning('Warning message')}>Warning</Button>
      <Button onClick={() => toast.info('Info message')}>Info</Button>
      <EpicToaster />
    </div>
  ),
};

export const CustomDuration: Story = {
  render: () => (
    <div>
      <Button
        onClick={() =>
          toast('This toast will last 5 seconds', {
            duration: 5000,
          })
        }
      >
        Show Toast (5s duration)
      </Button>
      <EpicToaster />
    </div>
  ),
};
