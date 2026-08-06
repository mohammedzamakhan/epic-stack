import { describe, it, expect } from 'vitest'
import { loader } from './tags'

describe('OpenReplay Tags API', () => {
	it('should handle OPTIONS request for CORS', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/tags',
			{
				method: 'OPTIONS',
			},
		)

		const response = await loader({ request } as any)

		expect(response.status).toBe(200)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
		expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
			'GET, OPTIONS',
		)
	})

	it('should return empty tags list with valid project key', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/tags?projectKey=test-project-123',
			{
				method: 'GET',
			},
		)

		const response = await loader({ request } as any)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data).toHaveProperty('tags')
		expect(Array.isArray(data.tags)).toBe(true)
		expect(data.tags).toHaveLength(0)
	})

	it('should reject request without project key', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/tags',
			{
				method: 'GET',
			},
		)

		const response = await loader({ request } as any)
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data).toHaveProperty('error')
		expect(data.error).toBe('Project key is required')
	})

	it('should reject request with invalid project key', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/tags?projectKey=',
			{
				method: 'GET',
			},
		)

		const response = await loader({ request } as any)
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data).toHaveProperty('error')
		expect(data.error).toBe('Invalid project key')
	})
})
