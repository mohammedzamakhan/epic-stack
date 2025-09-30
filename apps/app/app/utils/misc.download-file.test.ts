import { http, HttpResponse } from 'msw'
import { describe, expect, test, vi } from 'vitest'
import { server } from '#tests/mocks'
import { downloadFile } from './misc.tsx'

describe('downloadFile', () => {
	test('successfully downloads a file', async () => {
		const imageUrl = 'https://example.com/image.jpg'
		const mockImageData = new ArrayBuffer(100)

		server.use(
			http.get(imageUrl, () => {
				return new HttpResponse(mockImageData, {
					status: 200,
					headers: { 'content-type': 'image/jpeg' },
				})
			}),
		)

		const file = await downloadFile(imageUrl)
		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('image/jpeg')
		expect(file.name).toBe('downloaded-file')
	})

	test('respects MAX_RETRIES limit of 3 attempts', async () => {
		const imageUrl = 'https://example.com/failing-image.jpg'
		let attemptCount = 0

		server.use(
			http.get(imageUrl, () => {
				attemptCount++
				return new HttpResponse(null, { status: 500 })
			}),
		)

		await expect(downloadFile(imageUrl)).rejects.toThrow(
			'Failed to fetch image with status 500',
		)

		// Should make exactly 3 attempts (retries = 0, 1, 2)
		// On the 3rd attempt (retries = 2), it will fail
		// Then retries becomes 3, which is >= MAX_RETRIES, so it throws
		expect(attemptCount).toBe(3)
	})

	test('succeeds on retry after initial failure', async () => {
		const imageUrl = 'https://example.com/sometimes-failing-image.jpg'
		let attemptCount = 0
		const mockImageData = new ArrayBuffer(50)

		server.use(
			http.get(imageUrl, () => {
				attemptCount++
				if (attemptCount < 2) {
					return new HttpResponse(null, { status: 500 })
				}
				return new HttpResponse(mockImageData, {
					status: 200,
					headers: { 'content-type': 'image/png' },
				})
			}),
		)

		const file = await downloadFile(imageUrl)
		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('image/png')
		expect(attemptCount).toBe(2)
	})

	test('uses default content-type when header is missing', async () => {
		const imageUrl = 'https://example.com/no-content-type.jpg'
		const mockImageData = new ArrayBuffer(100)

		server.use(
			http.get(imageUrl, () => {
				return new HttpResponse(mockImageData, {
					status: 200,
					headers: {},
				})
			}),
		)

		const file = await downloadFile(imageUrl)
		expect(file.type).toBe('image/jpg')
	})
})
