# @repo/email

A centralized email template package for the Epic Stack application using React
Email.

## Overview

This package contains all React email templates used throughout the application.
It provides a consistent way to create, maintain, and reuse email templates
across different parts of the application.

## Installation

This package is automatically included in the web app's dependencies. No
additional installation is required.

## Usage

Import email templates from the package:

```typescript
import { OrganizationInviteEmail, ForgotPasswordEmail, SignupEmail } from '@repo/email'
import { sendEmail } from '#app/utils/email.server.ts'

// Use in your server-side code
const response = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  react: <SignupEmail onboardingUrl="https://app.com/verify/123" otp="123456" />
})
```

## Available Templates

### OrganizationInviteEmail

Used when inviting users to join an organization.

**Props:**

- `inviteUrl: string` - The invitation acceptance URL
- `organizationName: string` - Name of the organization
- `inviterName: string` - Name of the person sending the invite

### ForgotPasswordEmail

Used for password reset emails.

**Props:**

- `onboardingUrl: string` - The password reset URL
- `otp: string` - One-time password code

### SignupEmail

Used for user registration verification.

**Props:**

- `onboardingUrl: string` - The verification URL
- `otp: string` - One-time password code

### EmailChangeEmail

Used when users change their email address.

**Props:**

- `verifyUrl: string` - The email verification URL
- `otp: string` - One-time password code

### EmailChangeNoticeEmail

Used to notify users when their email has been changed.

**Props:**

- `userId: string` - The user's account ID

### ContactTemplate

Used for contact form submissions.

**Props:**

- `name: string` - Contact's name
- `email: string` - Contact's email
- `message: string` - Contact's message

### InvoiceEmail

Used for sending invoices.

**Props:**

- `orderNumber: string` - Invoice number
- `invoiceDate: string` - Invoice date
- `customerName: string` - Customer name
- `customerEmail: string` - Customer email
- `items: Array<{name, description, quantity, amount}>` - Invoice items
- `subtotal: string` - Subtotal amount
- `tax: string` - Tax amount
- `total: string` - Total amount
- `downloadUrl: string` - Invoice download URL

## Development

### Building the Package

```bash
cd packages/email
npm run build
```

### Type Checking

```bash
cd packages/email
npm run typecheck
```

### Adding New Templates

1. Create a new template file in `src/templates/`
2. Export the template and its props interface
3. Add exports to `src/index.ts`
4. Build the package
5. Use the template in your application

### Template Structure

Each template should:

- Use React Email components from `@react-email/components`
- Export a props interface
- Include `PreviewProps` for development/testing
- Follow the existing naming conventions

Example:

```typescript
import { Html, Container, Text } from '@react-email/components';

export interface MyEmailProps {
  name: string;
  message: string;
}

export default function MyEmail({ name, message }: MyEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Container>
        <Text>Hello {name}!</Text>
        <Text>{message}</Text>
      </Container>
    </Html>
  );
}

MyEmail.PreviewProps = {
  name: 'John Doe',
  message: 'Welcome to our app!'
} as MyEmailProps;
```

## Dependencies

- `@react-email/components` - React Email component library
- `react` - React library
- `resend` - Email service provider
- `zod` - Schema validation

## Notes

- All templates are built with TypeScript for type safety
- Templates use React Email components for consistent rendering across email
  clients
- The package is configured as a private workspace package
- Templates include preview props for development and testing
