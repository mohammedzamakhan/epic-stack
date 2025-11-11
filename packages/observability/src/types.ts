import { z } from 'zod'

export const MonitorSchema = z.object({
	id: z.string(),
	attributes: z.object({
		url: z.string(),
		pronounceable_name: z.string(),
		status: z.enum(['up', 'down', 'paused', 'maintenance']),
	}),
})

export const MonitorsResponseSchema = z.object({
	data: z.array(MonitorSchema),
})

export type Monitor = z.infer<typeof MonitorSchema>
export type MonitorsResponse = z.infer<typeof MonitorsResponseSchema>

export type StatusType = 'operational' | 'partial_outage' | 'degraded'

export interface StatusInfo {
	status: StatusType
	message: string
	upMonitors: number
	totalMonitors: number
}
