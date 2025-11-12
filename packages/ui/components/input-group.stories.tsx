import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './icon';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from './input-group';
import { Kbd } from './kbd';

const meta = {
  title: 'Components/InputGroup',
  component: InputGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTextPrefix: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupAddon align="inline-start">
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
  ),
};

export const WithTextSuffix: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupInput placeholder="username" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>@example.com</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupAddon align="inline-start">
        <Icon name="magnifying-glass" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),
};

export const WithButton: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupInput placeholder="Enter password" type="password" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <Icon name="eye" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithMultipleAddons: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupAddon align="inline-start">
        <Icon name="magnifying-glass" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <Icon name="x-mark" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithKeyboardShortcut: Story = {
  render: () => (
    <InputGroup className="w-[300px]">
      <InputGroupAddon align="inline-start">
        <Icon name="magnifying-glass" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon align="inline-end">
        <Kbd>⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <InputGroup className="w-[400px]">
      <InputGroupAddon align="block-start">
        <InputGroupText>
          <Icon name="pencil" />
          Message
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupTextarea placeholder="Type your message here..." rows={4} />
    </InputGroup>
  ),
};

export const WithTextareaActions: Story = {
  render: () => (
    <InputGroup className="w-[400px]">
      <InputGroupAddon align="block-start">
        <InputGroupText>
          <Icon name="pencil" />
          Message
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupTextarea placeholder="Type your message here..." rows={4} />
      <InputGroupAddon align="block-end">
        <InputGroupButton size="sm">
          <Icon name="paperclip" />
          Attach
        </InputGroupButton>
        <InputGroupButton size="sm" variant="default">
          Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const PriceInput: Story = {
  render: () => (
    <InputGroup className="w-[200px]">
      <InputGroupAddon align="inline-start">
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput type="number" placeholder="0.00" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>USD</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <InputGroup className="w-[300px]" data-disabled="true">
      <InputGroupAddon align="inline-start">
        <Icon name="magnifying-glass" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." disabled />
    </InputGroup>
  ),
};
