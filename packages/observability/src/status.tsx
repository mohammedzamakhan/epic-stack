import { useEffect, useState } from 'react'
import type { StatusInfo } from './types.js'

interface StatusComponentProps {
	/**
	 * The API endpoint that returns status information
	 * This should be an endpoint in your app that calls getUptimeStatus server-side
	 */
	statusEndpoint: string
	/**
	 * Optional CSS class name to apply to the container
	 */
	className?: string
	/**
	 * Optional refresh interval in milliseconds (default: 60000 = 1 minute)
	 */
	refreshInterval?: number
}

const statusColors = {
	operational: 'text-green-600',
	partial_outage: 'text-yellow-600',
	degraded: 'text-red-600',
}

const statusIcons = {
	operational: '●',
	partial_outage: '◐',
	degraded: '○',
}

export function Status({
	statusEndpoint,
	className = '',
	refreshInterval = 60000,
}: StatusComponentProps) {
	const [status, setStatus] = useState<StatusInfo | null>(null)
	const [loading, setLoading] = useState(true)

	const fetchStatus = async () => {
		try {
			const response = await fetch(statusEndpoint)
			if (!response.ok) {
				throw new Error('Failed to fetch status')
			}
			const data = (await response.json()) as StatusInfo
			setStatus(data)
		} catch (error) {
			console.error('Error fetching status:', error)
			setStatus({
				status: 'degraded',
				message: 'Unable to fetch status',
				upMonitors: 0,
				totalMonitors: 0,
			})
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchStatus()

		// Set up polling
		const interval = setInterval(fetchStatus, refreshInterval)

		return () => clearInterval(interval)
	}, [statusEndpoint, refreshInterval])

	if (loading) {
		return (
			<div className={`inline-flex items-center gap-2 ${className}`}>
				<span className="text-gray-400">●</span>
				<span className="text-muted-foreground text-sm">Loading status...</span>
			</div>
		)
	}

	if (!status) {
		return null
	}

	return (
		<div className={`inline-flex items-center gap-2 ${className}`}>
			<span className={statusColors[status.status]}>
				{statusIcons[status.status]}
			</span>
			<span className="text-muted-foreground text-sm">{status.message}</span>
		</div>
	)
}
