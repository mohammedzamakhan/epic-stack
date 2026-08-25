import { describe, expect, it } from 'vitest'
import { getMarketingEmailHeaders } from '@repo/config/marketing-email'
import { parseOciEngagementLogRecord } from './engagement-logs.ts'

describe('parseOciEngagementLogRecord', () => {
	const headers = getMarketingEmailHeaders()

	it('parses open events using brand-scoped message id header', () => {
		const event = parseOciEngagementLogRecord({
			time: '2026-01-19T12:00:00.000Z',
			data: {
				action: 'open',
				messageId: 'ignored@mta.example.com',
				recipient: 'user@example.com',
				headers: {
					[headers.orgId]: 'org_abc123',
					[headers.messageId]: 'msg-uuid-1',
				},
			},
		})

		expect(event).toEqual({
			action: 'open',
			messageId: 'msg-uuid-1',
			orgId: 'org_abc123',
			occurredAt: new Date('2026-01-19T12:00:00.000Z'),
			recipient: 'user@example.com',
		})
	})

	it('parses click events from messageId prefix when headers are absent', () => {
		const event = parseOciEngagementLogRecord({
			time: '2026-01-19T12:05:00.000Z',
			data: {
				action: 'click',
				messageId: 'msg-uuid-2@smtpf.example.com',
				recipient: 'user@example.com',
			},
		})

		expect(event?.action).toBe('click')
		expect(event?.messageId).toBe('msg-uuid-2')
	})

	it('still accepts legacy X-Epic-* headers', () => {
		const event = parseOciEngagementLogRecord({
			time: '2026-01-19T12:00:00.000Z',
			data: {
				action: 'open',
				headers: {
					'X-Epic-Org-Id': 'org_legacy',
					'X-Epic-Message-Id': 'msg-legacy',
				},
			},
		})

		expect(event?.orgId).toBe('org_legacy')
		expect(event?.messageId).toBe('msg-legacy')
	})

	it('ignores non-engagement actions', () => {
		expect(
			parseOciEngagementLogRecord({
				data: { action: 'relay', messageId: 'msg-1' },
			}),
		).toBeNull()
	})
})
