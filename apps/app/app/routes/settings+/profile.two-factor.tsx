import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Outlet } from 'react-router'
import { type VerificationTypes } from '#app/routes/_auth+/verify.tsx'
import { Icon } from '@repo/ui/icon'
import { BreadcrumbHandle } from './profile.change-email'

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: <Icon name="lock">2FA</Icon>,
	getSitemapEntries: () => null,
}

export const twoFAVerificationType = '2fa' satisfies VerificationTypes

export default function TwoFactorRoute() {
	return <Outlet />
}
