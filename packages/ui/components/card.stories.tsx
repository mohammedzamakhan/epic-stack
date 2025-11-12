import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
import { Button } from './button';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>
          Deploy your new project in one-click.
        </CardDescription>
      </CardHeader>
      <CardContent>
        
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithContent: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          You have 3 unread messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="font-semibold">Push Notifications</div>
            <div className="text-muted-foreground ml-auto">
              Enabled
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="font-semibold">Email Notifications</div>
            <div className="text-muted-foreground ml-auto">
              Disabled
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="font-semibold">SMS Notifications</div>
            <div className="text-muted-foreground ml-auto">
              Enabled
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>
            Total revenue this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
          <CardDescription>
            Total sales this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
          <CardDescription>
            Current active users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +201 since last hour
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate</CardTitle>
          <CardDescription>
            Overall conversion rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div >
            <div className="text-2xl font-bold">24.5%</div>
            <p className="text-xs text-muted-foreground">
              +4.2% from last month
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};
