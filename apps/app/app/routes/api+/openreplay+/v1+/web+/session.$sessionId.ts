import { type LoaderFunctionArgs } from 'react-router'
import { getOpenReplaySessionData } from '#app/utils/openreplay.server.ts'

/**
 * Get OpenReplay session data
 * GET /api/openreplay/v1/web/session/:sessionId
 *
 * This endpoint retrieves processed OpenReplay session data for display
 * in the recorder interface and recording viewer.
 */
export async function loader({ params }: LoaderFunctionArgs) {
	const { sessionId } = params

	if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
		return Response.json({ error: 'Invalid session ID' }, { status: 400 })
	}

	try {
		const sessionData = await getOpenReplaySessionData(sessionId)

		if (!sessionData) {
			return Response.json({ error: 'Session not found' }, { status: 404 })
		}

		// Transform the data to match the RecordingSessionData interface expected by the frontend
		const response = {
			metadata: {
				id: sessionData.sessionId,
				url: sessionData.navigation[0]?.url || 'Unknown',
				timestamp: new Date().toISOString(),
				os: 'Unknown',
				browser: 'Unknown',
				windowSize: 'Unknown',
				country: 'US',
				countryFlag: '🇺🇸',
				batteryStatus: 'Unknown',
				customMetadata: {
					totalMessages: (
						sessionData.consoleLogs.length +
						sessionData.networkRequests.length +
						sessionData.userActions.length +
						sessionData.navigation.length
					).toString(),
				},
			},
			consoleLogs: sessionData.consoleLogs.map((log) => ({
				type: 'ConsoleLog' as const,
				timestamp: log.timestamp,
				level: log.level,
				value: log.value, // Use 'value' not 'message' to match interface
			})),
			networkRequests: sessionData.networkRequests.map((req) => ({
				type: 'NetworkRequest' as const,
				requestType: 'fetch',
				method: req.method || 'GET',
				url: req.url || '',
				request: req.request || '',
				response: req.response || '',
				status: req.status || 0,
				timestamp: req.timestamp,
				duration: req.duration || 0,
				transferredBodySize: 0,
			})),
			userActions: sessionData.userActions.map((action) => ({
				type: action.type as any,
				timestamp: action.timestamp,
				elementId: action.elementId,
				selector: action.selector,
				value: action.value,
				x: action.x,
				y: action.y,
			})),
			navigation: sessionData.navigation.map((nav) => ({
				type: 'SetPageLocation' as const,
				timestamp: nav.timestamp,
				url: nav.url,
				referrer: nav.referrer || '',
				navigationStart: nav.timestamp,
				documentTitle: nav.documentTitle || '',
			})),
		}

		return Response.json(response, {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			},
		})
	} catch (error) {
		console.error('Error retrieving session data:', error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	}
}
