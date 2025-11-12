import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from './button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command';
import { Icon } from './icon';

const meta = {
  title: 'Components/Command',
  component: Command,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <Icon name="calendar" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem>
            <Icon name="face-smile" />
            <span>Search Emoji</span>
          </CommandItem>
          <CommandItem>
            <Icon name="calculator" />
            <span>Calculator</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <Icon name="avatar" />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="credit-card" />
            <span>Billing</span>
            <CommandShortcut>⌘B</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="gear" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const Dialog: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <p className="text-sm text-muted-foreground mb-2">
          Press{' '}
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </p>
        <Button onClick={() => setOpen(true)} variant="outline">
          Open Command Dialog
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <Icon name="calendar" />
                <span>Calendar</span>
              </CommandItem>
              <CommandItem>
                <Icon name="face-smile" />
                <span>Search Emoji</span>
              </CommandItem>
              <CommandItem>
                <Icon name="calculator" />
                <span>Calculator</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem>
                <Icon name="avatar" />
                <span>Profile</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <Icon name="credit-card" />
                <span>Billing</span>
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <Icon name="gear" />
                <span>Settings</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    );
  },
};

export const WithMultipleGroups: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="Search files and folders..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Files">
          <CommandItem>
            <Icon name="file-text" />
            <span>README.md</span>
          </CommandItem>
          <CommandItem>
            <Icon name="file-text" />
            <span>package.json</span>
          </CommandItem>
          <CommandItem>
            <Icon name="file-text" />
            <span>index.tsx</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Folders">
          <CommandItem>
            <Icon name="folder" />
            <span>src</span>
          </CommandItem>
          <CommandItem>
            <Icon name="folder" />
            <span>components</span>
          </CommandItem>
          <CommandItem>
            <Icon name="folder" />
            <span>utils</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem>
            <Icon name="plus" />
            <span>New File</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Icon name="folder-open" />
            <span>New Folder</span>
            <CommandShortcut>⌘⇧N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const SimpleList: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[300px]">
      <CommandInput placeholder="Search fruits..." />
      <CommandList>
        <CommandEmpty>No fruits found.</CommandEmpty>
        <CommandGroup>
          <CommandItem>Apple</CommandItem>
          <CommandItem>Banana</CommandItem>
          <CommandItem>Orange</CommandItem>
          <CommandItem>Grape</CommandItem>
          <CommandItem>Pineapple</CommandItem>
          <CommandItem>Strawberry</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
