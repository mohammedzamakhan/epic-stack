import { invariantResponse } from '@epic-web/invariant'
import { prisma } from '@repo/database'
import { useLoaderData, type LoaderFunctionArgs } from 'react-router'

import RecordingViewer from '#app/components/recording-viewer.tsx'
import { type RecordingSessionData } from '#app/lib/types/recording.ts'
import { getOpenReplaySessionData } from '#app/utils/openreplay.server.ts'

export async function loader({
	request: _request,
	params,
}: LoaderFunctionArgs) {
	const { projectId, recordingId } = params
	invariantResponse(projectId, 'Project ID is required')
	invariantResponse(recordingId, 'Recording ID is required')

	const recording = await prisma.recording.findUnique({
		where: {
			id: recordingId,
			projectId,
		},
	})

	invariantResponse(recording, 'Recording not found', { status: 404 })

	let sessionData: RecordingSessionData | null = null

	if (recording.sessionData) {
		try {
			sessionData = JSON.parse(recording.sessionData) as RecordingSessionData
		} catch (e) {
			console.error('Failed to parse session data', e)
		}
	} else if (recording.openReplaySessionId) {
		const openReplayData = await getOpenReplaySessionData(
			recording.openReplaySessionId,
		)

		if (openReplayData) {
			sessionData = {
				metadata: {
					id: openReplayData.sessionId,
					url: openReplayData.navigation[0]?.url || 'Unknown',
					timestamp: new Date().toISOString(),
					os: 'Unknown',
					browser: 'Unknown',
					windowSize: 'Unknown',
					country: 'US',
					countryFlag: '🇺🇸',
					batteryStatus: 'Unknown',
					customMetadata: {
						totalMessages: (
							openReplayData.consoleLogs.length +
							openReplayData.networkRequests.length +
							openReplayData.userActions.length +
							openReplayData.navigation.length
						).toString(),
					},
				},
				consoleLogs: openReplayData.consoleLogs.map((log) => ({
					type: 'ConsoleLog' as const,
					timestamp: log.timestamp,
					level: log.level,
					value: log.value,
				})),
				networkRequests: openReplayData.networkRequests.map((req) => ({
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
				userActions: openReplayData.userActions.map((action) => ({
					type: action.type as any,
					timestamp: action.timestamp,
					elementId: action.elementId,
					selector: action.selector,
					value: action.value,
					x: action.x,
					y: action.y,
				})),
				navigation: openReplayData.navigation.map((nav) => ({
					type: 'SetPageLocation' as const,
					timestamp: nav.timestamp,
					url: nav.url,
					referrer: nav.referrer || '',
					navigationStart: nav.timestamp,
					documentTitle: nav.documentTitle || '',
				})),
			}
		}
	}

	if (!sessionData) {
		sessionData = {
			metadata: {
				id: recording.id,
				url: 'Processing...',
				timestamp: recording.createdAt.toISOString(),
				os: 'Unknown',
				browser: 'Unknown',
				windowSize: 'Unknown',
				country: 'Unknown',
				countryFlag: '❓',
			},
			consoleLogs: [],
			networkRequests: [],
			userActions: [],
			navigation: [],
		}
	}

	let videoUrl: string | undefined
	if (recording.videoObjectKey) {
		const params = new URLSearchParams({
			objectKey: recording.videoObjectKey,
		})
		if (recording.organizationId) {
			params.set('organizationId', recording.organizationId)
		}
		videoUrl = `/resources/video?${params.toString()}`
	}

	return {
		data: sessionData,
		videoUrl,
	}
}

export default function Recording() {
	const { data, videoUrl } = useLoaderData<typeof loader>()
	return (
		<>
			<RecordingViewer data={data} videoUrl={videoUrl} />
		</>
	)
}
