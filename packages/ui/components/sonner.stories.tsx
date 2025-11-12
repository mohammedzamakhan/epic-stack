import type { Meta, StoryObj } from '@storybook/react';
import { EpicToaster } from './sonner';
import { Button } from './button';
import { toast } from 'sonner';

const meta = {
  title: 'Components/EpicToaster',
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
    <>
      <Button onClick={() => toast('This is a toast message')}>Show Toast</Button>
      <EpicToaster />
    </>
  ),
};

export const Success: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.success('Successfully saved!')}>
        Show Success Toast
      </Button>
      <EpicToaster />
    </>
  ),
};

export const Error: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.error('Something went wrong!')}>
        Show Error Toast
      </Button>
      <EpicToaster />
    </>
  ),
};

export const Warning: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.warning('This is a warning!')}>
        Show Warning Toast
      </Button>
      <EpicToaster />
    </>
  ),
};

export const Info: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.info('This is some information')}>
        Show Info Toast
      </Button>
      <EpicToaster />
    </>
  ),
};

export const WithAction: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast('Event has been created', {
            action: {
              label: 'Undo',
              onClick: () => toast('Undo clicked'),
            },
          })
        }
      >
        Show Toast with Action
      </Button>
      <EpicToaster />
    </>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast('Event scheduled', {
            description: 'Your event has been scheduled for tomorrow at 10:00 AM',
          })
        }
      >
        Show Toast with Description
      </Button>
      <EpicToaster />
    </>
  ),
};

export const Loading: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.loading('Loading...')}>Show Loading Toast</Button>
      <EpicToaster />
    </>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <>
      <div className="flex flex-col gap-2">
        <Button onClick={() => toast('Default toast')}>Default</Button>
        <Button onClick={() => toast.success('Success toast')}>Success</Button>
        <Button onClick={() => toast.error('Error toast')}>Error</Button>
        <Button onClick={() => toast.warning('Warning toast')}>Warning</Button>
        <Button onClick={() => toast.info('Info toast')}>Info</Button>
      </div>
      <EpicToaster />
    </>
  ),
};
