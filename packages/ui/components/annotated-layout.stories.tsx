import type { Meta, StoryObj } from '@storybook/react';
import { AnnotatedLayout, AnnotatedSection } from './annotated-layout';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';

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
  render: () => (
    <AnnotatedLayout>
      <AnnotatedSection>
        <div>
          <h2 className="text-lg font-semibold">Profile Information</h2>
          <p className="text-sm text-muted-foreground">
            Update your account's profile information and email address.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <Button>Save</Button>
            </div>
          </CardContent>
        </Card>
      </AnnotatedSection>
    </AnnotatedLayout>
  ),
};

export const MultipleSections: Story = {
  render: () => (
    <AnnotatedLayout>
      <AnnotatedSection>
        <div>
          <h2 className="text-lg font-semibold">Profile Information</h2>
          <p className="text-sm text-muted-foreground">
            Update your account's profile information and email address.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name2">Name</Label>
                <Input id="name2" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" placeholder="john@example.com" />
              </div>
              <Button>Save</Button>
            </div>
          </CardContent>
        </Card>
      </AnnotatedSection>

      <AnnotatedSection>
        <div>
          <h2 className="text-lg font-semibold">Password</h2>
          <p className="text-sm text-muted-foreground">
            Ensure your account is using a long, random password to stay secure.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" />
              </div>
              <Button>Update Password</Button>
            </div>
          </CardContent>
        </Card>
      </AnnotatedSection>

      <AnnotatedSection>
        <div>
          <h2 className="text-lg font-semibold">Delete Account</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
            <CardDescription>
              Once your account is deleted, all of its resources and data will be
              permanently deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </AnnotatedSection>
    </AnnotatedLayout>
  ),
};

export const SettingsPage: Story = {
  render: () => (
    <AnnotatedLayout>
      <AnnotatedSection>
        <div>
          <h2 className="text-lg font-semibold">General Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage your general account settings and preferences.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="johndoe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input id="bio" placeholder="Tell us about yourself" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      </AnnotatedSection>

      <AnnotatedSection>
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Configure how you receive notifications.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">Notification settings coming soon...</p>
          </CardContent>
        </Card>
      </AnnotatedSection>
    </AnnotatedLayout>
  ),
};
