import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
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
import { Switch } from './switch';
import { Textarea } from './textarea';

const meta = {
  title: 'Components/Field',
  component: Field,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" type="email" placeholder="john@example.com" />
      <FieldDescription>
        We'll never share your email with anyone else.
      </FieldDescription>
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="username">Username</FieldLabel>
      <Input
        id="username"
        placeholder="johndoe"
        aria-invalid="true"
      />
      <FieldError>Username is required and must be at least 3 characters.</FieldError>
    </Field>
  ),
};

export const WithMultipleErrors: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="password">Password</FieldLabel>
      <Input
        id="password"
        type="password"
        placeholder="••••••••"
        aria-invalid="true"
      />
      <FieldError
        errors={[
          { message: 'Password must be at least 8 characters' },
          { message: 'Password must contain at least one uppercase letter' },
          { message: 'Password must contain at least one number' },
        ]}
      />
    </Field>
  ),
};

export const HorizontalOrientation: Story = {
  render: () => (
    <Field orientation="horizontal">
      <FieldLabel htmlFor="notifications">Notifications</FieldLabel>
      <FieldContent>
        <Switch id="notifications" />
        <FieldDescription>
          Receive email notifications about your account activity.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="bio">Bio</FieldLabel>
      <Textarea
        id="bio"
        placeholder="Tell us about yourself..."
        rows={4}
      />
      <FieldDescription>
        Write a short bio to display on your profile.
      </FieldDescription>
    </Field>
  ),
};

export const FieldGroupExample: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="firstName">First Name</FieldLabel>
        <Input id="firstName" placeholder="John" />
      </Field>
      <Field>
        <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
        <Input id="lastName" placeholder="Doe" />
      </Field>
      <Field>
        <FieldLabel htmlFor="email2">Email</FieldLabel>
        <Input id="email2" type="email" placeholder="john@example.com" />
        <FieldDescription>
          We'll use this email for account-related notifications.
        </FieldDescription>
      </Field>
    </FieldGroup>
  ),
};

export const FieldSetExample: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend>Account Settings</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
          <Input id="displayName" placeholder="John Doe" />
        </Field>
        <Field>
          <FieldLabel htmlFor="username2">Username</FieldLabel>
          <Input id="username2" placeholder="johndoe" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
        <Input id="fullName" placeholder="John Doe" />
      </Field>
      <FieldSeparator>Contact Information</FieldSeparator>
      <Field>
        <FieldLabel htmlFor="email3">Email</FieldLabel>
        <Input id="email3" type="email" placeholder="john@example.com" />
      </Field>
      <Field>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
      </Field>
    </FieldGroup>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <Field orientation="horizontal">
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

export const ResponsiveOrientation: Story = {
  render: () => (
    <Field orientation="responsive" className="max-w-2xl">
      <FieldLabel htmlFor="apiKey">API Key</FieldLabel>
      <FieldContent>
        <Input id="apiKey" placeholder="sk_live_..." />
        <FieldDescription>
          Your API key is used to authenticate requests to our API. Keep it secure.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};

export const ComplexForm: Story = {
  render: () => (
    <FieldSet className="max-w-2xl">
      <FieldLegend>Profile Information</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName2">Full Name</FieldLabel>
          <Input id="fullName2" placeholder="John Doe" />
        </Field>

        <Field>
          <FieldLabel htmlFor="email4">Email</FieldLabel>
          <Input id="email4" type="email" placeholder="john@example.com" />
          <FieldDescription>
            This will be your primary contact email.
          </FieldDescription>
        </Field>

        <FieldSeparator>Preferences</FieldSeparator>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="marketing">Marketing Emails</FieldLabel>
          <FieldContent>
            <Switch id="marketing" />
            <FieldDescription>
              Receive updates about new features and promotions.
            </FieldDescription>
          </FieldContent>
        </Field>

        <Field orientation="horizontal">
          <Checkbox id="newsletter" />
          <FieldContent>
            <FieldLabel htmlFor="newsletter">Subscribe to newsletter</FieldLabel>
            <FieldDescription>
              Get weekly updates delivered to your inbox.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
