import type { Meta, StoryObj } from '@storybook/react';
import { PageTitle } from './page-title';

const meta = {
  title: 'Components/PageTitle',
  component: PageTitle,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
  },
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
    description: 'Welcome to your dashboard',
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'Settings',
  },
};

export const LongTitle: Story = {
  args: {
    title: 'This is a Very Long Page Title That Might Wrap',
    description: 'And it has a description that provides more context',
  },
};

export const WithLongDescription: Story = {
  args: {
    title: 'Analytics',
    description:
      'View and analyze your application metrics, user engagement statistics, and performance data across all your projects.',
  },
};

export const Examples: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-8">
      <PageTitle title="Home" description="Overview of your account" />
      <PageTitle title="Projects" description="Manage your projects and workspaces" />
      <PageTitle
        title="Team Members"
        description="Invite and manage team members, set permissions and roles"
      />
      <PageTitle title="Billing" />
      <PageTitle
        title="Documentation"
        description="Learn how to use all the features of our platform"
      />
    </div>
  ),
};
