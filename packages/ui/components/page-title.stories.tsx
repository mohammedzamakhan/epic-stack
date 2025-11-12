import type { Meta, StoryObj } from '@storybook/react';
import { PageTitle } from './page-title';

const meta = {
  title: 'Components/PageTitle',
  component: PageTitle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Page Title',
  },
};

export const WithDescription: Story = {
  args: {
    title: 'Dashboard',
    description: 'Welcome to your dashboard. Here you can view all your important metrics.',
  },
};

export const LongTitle: Story = {
  args: {
    title: 'A Very Long Page Title That Spans Multiple Words',
    description: 'This is a long descriptive text that provides context about the current page.',
  },
};

export const SettingsPage: Story = {
  args: {
    title: 'Settings',
    description: 'Manage your account settings and preferences.',
  },
};
