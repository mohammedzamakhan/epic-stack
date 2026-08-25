import { getBrandDomain } from '@repo/config/brand'
import { describe, expect, it } from 'vitest'

import {
	isAllowedAnalyticsOrigin,
	isAllowedBrowserOrigin,
	isOperatorControlPlaneOrigin,
} from './origin.ts'

describe('operator CORS origins', () => {
	const domain = getBrandDomain()

	it('allows the App and Admin control-plane hosts', () => {
		expect(isOperatorControlPlaneOrigin(`https://app.${domain}:2999`)).toBe(
			true,
		)
		expect(isOperatorControlPlaneOrigin(`https://admin.${domain}:2999`)).toBe(
			true,
		)
	})

	it('allows App, Admin, and localhost for operator and analytics fetches', async () => {
		await expect(
			isAllowedBrowserOrigin(`https://app.${domain}:2999`),
		).resolves.toBe(true)
		await expect(
			isAllowedBrowserOrigin(`https://admin.${domain}:2999`),
		).resolves.toBe(true)
		await expect(
			isAllowedAnalyticsOrigin(`https://app.${domain}:2999`),
		).resolves.toBe(true)
		await expect(
			isAllowedAnalyticsOrigin(`https://admin.${domain}:2999`),
		).resolves.toBe(true)
		await expect(isAllowedBrowserOrigin('http://localhost:3001')).resolves.toBe(
			true,
		)
	})
})
