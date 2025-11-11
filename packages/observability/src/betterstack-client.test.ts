import { describe, it, expect } from 'vitest'
import { getUptimeStatus } from './betterstack-client.js'

describe('getUptimeStatus', () => {
	it('should return degraded status when API key is missing', async () => {
		const status = await getUptimeStatus('', undefined)

		expect(status.status).toBe('degraded')
		expect(status.message).toBe('Unable to fetch status')
		expect(status.upMonitors).toBe(0)
		expect(status.totalMonitors).toBe(0)
	})
})
