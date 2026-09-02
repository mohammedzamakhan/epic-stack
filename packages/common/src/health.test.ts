import { describe, expect, it } from 'vitest'
import { createHealthResponse } from './health.ts'

describe('createHealthResponse', () => {
	it('returns ok payload with service name', async () => {
		const response = createHealthResponse('web')
		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe(
			'no-cache, no-store, must-revalidate',
		)

		const body = await response.json()
		expect(body).toMatchObject({
			status: 'ok',
			service: 'web',
		})
		expect(typeof body.timestamp).toBe('string')
	})

	it('merges extra fields', async () => {
		const response = createHealthResponse('tenant-api', { region: 'us' })
		const body = await response.json()
		expect(body).toMatchObject({
			status: 'ok',
			service: 'tenant-api',
			region: 'us',
		})
	})
})
