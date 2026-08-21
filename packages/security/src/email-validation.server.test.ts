import { describe, it, expect, vi, beforeEach } from 'vitest'

const { resolveMxMock } = vi.hoisted(() => ({
	resolveMxMock: vi.fn(),
}))

vi.mock('node:dns/promises', () => ({
	resolveMx: resolveMxMock,
}))

const { hasValidEmailFormat, isDisposableEmailDomain, validateEmailAddress } =
	await import('./email-validation.server.js')

describe('hasValidEmailFormat', () => {
	it('accepts well-formed addresses', () => {
		expect(hasValidEmailFormat('user@example.com')).toBe(true)
	})

	it('rejects addresses without an @ or domain', () => {
		expect(hasValidEmailFormat('not-an-email')).toBe(false)
		expect(hasValidEmailFormat('user@')).toBe(false)
		expect(hasValidEmailFormat('user@nodothost')).toBe(false)
	})
})

describe('isDisposableEmailDomain', () => {
	it('flags known disposable domains case-insensitively', () => {
		expect(isDisposableEmailDomain('mailinator.com')).toBe(true)
		expect(isDisposableEmailDomain('MAILINATOR.COM')).toBe(true)
	})

	it('does not flag ordinary domains', () => {
		expect(isDisposableEmailDomain('gmail.com')).toBe(false)
		expect(isDisposableEmailDomain('example.com')).toBe(false)
	})
})

describe('validateEmailAddress', () => {
	beforeEach(() => {
		resolveMxMock.mockReset()
	})

	it('denies malformed addresses as INVALID without checking MX', async () => {
		const result = await validateEmailAddress('not-an-email')
		expect(result).toEqual({ isValid: false, reason: 'INVALID' })
		expect(resolveMxMock).not.toHaveBeenCalled()
	})

	it('denies disposable domains as DISPOSABLE without checking MX', async () => {
		const result = await validateEmailAddress('user@mailinator.com')
		expect(result).toEqual({ isValid: false, reason: 'DISPOSABLE' })
		expect(resolveMxMock).not.toHaveBeenCalled()
	})

	it('allows addresses with MX records', async () => {
		resolveMxMock.mockResolvedValue([
			{ exchange: 'mx.example.com', priority: 10 },
		])
		const result = await validateEmailAddress('user@example.com')
		expect(result).toEqual({ isValid: true })
	})

	it('denies addresses whose domain has no MX records', async () => {
		resolveMxMock.mockResolvedValue([])
		const result = await validateEmailAddress('user@example.com')
		expect(result).toEqual({ isValid: false, reason: 'NO_MX_RECORDS' })
	})

	it('denies deterministically when the resolver reports ENOTFOUND', async () => {
		const error = Object.assign(new Error('not found'), { code: 'ENOTFOUND' })
		resolveMxMock.mockRejectedValue(error)
		const result = await validateEmailAddress('user@example.com')
		expect(result).toEqual({ isValid: false, reason: 'NO_MX_RECORDS' })
	})

	it('fails open when the MX lookup errors for infrastructure reasons', async () => {
		const error = Object.assign(new Error('server failure'), {
			code: 'ESERVFAIL',
		})
		resolveMxMock.mockRejectedValue(error)
		const result = await validateEmailAddress('user@example.com')
		expect(result).toEqual({ isValid: true })
	})

	it('fails open when the MX lookup times out', async () => {
		resolveMxMock.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 50)),
		)
		const result = await validateEmailAddress('user@example.com', {
			mxTimeoutMs: 5,
		})
		expect(result).toEqual({ isValid: true })
	})

	it('skips the MX lookup entirely when checkMx is false', async () => {
		const result = await validateEmailAddress('user@example.com', {
			checkMx: false,
		})
		expect(result).toEqual({ isValid: true })
		expect(resolveMxMock).not.toHaveBeenCalled()
	})
})
