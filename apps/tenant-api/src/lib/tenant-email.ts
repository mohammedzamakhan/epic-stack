import { buildTenantMarketingEmailHeaders } from '@repo/config/marketing-email'
import {
	sendOciEmail,
	type SendOciEmailInput,
	type SendOciEmailResult,
} from '@repo/email'

export type TenantEmailContext = {
	orgId: string
	campaignId?: string
	journeyId?: string
	customerId?: string
	messageId?: string
}

export async function sendTenantEmail(
	input: Omit<SendOciEmailInput, 'headerFields' | 'messageId'> & {
		context?: TenantEmailContext
	},
): Promise<SendOciEmailResult> {
	const headerFields = input.context
		? buildTenantMarketingEmailHeaders(input.context)
		: {}

	return sendOciEmail({
		...input,
		messageId: input.context?.messageId,
		headerFields:
			Object.keys(headerFields).length > 0 ? headerFields : undefined,
	})
}
