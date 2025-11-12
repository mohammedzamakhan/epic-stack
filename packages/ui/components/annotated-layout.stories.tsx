import type { Meta, StoryObj } from '@storybook/react';
import { AnnotatedLayout, AnnotatedSection } from './annotated-layout';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

const meta = {
  title: 'Components/AnnotatedLayout',
  component: AnnotatedLayout,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AnnotatedLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null,
  },
  render: () => (
    <AnnotatedLayout>
      <AnnotatedSection>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Personal Information</h2>
          <p className="text-sm text-muted-foreground">
            Update your personal details here.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter your name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
        </div>
      </AnnotatedSection>
      <AnnotatedSection>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground">
            Manage your security settings and password.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input id="current-password" type="password" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" />
          </div>
        </div>
      </AnnotatedSection>
    </AnnotatedLayout>
  ),
};

export const WithActions: Story = {
  args: {
    children: null,
  },
  render: () => (
    <AnnotatedLayout>
      <AnnotatedSection>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Profile Settings</h2>
          <p className="text-sm text-muted-foreground">
            Customize your profile information.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="Enter username" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Input id="bio" placeholder="Tell us about yourself" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </AnnotatedSection>
    </AnnotatedLayout>
  ),
};
