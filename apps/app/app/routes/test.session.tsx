import { useLoaderData, type LoaderFunctionArgs } from 'react-router'

import RecordingViewer from '#app/components/recording-viewer.tsx'

export async function loader({
	request: _request,
	params: _params,
}: LoaderFunctionArgs) {
	// Fetch the actual session data from the API
	const sessionId = '2c0a1282-e333-43dc-ad93-b0913169d766'

	try {
		const response = await fetch(
			`http://localhost:3001/api/openreplay/v1/web/session/${sessionId}`,
		)
		if (response.ok) {
			const data = await response.json()
			console.log('Fetched session data:', data)
			return { data }
		}
	} catch (error) {
		console.error('Failed to fetch session data:', error)
	}

	// Fallback to empty data
	return {
		data: {
			metadata: {
				id: sessionId,
				url: 'Test Session',
				timestamp: new Date().toISOString(),
				os: 'Unknown',
				browser: 'Unknown',
				windowSize: 'Unknown',
				country: 'US',
				countryFlag: '🇺🇸',
				batteryStatus: 'Unknown',
				customMetadata: {},
			},
			consoleLogs: [],
			networkRequests: [],
			userActions: [],
			navigation: [],
		},
	}
}

export default function TestSession() {
	const { data } = useLoaderData<typeof loader>()

	console.log('Test session data:', data)

	return (
		<>
			<RecordingViewer data={data} />
		</>
	)
}
