import { Trans } from '@lingui/macro'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { getPageTitle } from '@repo/config/brand'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Link } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { type Route } from './+types/forgot-password.sent.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export const meta: Route.MetaFunction = () => {
	return [{ title: getPageTitle('Password Recovery') }]
}

export default function ForgotPasswordSentRoute() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl">
					<Trans>Check your email</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						If an account exists with that username or email, we've sent
						password reset instructions.
					</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-sm">
					<Trans>
						Didn't receive the email? Check your spam folder, or try again with
						a different email address.
					</Trans>
				</p>
			</CardContent>
			<CardFooter className="block rounded-lg p-4 text-center text-sm">
				<Trans>Remember your password?</Trans>{' '}
				<Link to="/login" className="font-medium underline underline-offset-4">
					<Trans>Back to login</Trans>
				</Link>
			</CardFooter>
		</Card>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
