/**
 * SSR adapter: app code imports `@sentry/react-router`, which is Node-oriented.
 * On Workers, capture goes through `@sentry/cloudflare` (see workers/app.ts).
 * Client bundles keep the real `@sentry/react-router` (SSR-only Vite alias).
 */
import * as Sentry from '@sentry/cloudflare'

export function captureException(error: unknown, context?: unknown) {
	return Sentry.captureException(error, context as never)
}

export function captureMessage(message: string, context?: unknown) {
	return Sentry.captureMessage(message, context as never)
}

export function init(_options?: unknown) {
	// Sentry.withSentry() in workers/app.ts owns Worker init.
}

export function flush(timeout?: number) {
	return Sentry.flush(timeout)
}

function noopIntegration() {
	return {}
}

export function replayIntegration() {
	return noopIntegration()
}

export function browserProfilingIntegration() {
	return noopIntegration()
}

export function httpIntegration() {
	return noopIntegration()
}

export function wrapHandleRequestWithSentry(
	handleRequest: (...args: unknown[]) => unknown,
) {
	return handleRequest
}

export async function sentryOnBuildEnd(_options?: unknown) {}
