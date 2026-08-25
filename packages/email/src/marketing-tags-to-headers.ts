import {
	buildTenantMarketingEmailHeaders,
	getMarketingEmailTagValue,
} from '@repo/config/marketing-email'

/** Map Resend-style marketing tags to OCI SMTP headers for log correlation. */
export function marketingTagsToOciHeaders(
	tags?: Record<string, string>,
): Record<string, string> | undefined {
	if (!tags) return undefined

	const messageId = getMarketingEmailTagValue(tags, 'messageId')
	const campaignId = getMarketingEmailTagValue(tags, 'campaignId')
	if (!messageId && !campaignId) return undefined

	return buildTenantMarketingEmailHeaders({
		messageId: messageId ?? undefined,
		campaignId: campaignId ?? undefined,
	})
}

export function getMarketingMessageIdFromTags(
	tags?: Record<string, string>,
): string | undefined {
	return getMarketingEmailTagValue(tags, 'messageId') ?? undefined
}
