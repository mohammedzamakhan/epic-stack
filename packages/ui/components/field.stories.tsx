import type { Meta, StoryObj } from '@storybook/react';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from './field';
import { Input } from './input';
import { Checkbox } from './checkbox';

const meta = {
  title: 'Components/Field',
  component: Field,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field className="w-80">
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <Input id="name" placeholder="Enter your name" />
      <FieldDescription>Please enter your full name.</FieldDescription>
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field className="w-80">
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" placeholder="Enter your email" aria-invalid="true" />
      <FieldError>Please enter a valid email address.</FieldError>
    </Field>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="w-80">
      <FieldLabel htmlFor="username">Username</FieldLabel>
      <Input id="username" placeholder="Enter username" />
    </Field>
  ),
};

export const WithFieldSet: Story = {
  render: () => (
    <FieldSet className="w-80">
      <FieldLegend>Personal Information</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="first-name">First Name</FieldLabel>
          <Input id="first-name" placeholder="John" />
        </Field>
        <Field>
          <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
          <Input id="last-name" placeholder="Doe" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <FieldSet className="w-80">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field1">Field 1</FieldLabel>
          <Input id="field1" />
        </Field>
        <FieldSeparator>Or</FieldSeparator>
        <Field>
          <FieldLabel htmlFor="field2">Field 2</FieldLabel>
          <Input id="field2" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <Field orientation="horizontal" className="w-80">
      <Checkbox id="terms" />
      <FieldContent>
        <FieldLabel htmlFor="terms">Accept terms and conditions</FieldLabel>
        <FieldDescription>
          You agree to our Terms of Service and Privacy Policy.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};
