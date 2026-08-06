import { useLoaderData, type LoaderFunctionArgs } from 'react-router'

import RecordingViewer from '#app/components/recording-viewer.tsx'

export async function loader({
	request: _request,
	params: _params,
}: LoaderFunctionArgs) {
	return {
		data: {
			metadata: {
				id: '855caa4e-3939-4fb3-bb25-59a11c2cc4d5',
				url: 'https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/',
				timestamp: 'December 15, 2025 at 3:49 AM CDT',
				os: 'macOS (arm) 15.6.1',
				browser: 'Chrome 140.0.7339.133',
				windowSize: '1728x992',
				country: 'United States',
				countryFlag: '🇺🇸',
				batteryStatus: 'Battery below 20%',
				customMetadata: {
					activeTeamId: '855caa4e-3939-4fb3-bb25-59a11c2cc4d5',
					userId: '874d2bcf-9e6e-4323-8035-9cc4c5c6c5ad',
					sessionType: 'debug',
					appVersion: '2.1.0',
				},
			},
			consoleLogs: [
				{
					type: 'ConsoleLog' as const,
					timestamp: 538985978,
					level: 'warn',
					value: 'Tracker started',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538987515,
					level: '',
					value: '[API Test] Testing GET endpoint...',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538987930,
					level: '',
					value:
						'[API Test] GET Success: {success: true, message: GET request successful, data: [object Object]}',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538987930,
					level: '',
					value:
						'[API Test] Received user data: {id: 1, name: John Doe, email: john.doe@example.com, createdAt: 2025-12-15T03:49:06.162Z}',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538988505,
					level: '',
					value: '[API Test] Testing POST endpoint...',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538988505,
					level: '',
					value: '[API Test] Sending data: {name: a, email: a}',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538988506,
					level: '',
					value:
						'[API Test] POST Success: {success: true, message: POST request successful, receivedData: [object Object], timestamp: 2025-12-15T03:49:07.011Z}',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538988506,
					level: '',
					value: '[API Test] Server echoed back: {name: a, email: a}',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538989561,
					level: '',
					value: '[API Test] Testing PUT endpoint...',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538989561,
					level: '',
					value: '[API Test] Sending data: {name: a, email: a}',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538989496,
					level: 'error',
					value:
						'[API Test] PUT Error: {success: false, message: PUT request failed, error: This endpoint always fails, attemptedData: [object Object]}',
				},
				{
					type: 'ConsoleLog' as const,
					timestamp: 538989496,
					level: '',
					value: '[API Test] Data that was sent: {name: a, email: a}',
				},
			],
			networkRequests: [
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'GET',
					url: 'https://httpbin.org/get?test=123&debug=true',
					request:
						'{"headers":{"Accept":"application/json","User-Agent":"BugBasher-Test/1.0","X-Custom-Header":"test-value"},"body":""}',
					response:
						'{"headers":{"content-type":"application/json","content-length":"324"},"body":"{\\"args\\":{\\"test\\":\\"123\\",\\"debug\\":\\"true\\"},\\"headers\\":{\\"Accept\\":\\"application/json\\",\\"Host\\":\\"httpbin.org\\",\\"User-Agent\\":\\"BugBasher-Test/1.0\\",\\"X-Custom-Header\\":\\"test-value\\"},\\"origin\\":\\"192.168.1.100\\",\\"url\\":\\"https://httpbin.org/get?test=123&debug=true\\"}"}',
					status: 200,
					timestamp: 538987512,
					duration: 245,
					transferredBodySize: 324,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'POST',
					url: 'https://httpbin.org/post',
					request:
						'{"headers":{"Accept":"application/json","Content-Type":"application/json","X-Test-Header":"post-request"},"body":"{\\"name\\":\\"Test User\\",\\"email\\":\\"test@example.com\\",\\"data\\":{\\"nested\\":true,\\"timestamp\\":1767051307766}}"}',
					response:
						'{"headers":{"content-type":"application/json","content-length":"486"},"body":"{\\"args\\":{},\\"data\\":\\"{\\\\\\"name\\\\\\":\\\\\\"Test User\\\\\\",\\\\\\"email\\\\\\":\\\\\\"test@example.com\\\\\\",\\\\\\"data\\\\\\":{\\\\\\"nested\\\\\\":true,\\\\\\"timestamp\\\\\\":1767051307766}}\\",\\"files\\":{},\\"form\\":{},\\"headers\\":{\\"Accept\\":\\"application/json\\",\\"Content-Type\\":\\"application/json\\",\\"Host\\":\\"httpbin.org\\",\\"X-Test-Header\\":\\"post-request\\"},\\"json\\":{\\"name\\":\\"Test User\\",\\"email\\":\\"test@example.com\\",\\"data\\":{\\"nested\\":true,\\"timestamp\\":1767051307766}},\\"origin\\":\\"192.168.1.100\\",\\"url\\":\\"https://httpbin.org/post\\"}"}',
					status: 200,
					timestamp: 538988479,
					duration: 312,
					transferredBodySize: 486,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'PUT',
					url: 'https://httpbin.org/put',
					request:
						'{"headers":{"Accept":"application/json","X-Update-Header":"put-request"},"body":"action=update&userId=123&status=active"}',
					response:
						'{"headers":{"content-type":"application/json","content-length":"398"},"body":"{\\"args\\":{},\\"data\\":\\"\\",\\"files\\":{},\\"form\\":{\\"action\\":\\"update\\",\\"userId\\":\\"123\\",\\"status\\":\\"active\\"},\\"headers\\":{\\"Accept\\":\\"application/json\\",\\"Host\\":\\"httpbin.org\\",\\"X-Update-Header\\":\\"put-request\\"},\\"json\\":null,\\"origin\\":\\"192.168.1.100\\",\\"url\\":\\"https://httpbin.org/put\\"}"}',
					status: 200,
					timestamp: 538989534,
					duration: 189,
					transferredBodySize: 398,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'POST',
					url: 'https://httpbin.org/status/500',
					request:
						'{"headers":{"Accept":"application/json","Content-Type":"application/json"},"body":"{\\"test\\":\\"error case\\",\\"shouldFail\\":true}"}',
					response:
						'{"headers":{"content-type":"text/html","content-length":"0"},"body":"Internal Server Error"}',
					status: 500,
					timestamp: 538989496,
					duration: 156,
					transferredBodySize: 0,
				},
			],
			userActions: [
				{
					type: 'SetViewportScroll' as const,
					timestamp: 538985978,
					x: 0,
					y: 0,
				},
				{
					type: 'SelectionChange' as const,
					timestamp: 538985978,
					selectionStart: 0,
					selectionEnd: 0,
					selection: '',
				},
				{
					type: 'SetInputValue' as const,
					timestamp: 538985978,
					elementId: 34,
					value: '',
					mask: 0,
				},
				{
					type: 'SetInputValue' as const,
					timestamp: 538985978,
					elementId: 38,
					value: '',
					mask: 0,
				},
				{
					type: 'SelectionChange' as const,
					timestamp: 538986429,
					selectionStart: 0,
					selectionEnd: 0,
					selection: '',
				},
				{
					type: 'SetInputValue' as const,
					timestamp: 538986460,
					elementId: 34,
					value: '',
					mask: 1,
				},
				{
					type: 'InputChange' as const,
					timestamp: 538986910,
					elementId: 34,
					value: '',
					valueMasked: true,
					label: 'Name',
					hesitationTime: 0,
					inputDuration: 0,
				},
				{
					type: 'SelectionChange' as const,
					timestamp: 538986910,
					selectionStart: 0,
					selectionEnd: 0,
					selection: '',
				},
				{
					type: 'MouseClick' as const,
					timestamp: 538986968,
					elementId: 38,
					hesitationTime: 341,
					label: 'Email',
					selector: '',
					normalizedX: 5316,
					normalizedY: 1446,
				},
				{
					type: 'SelectionChange' as const,
					timestamp: 538986908,
					selectionStart: 0,
					selectionEnd: 0,
					selection: '',
				},
				{
					type: 'SetInputValue' as const,
					timestamp: 538986908,
					elementId: 38,
					value: '',
					mask: 1,
				},
				{
					type: 'InputChange' as const,
					timestamp: 538987418,
					elementId: 38,
					value: '',
					valueMasked: true,
					label: 'Email',
					hesitationTime: 250,
					inputDuration: 767,
				},
				{
					type: 'MouseClick' as const,
					timestamp: 538987512,
					elementId: 42,
					hesitationTime: 302,
					label: 'Test GET',
					selector:
						'div.container > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)',
					normalizedX: 3430,
					normalizedY: 1953,
				},
				{
					type: 'MouseClick' as const,
					timestamp: 538988479,
					elementId: 48,
					hesitationTime: 223,
					label: 'Test POST',
					selector:
						'div.container > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1)',
					normalizedX: 3182,
					normalizedY: 3489,
				},
				{
					type: 'MouseClick' as const,
					timestamp: 538989534,
					elementId: 54,
					hesitationTime: 256,
					label: 'Test PUT',
					selector:
						'div.container > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(1)',
					normalizedX: 3103,
					normalizedY: 4511,
				},
			],
			navigation: [
				{
					type: 'SetPageLocation' as const,
					timestamp: 538985978,
					url: 'https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/',
					referrer: 'https://v0.app/',
					navigationStart: 538981370,
					documentTitle: 'v0',
				},
			],
		},
	}
}

export default function DemoRecording() {
	const { data } = useLoaderData<typeof loader>()

	// Debug logging to see what's in the network requests
	console.log('Demo recording data:', data)
	console.log('Network requests:', data.networkRequests)

	// Test parsing the first POST request
	if (data.networkRequests.length > 1) {
		const postRequest = data.networkRequests[1]
		console.log('POST request data:', postRequest)
		console.log('POST request.request:', postRequest.request)
		console.log('POST request.response:', postRequest.response)

		// Test the parsing functions
		try {
			const parsedRequest = JSON.parse(postRequest.request)
			console.log('Parsed request:', parsedRequest)
			console.log('Request body:', parsedRequest.body)

			const parsedResponse = JSON.parse(postRequest.response)
			console.log('Parsed response:', parsedResponse)
			console.log('Response body:', parsedResponse.body)
		} catch (error) {
			console.error('Parsing error:', error)
		}
	}

	return (
		<>
			<RecordingViewer data={data} />
		</>
	)
}
