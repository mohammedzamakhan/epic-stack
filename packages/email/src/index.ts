// Export all email templates
export { default as OrganizationInviteEmail } from './templates/organization-invite'
export { default as ContactTemplate } from './templates/contact'
export { default as InvoiceEmail } from './templates/invoice'
export { default as ForgotPasswordEmail } from './templates/forgot-password'
export { default as SignupEmail } from './templates/signup'
export { default as EmailChangeEmail } from './templates/email-change'
export { default as EmailChangeNoticeEmail } from './templates/email-change-notice'
export { default as TrialEndingEmail } from './templates/trial-ending'
export { default as NewDeviceSigninEmail } from './templates/new-device-signin'

// Export types
export type { OrganizationInviteEmailProps } from './templates/organization-invite'
export type { ContactTemplateProps } from './templates/contact'
export type { InvoiceEmailProps } from './templates/invoice'
export type { ForgotPasswordEmailProps } from './templates/forgot-password'
export type { SignupEmailProps } from './templates/signup'
export type { EmailChangeEmailProps } from './templates/email-change'
export type { EmailChangeNoticeEmailProps } from './templates/email-change-notice'
export type { TrialEndingEmailProps } from './templates/trial-ending'
export type { NewDeviceSigninEmailProps } from './templates/new-device-signin'

// Export sendEmail function
export { sendEmail } from './send-email'
