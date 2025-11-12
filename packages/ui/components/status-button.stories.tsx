import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
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
  args: {},
  render: () => {
    const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

    useEffect(() => {
      let timeoutId: NodeJS.Timeout | undefined;

      if (status === 'pending') {
        timeoutId = setTimeout(() => {
          if (Math.random() > 0.3) {
            setStatus('success');
          } else {
            setStatus('error');
          }
        }, 2000);
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [status]);

    const handleClick = () => {
      setStatus('pending');
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
  args: {},
  render: () => {
    const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [deleteStatus, setDeleteStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [publishStatus, setPublishStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

    useEffect(() => {
      let timeoutId: NodeJS.Timeout | undefined;

      if (saveStatus === 'pending') {
        timeoutId = setTimeout(() => setSaveStatus('success'), 1500);
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [saveStatus]);

    useEffect(() => {
      let timeoutId: NodeJS.Timeout | undefined;

      if (deleteStatus === 'pending') {
        timeoutId = setTimeout(() => setDeleteStatus('success'), 1500);
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [deleteStatus]);

    useEffect(() => {
      let timeoutId: NodeJS.Timeout | undefined;

      if (publishStatus === 'pending') {
        timeoutId = setTimeout(() => setPublishStatus('success'), 1500);
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [publishStatus]);

    const handleSave = () => {
      setSaveStatus('pending');
    };

    const handleDelete = () => {
      setDeleteStatus('pending');
    };

    const handlePublish = () => {
      setPublishStatus('pending');
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
  args: {},
  render: () => {
    const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

    useEffect(() => {
      let timeoutId: NodeJS.Timeout | undefined;

      if (status === 'pending') {
        timeoutId = setTimeout(() => setStatus('success'), 1000);
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [status]);

    const handleClick = () => {
      setStatus('pending');
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
  args: {},
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
