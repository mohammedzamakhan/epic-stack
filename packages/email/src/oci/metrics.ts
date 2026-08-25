import monitoring from 'oci-monitoring'
import { createOciAuthProvider, getOciEmailConfig } from './config.ts'

export type OciMarketingMetrics = {
	emailsSent: number
	openRate: string
	clickRate: string
	source: 'oci' | 'unavailable'
}

function buildResourceFilter(senderOcid?: string) {
	return senderOcid ? `{resourceId = "${senderOcid}"}` : ''
}

async function summarizeMetricTotal(
	client: monitoring.MonitoringClient,
	compartmentId: string,
	query: string,
	start: Date,
	end: Date,
): Promise<number> {
	const response = await client.summarizeMetricsData({
		compartmentId,
		summarizeMetricsDataDetails: {
			namespace: 'oci_emaildelivery',
			query,
			startTime: start,
			endTime: end,
		},
	})

	return (response.items ?? []).reduce((sum, item) => {
		const value = item.aggregatedDatapoints?.[0]?.value
		return sum + (typeof value === 'number' ? value : 0)
	}, 0)
}

/**
 * Pulls aggregate open/click counts from OCI Monitoring (oci_emaildelivery namespace).
 * Rates are computed against relayed emails in the same window.
 */
export async function getOciMarketingMetrics(
	lookbackDays = 30,
): Promise<OciMarketingMetrics | null> {
	const config = getOciEmailConfig()
	if (!config) return null

	const end = new Date()
	const start = new Date(end)
	start.setUTCDate(start.getUTCDate() - lookbackDays)

	const resourceFilter = buildResourceFilter(config.senderOcid)
	const provider = createOciAuthProvider(config)
	const client = new monitoring.MonitoringClient({
		authenticationDetailsProvider: provider,
	})

	try {
		const [relayed, opened, clicked] = await Promise.all([
			summarizeMetricTotal(
				client,
				config.compartmentId,
				`EmailsRelayed[1d]${resourceFilter}.sum()`,
				start,
				end,
			),
			summarizeMetricTotal(
				client,
				config.compartmentId,
				`EmailsOpened[1d]${resourceFilter}.sum()`,
				start,
				end,
			),
			summarizeMetricTotal(
				client,
				config.compartmentId,
				`EmailsClicked[1d]${resourceFilter}.sum()`,
				start,
				end,
			),
		])

		const emailsSent = relayed
		const openRate =
			emailsSent > 0 ? ((opened / emailsSent) * 100).toFixed(1) : '0.0'
		const clickRate =
			emailsSent > 0 ? ((clicked / emailsSent) * 100).toFixed(1) : '0.0'

		return {
			emailsSent,
			openRate,
			clickRate,
			source: 'oci',
		}
	} catch (error) {
		console.error('Failed to load OCI Email Delivery metrics:', error)
		return null
	}
}
