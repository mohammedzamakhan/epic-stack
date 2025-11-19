import crypto from 'node:crypto'
import { PassThrough } from 'node:stream'
import { contentSecurity } from '@nichtsam/helmet/content'
import { createReadableStreamFromReadable } from '@react-router/node'
import { i18n, I18nProvider } from '@repo/i18n'
import { sentryLogger, sanitizeUrl } from '@repo/observability'
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import {
	ServerRouter,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HandleDocumentRequestFunction,
} from 'react-router'
import { loadCatalog } from './modules/lingui/lingui'
import { linguiServer } from './modules/lingui/lingui.server'
import { getEnv, init } from './utils/env.server.ts'
import { getInstanceInfo } from './utils/litefs.server.ts'
import { NonceProvider } from './utils/nonce-provider.ts'
import { makeTimings } from './utils/timing.server.ts'

export const streamTimeout = 5000

init()
global.ENV = getEnv()

const MODE = process.env.NODE_ENV ?? 'development'

type DocRequestArgs = Parameters<HandleDocumentRequestFunction>

export default async function handleRequest(...args: DocRequestArgs) {
	const [request, responseStatusCode, responseHeaders, reactRouterContext] =
		args
	const { currentInstance, primaryInstance } = await getInstanceInfo()
	responseHeaders.set('fly-region', process.env.FLY_REGION ?? 'unknown')
	responseHeaders.set('fly-app', process.env.FLY_APP_NAME ?? 'unknown')
	responseHeaders.set('fly-primary-instance', primaryInstance)
	responseHeaders.set('fly-instance', currentInstance)

	if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
		responseHeaders.append('Document-Policy', 'js-profiling')
	}

	const callbackName = isbot(request.headers.get('user-agent'))
		? 'onAllReady'
		: 'onShellReady'

	const nonce = crypto.randomBytes(16).toString('hex')
	const locale = await linguiServer.getLocale(request)
	console.log("load catalog")
	await loadCatalog(locale)

	if (request.url.includes('/novu') || request.url.includes('builder.my')) {
		return new Promise((resolve, reject) => {
			let didError = false
			// NOTE: this timing will only include things that are rendered in the shell
			// and will not include suspended components and deferred loaders
			const timings = makeTimings('render', 'renderToPipeableStream')

			const { pipe, abort } = renderToPipeableStream(
				<I18nProvider i18n={i18n}>
					<NonceProvider value={nonce}>
						<ServerRouter
							nonce={nonce}
							context={reactRouterContext}
							url={request.url}
						/>
					</NonceProvider>
				</I18nProvider>,
				{
					[callbackName]: () => {
						const body = new PassThrough()
						responseHeaders.set('Content-Type', 'text/html')
						responseHeaders.append('Server-Timing', timings.toString())

						resolve(
							new Response(createReadableStreamFromReadable(body), {
								headers: responseHeaders,
								status: didError ? 500 : responseStatusCode,
							}),
						)
						pipe(body)
					},
					onShellError: (err: unknown) => {
						reject(err)
					},
					onError: () => {
						didError = true
					},
					nonce,
				},
			)

			setTimeout(abort, streamTimeout + 5000)
		})
	}
	return new Promise((resolve, reject) => {
		let didError = false
		// NOTE: this timing will only include things that are rendered in the shell
		// and will not include suspended components and deferred loaders
		const timings = makeTimings('render', 'renderToPipeableStream')

		const { pipe, abort } = renderToPipeableStream(
			<I18nProvider i18n={i18n}>
				<NonceProvider value={nonce}>
					<ServerRouter
						nonce={nonce}
						context={reactRouterContext}
						url={request.url}
					/>
				</NonceProvider>
			</I18nProvider>,
			{
				[callbackName]: () => {
					const body = new PassThrough()
					responseHeaders.set('Content-Type', 'text/html')
					responseHeaders.append('Server-Timing', timings.toString())

					contentSecurity(responseHeaders, {
						crossOriginEmbedderPolicy: false,
						contentSecurityPolicy: {
							// NOTE: Remove reportOnly when you're ready to enforce this CSP
							reportOnly: true,
							directives: {
								fetch: {
									'connect-src': [
										MODE === 'development' ? 'ws:' : undefined,
										process.env.SENTRY_DSN ? '*.sentry.io' : undefined,
										"'self'",
									],
									'font-src': ["'self'"],
									'frame-src': ["'self'", 'builder.io'],
									'img-src': ["'self'", 'data:'],
									'script-src': [
										"'strict-dynamic'",
										"'self'",
										`'nonce-${nonce}'`,
									],
									'script-src-attr': [`'nonce-${nonce}'`],
								},
							},
						},
					})

					resolve(
						new Response(createReadableStreamFromReadable(body), {
							headers: responseHeaders,
							status: didError ? 500 : responseStatusCode,
						}),
					)
					pipe(body)
				},
				onShellError: (err: unknown) => {
					reject(err)
				},
				onError: () => {
					didError = true
				},
				nonce,
			},
		)

		setTimeout(abort, streamTimeout + 5000)
	})
}

export async function handleDataRequest(response: Response) {
	const { currentInstance, primaryInstance } = await getInstanceInfo()
	response.headers.set('fly-region', process.env.FLY_REGION ?? 'unknown')
	response.headers.set('fly-app', process.env.FLY_APP_NAME ?? 'unknown')
	response.headers.set('fly-primary-instance', primaryInstance)
	response.headers.set('fly-instance', currentInstance)

	return response
}

export function handleError(
	error: unknown,
	{ request }: LoaderFunctionArgs | ActionFunctionArgs,
): void {
	// Skip capturing if the request is aborted as Remix docs suggest
	// Ref: https://remix.run/docs/en/main/file-conventions/entry.server#handleerror
	if (request.signal.aborted) {
		return
	}

	// Log with context and automatically send to Sentry
	// Sanitize URL to prevent leaking sensitive query parameters
	const requestLogger = sentryLogger.child({
		url: sanitizeUrl(request.url),
		method: request.method,
	})

	if (error instanceof Error) {
		requestLogger.error({ err: error }, 'Request handling error')
	} else {
		requestLogger.error({ error }, 'Unknown error in request handling')
	}
}
