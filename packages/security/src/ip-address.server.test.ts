import { describe, it, expect } from 'vitest'
import { getClientIp } from './ip-address.server.js'

describe('getClientIp', () => {
	describe('Web API Request (Remix)', () => {
		it('should extract IP from Fly-Client-IP header (highest priority)', () => {
			const request = {
				headers: {
					get: (name: string) => {
						const headers: Record<string, string> = {
							'fly-client-ip': '1.2.3.4',
							'cf-connecting-ip': '5.6.7.8',
							'x-real-ip': '9.10.11.12',
							'x-forwarded-for': '13.14.15.16',
						}
						return headers[name.toLowerCase()] || null
					},
				},
			}

			expect(getClientIp(request)).toBe('1.2.3.4')
		})

		it('should extract IP from CF-Connecting-IP header when Fly-Client-IP is not present', () => {
			const request = {
				headers: {
					get: (name: string) => {
						const headers: Record<string, string> = {
							'cf-connecting-ip': '5.6.7.8',
							'x-real-ip': '9.10.11.12',
							'x-forwarded-for': '13.14.15.16',
						}
						return headers[name.toLowerCase()] || null
					},
				},
			}

			expect(getClientIp(request)).toBe('5.6.7.8')
		})

		it('should extract IP from X-Real-IP header when higher priority headers are not present', () => {
			const request = {
				headers: {
					get: (name: string) => {
						const headers: Record<string, string> = {
							'x-real-ip': '9.10.11.12',
							'x-forwarded-for': '13.14.15.16',
						}
						return headers[name.toLowerCase()] || null
					},
				},
			}

			expect(getClientIp(request)).toBe('9.10.11.12')
		})

		it('should extract first IP from X-Forwarded-For header', () => {
			const request = {
				headers: {
					get: (name: string) => {
						if (name.toLowerCase() === 'x-forwarded-for') {
							return '13.14.15.16, 17.18.19.20, 21.22.23.24'
						}
						return null
					},
				},
			}

			expect(getClientIp(request)).toBe('13.14.15.16')
		})

		it('should trim whitespace from X-Forwarded-For IP', () => {
			const request = {
				headers: {
					get: (name: string) => {
						if (name.toLowerCase() === 'x-forwarded-for') {
							return '  13.14.15.16  , 17.18.19.20'
						}
						return null
					},
				},
			}

			expect(getClientIp(request)).toBe('13.14.15.16')
		})

		it('should return default fallback when no IP headers are present', () => {
			const request = {
				headers: {
					get: () => null,
				},
			}

			expect(getClientIp(request)).toBe('127.0.0.1')
		})

		it('should return custom fallback when specified', () => {
			const request = {
				headers: {
					get: () => null,
				},
			}

			expect(getClientIp(request, { fallback: 'unknown' })).toBe('unknown')
		})

		it('should return undefined when returnUndefined option is true and no IP found', () => {
			const request = {
				headers: {
					get: () => null,
				},
			}

			expect(getClientIp(request, { returnUndefined: true })).toBeUndefined()
		})
	})

	describe('Express-style Request', () => {
		it('should extract IP from Fly-Client-IP header using .get() method', () => {
			const request = {
				get: (name: string) => {
					const headers: Record<string, string> = {
						'fly-client-ip': '1.2.3.4',
						'cf-connecting-ip': '5.6.7.8',
					}
					return headers[name.toLowerCase()]
				},
			}

			expect(getClientIp(request)).toBe('1.2.3.4')
		})

		it('should extract IP from X-Forwarded-For using .get() method', () => {
			const request = {
				get: (name: string) => {
					if (name.toLowerCase() === 'x-forwarded-for') {
						return '13.14.15.16, 17.18.19.20'
					}
					return undefined
				},
			}

			expect(getClientIp(request)).toBe('13.14.15.16')
		})

		it('should use request.ip as fallback for Express requests', () => {
			const request = {
				get: () => undefined,
				ip: '25.26.27.28',
			}

			expect(getClientIp(request)).toBe('25.26.27.28')
		})

		it('should prefer headers over request.ip', () => {
			const request = {
				get: (name: string) => {
					if (name.toLowerCase() === 'x-real-ip') {
						return '9.10.11.12'
					}
					return undefined
				},
				ip: '25.26.27.28',
			}

			expect(getClientIp(request)).toBe('9.10.11.12')
		})
	})

	describe('Edge cases', () => {
		it('should handle empty X-Forwarded-For header', () => {
			const request = {
				headers: {
					get: (name: string) => {
						if (name.toLowerCase() === 'x-forwarded-for') {
							return ''
						}
						return null
					},
				},
			}

			expect(getClientIp(request)).toBe('127.0.0.1')
		})

		it('should handle X-Forwarded-For with only commas', () => {
			const request = {
				headers: {
					get: (name: string) => {
						if (name.toLowerCase() === 'x-forwarded-for') {
							return ',,,,'
						}
						return null
					},
				},
			}

			expect(getClientIp(request)).toBe('127.0.0.1')
		})

		it('should handle null request', () => {
			expect(getClientIp(null)).toBe('127.0.0.1')
		})

		it('should handle undefined request', () => {
			expect(getClientIp(undefined)).toBe('127.0.0.1')
		})

		it('should handle request with neither .get() nor .headers.get()', () => {
			const request = {
				someOtherProperty: 'value',
			}

			expect(getClientIp(request)).toBe('127.0.0.1')
		})
	})
})
