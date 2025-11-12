import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { StatusButton } from './status-button';

const meta = {
  title: 'Components/StatusButton',
  component: StatusButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'pending', 'success', 'error'],
    },
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
  },
} satisfies Meta<typeof StatusButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    status: 'idle',
    children: 'Submit',
  },
};

export const Pending: Story = {
  args: {
    status: 'pending',
    children: 'Submit',
    pendingText: 'Submitting...',
  },
};

export const Success: Story = {
  args: {
    status: 'success',
    children: 'Submit',
    successText: 'Success!',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    children: 'Submit',
    errorText: 'Error',
  },
};

export const WithMessage: Story = {
  args: {
    status: 'success',
    children: 'Save',
    message: 'Changes saved successfully!',
  },
};

export const Interactive: Story = {
  render: () => {
    const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

    const handleClick = () => {
      setStatus('pending');

      // Simulate API call
      setTimeout(() => {
        if (Math.random() > 0.3) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      }, 2000);
    };

    return (
      <div className="flex flex-col gap-4 items-center">
        <StatusButton
          status={status}
          onClick={handleClick}
          onStatusChange={(newStatus) => setStatus(newStatus)}
          pendingText="Saving..."
          successText="Saved!"
          errorText="Failed"
        >
          Save Changes
        </StatusButton>
        <p className="text-sm text-muted-foreground">
          Current status: {status}
        </p>
      </div>
    );
  },
};

export const MultipleButtons: Story = {
  render: () => {
    const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [deleteStatus, setDeleteStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [publishStatus, setPublishStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

    const handleSave = () => {
      setSaveStatus('pending');
      setTimeout(() => setSaveStatus('success'), 1500);
    };

    const handleDelete = () => {
      setDeleteStatus('pending');
      setTimeout(() => setDeleteStatus('success'), 1500);
    };

    const handlePublish = () => {
      setPublishStatus('pending');
      setTimeout(() => setPublishStatus('success'), 1500);
    };

    return (
      <div className="flex gap-2">
        <StatusButton
          status={saveStatus}
          onClick={handleSave}
          onStatusChange={setSaveStatus}
          variant="default"
        >
          Save
        </StatusButton>
        <StatusButton
          status={deleteStatus}
          onClick={handleDelete}
          onStatusChange={setDeleteStatus}
          variant="destructive"
        >
          Delete
        </StatusButton>
        <StatusButton
          status={publishStatus}
          onClick={handlePublish}
          onStatusChange={setPublishStatus}
          variant="secondary"
        >
          Publish
        </StatusButton>
      </div>
    );
  },
};

export const WithCustomDuration: Story = {
  render: () => {
    const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

    const handleClick = () => {
      setStatus('pending');
      setTimeout(() => setStatus('success'), 1000);
    };

    return (
      <div className="flex flex-col gap-4 items-center">
        <StatusButton
          status={status}
          onClick={handleClick}
          onStatusChange={setStatus}
          successDuration={3000}
          successText="Saved!"
        >
          Save with 3s success
        </StatusButton>
        <p className="text-sm text-muted-foreground">
          Success state will last for 3 seconds
        </p>
      </div>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <StatusButton status="idle">Idle State</StatusButton>
      <StatusButton status="pending" pendingText="Loading...">
        Pending State
      </StatusButton>
      <StatusButton status="success" successText="Done!">
        Success State
      </StatusButton>
      <StatusButton status="error" errorText="Failed">
        Error State
      </StatusButton>
    </div>
  ),
};
