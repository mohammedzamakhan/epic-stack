import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getErrorMessage } from '@repo/common'

describe('getErrorMessage', () => {
	const consoleError = vi.spyOn(console, 'error')

	beforeEach(() => {
		consoleError.mockImplementation(() => {})
	})

	afterEach(() => {
		consoleError.mockReset()
	})

	test('Error object returns message', () => {
		const message = faker.lorem.words(2)
		expect(getErrorMessage(new Error(message))).toBe(message)
	})

	test('String returns itself', () => {
		const message = faker.lorem.words(2)
		expect(getErrorMessage(message)).toBe(message)
	})

	test('undefined falls back to Unknown', () => {
		expect(getErrorMessage(undefined)).toBe('Unknown Error')
		expect(consoleError).toHaveBeenCalledWith(
			'Unable to get error message for error',
			undefined,
		)
		expect(consoleError).toHaveBeenCalledTimes(1)
	})
})
