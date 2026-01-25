import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
	type MockInstance,
} from 'vitest'
import {
	checkIsCommonPassword,
	getPasswordHashParts,
} from '../src/auth.server.ts'

const server = setupServer()

let consoleWarn: MockInstance<(typeof console)['warn']>

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

beforeEach(() => {
	consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

test('checkIsCommonPassword returns true when password is found in breach database', async () => {
	const password = 'testpassword'
	const [prefix, suffix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			return new HttpResponse(
				`1234567890123456789012345678901234A:1\n${suffix}:1234`,
				{ status: 200 },
			)
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(true)
})

test('checkIsCommonPassword returns false when password is not found in breach database', async () => {
	const password = 'sup3r-dup3r-s3cret'
	const [prefix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			return new HttpResponse(
				'1234567890123456789012345678901234A:1\n' +
					'1234567890123456789012345678901234B:2',
				{ status: 200 },
			)
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(false)
})

test('checkIsCommonPassword returns false when API returns 500', async () => {
	const password = 'testpassword'
	const [prefix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			return new HttpResponse(null, { status: 500 })
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(false)
})

test('checkIsCommonPassword returns false when response has invalid format', async () => {
	const password = 'testpassword'
	const [prefix] = getPasswordHashParts(password)

	server.use(
		http.get(`https://api.pwnedpasswords.com/range/${prefix}`, () => {
			const response = new Response()
			Object.defineProperty(response, 'text', {
				value: () => Promise.resolve(null),
			})
			return response
		}),
	)

	const result = await checkIsCommonPassword(password)
	expect(result).toBe(false)
	expect(consoleWarn).toHaveBeenCalledWith(
		'Unknown error during password check',
		expect.any(TypeError),
	)
})

describe('timeout handling', () => {
	test('checkIsCommonPassword times out after 1 second', async () => {
		server.use(
			http.get('https://api.pwnedpasswords.com/range/:prefix', async () => {
				const twoSecondDelay = 2000
				await new Promise((resolve) => setTimeout(resolve, twoSecondDelay))
				return new HttpResponse(
					'1234567890123456789012345678901234A:1\n' +
						'1234567890123456789012345678901234B:2',
					{ status: 200 },
				)
			}),
		)

		const result = await checkIsCommonPassword('testpassword')
		expect(result).toBe(false)
		expect(consoleWarn).toHaveBeenCalledWith('Password check timed out')
	})
})
