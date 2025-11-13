import type { Meta, StoryObj } from '@storybook/react';
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
import { Button } from './button';
import { Icon } from './icon';
import { useState } from 'react';

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
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>Profile</CommandItem>
          <CommandItem>Billing</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const WithShortcuts: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem>
            New File
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            Open File
            <CommandShortcut>⌘O</CommandShortcut>
          </CommandItem>
          <CommandItem>
            Save
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const DialogExample: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Command Dialog</Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem onSelect={() => setOpen(false)}>Calendar</CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>Search Emoji</CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>Calculator</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem onSelect={() => setOpen(false)}>Profile</CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>Billing</CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>Settings</CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    );
  },
};

export const SearchDialog: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const mockNotes = [
      { id: '1', title: 'Project Roadmap Q1 2025', createdByName: 'Sarah Chen' },
      { id: '2', title: 'Team Meeting Notes - Jan 15', createdByName: 'Mike Johnson' },
      { id: '3', title: 'Design System Guidelines', createdByName: 'Emma Wilson' },
    ];

    const filteredNotes = mockNotes.filter((note) =>
      note.title.toLowerCase().includes(query.toLowerCase())
    );

    return (
      <>
        <div className="flex flex-col gap-2 items-center">
          <Button onClick={() => setOpen(true)}>
            <Icon name="search" />
            Search Notes
          </Button>
          <p className="text-xs text-muted-foreground">
            Try typing "design" or "meeting"
          </p>
        </div>
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          className="rounded-lg border shadow-md md:min-w-[650px]"
        >
          <CommandInput
            placeholder="Search notes..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="md:min-h-[400px]">
            <CommandEmpty>No notes found.</CommandEmpty>

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="plus" />
                Create new note
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="user-plus" />
                Invite new members
              </CommandItem>
            </CommandGroup>

            {filteredNotes.length > 0 && (
              <CommandGroup heading="Notes">
                {filteredNotes.map((note) => (
                  <CommandItem key={note.id} onSelect={() => setOpen(false)}>
                    <Icon name="file-text" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{note.title}</span>
                      <span className="text-muted-foreground text-xs">
                        by {note.createdByName}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Settings">
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="user" />
                <span>Account settings</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="credit-card" />
                <span>Billing</span>
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <Icon name="settings" />
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
