import { describe, expect, it } from 'vitest'
import { isVideoMediaUrl, resolveMediaUrl } from './media.ts'

describe('resolveMediaUrl videos', () => {
	it('keeps App-hosted videos on the Sites origin', () => {
		expect(
			resolveMediaUrl(
				'/resources/images?objectKey=org%2Fog163jje2pb17rebbzoesbm1%2Fwebsite%2Fvw7ngl89xmewowurx7zwosk1%2Fassets%2F1787930443920-a1n6l61howhgrxijx9uzprxe.mp4',
			),
		).toBe(
			'/api/videos?objectKey=org%2Fog163jje2pb17rebbzoesbm1%2Fwebsite%2Fvw7ngl89xmewowurx7zwosk1%2Fassets%2F1787930443920-a1n6l61howhgrxijx9uzprxe.mp4',
		)
		expect(
			resolveMediaUrl(
				'http://localhost:3001/resources/images?objectKey=org%2Fclip.mp4',
			),
		).toBe('/api/videos?objectKey=org%2Fclip.mp4')
	})

	it('does not treat image assets as video', () => {
		expect(isVideoMediaUrl('/resources/images?objectKey=logo.png')).toBe(false)
	})
})
