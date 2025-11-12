import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './avatar';
import { Button } from './button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';

const meta = {
  title: 'Components/HoverCard',
  component: HoverCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@epicstack</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">@epicstack</h4>
          <p className="text-sm text-muted-foreground">
            The Epic Stack – A full-stack application framework for building production-ready apps.
          </p>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">2.5k</span> Followers
            </div>
            <div>
              <span className="font-semibold text-foreground">125</span> Following
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const WithAvatar: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@johnsmith</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex gap-4">
          <Avatar>
            <img src="https://github.com/shadcn.png" alt="@johnsmith" />
          </Avatar>
          <div className="flex flex-col gap-2">
            <div>
              <h4 className="text-sm font-semibold">John Smith</h4>
              <p className="text-sm text-muted-foreground">@johnsmith</p>
            </div>
            <p className="text-sm">
              Software engineer building tools for developers.
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">1.2k</span> Followers
              </div>
              <div>
                <span className="font-semibold text-foreground">89</span> Following
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const SimpleText: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="underline cursor-pointer">Hover over me</span>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm">
          This is a simple hover card with just text content.
        </p>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const ProductInfo: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="outline">Premium Plan</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Premium Plan Features</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
            <li>Unlimited projects</li>
            <li>Advanced analytics</li>
            <li>Priority support</li>
            <li>Custom domains</li>
            <li>Team collaboration</li>
          </ul>
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Starting at <span className="font-semibold text-foreground">$29/month</span>
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const MultipleCards: Story = {
  render: () => (
    <div className="flex gap-4">
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link">React</Button>
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">React</h4>
            <p className="text-sm text-muted-foreground">
              A JavaScript library for building user interfaces.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link">TypeScript</Button>
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">TypeScript</h4>
            <p className="text-sm text-muted-foreground">
              JavaScript with syntax for types.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link">Remix</Button>
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">Remix</h4>
            <p className="text-sm text-muted-foreground">
              Full stack web framework.
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
};

export const WithDelay: Story = {
  render: () => (
    <HoverCard openDelay={500}>
      <HoverCardTrigger asChild>
        <Button variant="link">Hover with delay</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm">
          This card appears after a 500ms delay.
        </p>
      </HoverCardContent>
    </HoverCard>
  ),
};
