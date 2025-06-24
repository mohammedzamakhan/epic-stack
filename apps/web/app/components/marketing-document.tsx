import {
	Links,
	Meta,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from 'react-router'
import { ClientHintCheck } from '#app/utils/client-hints.tsx'
import { type Theme } from '#app/utils/theme.server.ts'

interface MarketingDocumentProps {
	children: React.ReactNode
	theme: Theme
	env: Record<string, string | undefined>
	nonce: string
}

export function MarketingDocument({
	children,
	theme,
	env,
	nonce,
}: MarketingDocumentProps) {
	const { locale } = useLoaderData<{ locale: string }>()

	return (
		<html lang={locale ?? 'en'} className={`${theme} h-full overflow-x-hidden`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<meta name="robots" content="noindex, nofollow" />
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}
