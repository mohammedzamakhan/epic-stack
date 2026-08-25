import { describe, expect, it } from 'vitest'
import {
	buildPlatformMarketingResendTags,
	getMarketingEmailHeaderPrefix,
	getMarketingEmailHeaders,
	getMarketingEmailTagNamespace,
	getMarketingEmailTags,
	getMarketingEmailTagValue,
	getMarketingEmailHeaderValue,
	isPlatformMarketingEmailScope,
	LEGACY_MARKETING_EMAIL_HEADERS,
	LEGACY_MARKETING_EMAIL_TAGS,
	MARKETING_EMAIL_PLATFORM_SCOPE,
} from './marketing-email.js'

describe('marketing-email', () => {
	it('derives tag and header names from brand.slug', () => {
		expect(getMarketingEmailTagNamespace()).toBe('epic_startup')
		expect(getMarketingEmailHeaderPrefix()).toBe('Epic-Startup')
		expect(getMarketingEmailTags()).toEqual({
			scope: 'epic_startup_scope',
			messageId: 'epic_startup_message_id',
			campaignId: 'epic_startup_campaign_id',
		})
		expect(getMarketingEmailHeaders().orgId).toBe('X-Epic-Startup-Org-Id')
	})

	it('builds platform Resend tags', () => {
		expect(buildPlatformMarketingResendTags('msg-1', 'camp-1')).toEqual({
			epic_startup_scope: MARKETING_EMAIL_PLATFORM_SCOPE,
			epic_startup_message_id: 'msg-1',
			epic_startup_campaign_id: 'camp-1',
		})
	})

	it('reads current and legacy Resend tags', () => {
		expect(
			isPlatformMarketingEmailScope({
				[LEGACY_MARKETING_EMAIL_TAGS.scope]: MARKETING_EMAIL_PLATFORM_SCOPE,
			}),
		).toBe(true)
		expect(
			getMarketingEmailTagValue(
				{ epic_startup_message_id: 'msg-2' },
				'messageId',
			),
		).toBe('msg-2')
		expect(
			getMarketingEmailTagValue({ epic_message_id: 'legacy-msg' }, 'messageId'),
		).toBe('legacy-msg')
	})

	it('reads current and legacy OCI headers', () => {
		expect(
			getMarketingEmailHeaderValue(
				{ [LEGACY_MARKETING_EMAIL_HEADERS.messageId]: 'legacy' },
				'messageId',
			),
		).toBe('legacy')
		expect(
			getMarketingEmailHeaderValue(
				{ 'X-Epic-Startup-Message-Id': 'current' },
				'messageId',
			),
		).toBe('current')
	})
})
