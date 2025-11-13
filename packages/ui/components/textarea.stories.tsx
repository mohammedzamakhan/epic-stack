import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Textarea } from './textarea';
import { Label } from './label';
import { Field, FieldLabel, FieldDescription, FieldError } from './field';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here...',
  },
};

export const WithValue: Story = {
  args: {
    value: 'This is some default text in the textarea.',
    placeholder: 'Type your message here...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'This textarea is disabled',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="message">Your Message</Label>
      <Textarea id="message" placeholder="Tell us what you think..." />
    </div>
  ),
};

export const LongText: Story = {
  args: {
    value: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
  },
};

export const FormExample: Story = {
  render: () => (
    <form className="w-[500px] space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <input
          id="title"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none"
          placeholder="Enter a title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Provide a detailed description..."
          className="min-h-32"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Submit
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  ),
};

export const CharacterCount: Story = {
  render: () => {
    const [value, setValue] = React.useState('');
    const maxLength = 200;

    return (
      <div className="w-[400px] space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
        />
        <p className="text-sm text-muted-foreground text-right">
          {value.length}/{maxLength}
        </p>
      </div>
    );
  },
};

export const WithField: Story = {
  render: () => (
    <Field className="w-[500px]">
      <FieldLabel htmlFor="note-content">Note Content</FieldLabel>
      <Textarea
        id="note-content"
        placeholder="Write your note here..."
        className="min-h-32"
      />
      <FieldDescription>
        Your note will be saved automatically as you type.
      </FieldDescription>
    </Field>
  ),
};

export const WithFieldError: Story = {
  render: () => (
    <Field className="w-[500px]" data-invalid="true">
      <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
      <Textarea
        id="feedback"
        placeholder="Share your feedback..."
        className="min-h-32"
        aria-invalid="true"
        defaultValue="Hi"
      />
      <FieldError>Feedback must be at least 10 characters long.</FieldError>
    </Field>
  ),
};
