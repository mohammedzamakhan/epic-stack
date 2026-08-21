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

	it('rejects addresses with more than one @', () => {
		expect(hasValidEmailFormat('user@@example.com')).toBe(false)
		expect(hasValidEmailFormat('a@b@example.com')).toBe(false)
	})

	it('rejects whitespace and oversized input', () => {
		expect(hasValidEmailFormat('user @example.com')).toBe(false)
		expect(hasValidEmailFormat(`user@${'a'.repeat(300)}.com`)).toBe(false)
	})

	// Regression test for a ReDoS finding: the previous implementation used a
	// single regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) whose domain-side
	// character class also matched `.`, causing polynomial backtracking on
	// inputs like `!@` followed by many repeated `!.` sequences.
	describe('ReDoS resistance', () => {
		it('resolves near-instantly for an oversized adversarial payload', () => {
			const payload = '!@' + '!.'.repeat(50_000)
			const start = performance.now()
			const result = hasValidEmailFormat(payload)
			const elapsed = performance.now() - start
			expect(result).toBe(false)
			expect(elapsed).toBeLessThan(50)
		})

		it('resolves near-instantly for an adversarial payload at the length boundary', () => {
			// 254 characters total (the max length this function accepts),
			// packed with the same ambiguous `!.` sequence that triggered
			// catastrophic backtracking in the old regex-based implementation.
			const payload = '!@' + '!.'.repeat(126)
			expect(payload.length).toBeLessThanOrEqual(254)
			const start = performance.now()
			const result = hasValidEmailFormat(payload)
			const elapsed = performance.now() - start
			expect(result).toBe(false)
			expect(elapsed).toBeLessThan(50)
		})
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

	it('flags subdomains of a listed disposable domain', () => {
		expect(isDisposableEmailDomain('mail.mailinator.com')).toBe(true)
		expect(isDisposableEmailDomain('a.b.mailinator.com')).toBe(true)
		expect(isDisposableEmailDomain('MAIL.MAILINATOR.COM')).toBe(true)
	})

	it('does not flag a domain that merely ends with a listed name as a substring', () => {
		// "notmailinator.com" IS itself a listed disposable domain, but a
		// domain that just happens to share a suffix string without a `.`
		// boundary (e.g. "xmailinator.com") must not match.
		expect(isDisposableEmailDomain('xmailinator.com')).toBe(false)
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

	it('denies disposable subdomains as DISPOSABLE without checking MX', async () => {
		const result = await validateEmailAddress('user@mail.mailinator.com')
		expect(result).toEqual({ isValid: false, reason: 'DISPOSABLE' })
		expect(resolveMxMock).not.toHaveBeenCalled()
	})

	// Each MX-dependent case below uses its own domain: results are cached by
	// domain, so reusing one domain across cases with different mocked
	// resolver behavior would leak the first result into later assertions.

	it('allows addresses with MX records', async () => {
		resolveMxMock.mockResolvedValue([
			{ exchange: 'mx.example.com', priority: 10 },
		])
		const result = await validateEmailAddress('user@has-records.example')
		expect(result).toEqual({ isValid: true })
	})

	it('denies addresses whose domain has no MX records', async () => {
		resolveMxMock.mockResolvedValue([])
		const result = await validateEmailAddress('user@no-records.example')
		expect(result).toEqual({ isValid: false, reason: 'NO_MX_RECORDS' })
	})

	it('denies deterministically when the resolver reports ENOTFOUND', async () => {
		const error = Object.assign(new Error('not found'), { code: 'ENOTFOUND' })
		resolveMxMock.mockRejectedValue(error)
		const result = await validateEmailAddress('user@enotfound.example')
		expect(result).toEqual({ isValid: false, reason: 'NO_MX_RECORDS' })
	})

	it('fails open when the MX lookup errors for infrastructure reasons', async () => {
		const error = Object.assign(new Error('server failure'), {
			code: 'ESERVFAIL',
		})
		resolveMxMock.mockRejectedValue(error)
		const result = await validateEmailAddress('user@eservfail.example')
		expect(result).toEqual({ isValid: true })
	})

	it('fails open when the MX lookup times out', async () => {
		resolveMxMock.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 50)),
		)
		const result = await validateEmailAddress('user@timeout.example', {
			mxTimeoutMs: 5,
		})
		expect(result).toEqual({ isValid: true })
	})

	it('skips the MX lookup entirely when checkMx is false', async () => {
		const result = await validateEmailAddress('user@skip-mx.example', {
			checkMx: false,
		})
		expect(result).toEqual({ isValid: true })
		expect(resolveMxMock).not.toHaveBeenCalled()
	})

	// Regression test mirroring the ReDoS finding: an unbounded, highly
	// ambiguous payload must be rejected near-instantly, not hang the event
	// loop, even when passed directly into the full validation function.
	it('rejects an adversarial ReDoS-style payload near-instantly', async () => {
		const payload = '!@' + '!.'.repeat(50_000)
		const start = performance.now()
		const result = await validateEmailAddress(payload)
		const elapsed = performance.now() - start
		expect(result).toEqual({ isValid: false, reason: 'INVALID' })
		expect(elapsed).toBeLessThan(50)
		expect(resolveMxMock).not.toHaveBeenCalled()
	})
})
