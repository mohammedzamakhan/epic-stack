import { test, expect, vi } from 'vitest'
import { loader } from './images'

vi.mock('openimg/node', () => ({
	getImgResponse: vi.fn(async (request, options) => {
		return new Response('fake image content', {
			headers: options.headers,
		})
	}),
}))

vi.mock('#app/utils/storage.server.ts', () => ({
	getSignedGetRequestInfoAsync: vi.fn().mockResolvedValue({
		url: 'http://s3/img',
		headers: new Headers(),
	}),
}))

vi.mock('#app/utils/misc.tsx', () => ({
	getDomainUrl: vi.fn().mockReturnValue('http://localhost'),
}))

test('loader adds CSP headers for security', async () => {
	const request = new Request(
		'http://localhost/resources/images?objectKey=test.svg',
	)

	const response = await loader({
		request,
		params: {},
		context: {},
	} as any)

	const csp = response.headers.get('Content-Security-Policy')
	expect(csp).toBe(
		"sandbox; default-src 'none'; script-src 'none'; object-src 'none'",
	)
})
