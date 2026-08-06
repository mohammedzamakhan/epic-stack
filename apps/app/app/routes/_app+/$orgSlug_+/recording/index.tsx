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
					url: 'blob:https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/c893bb07-8b63-42f6-a447-adf9ba20b5f4',
					request: '{"headers":{},"body":"{}"}',
					response:
						'{"headers":{"content-length":"937","content-type":"application/javascript"},"body":"[object ArrayBuffer]"}',
					status: 200,
					timestamp: 538987512,
					duration: 5,
					transferredBodySize: 937,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'GET',
					url: 'blob:https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/06673ace-786e-4c34-843f-4e5729448505',
					request: '{"headers":{},"body":"{}"}',
					response:
						'{"headers":{"content-length":"612","content-type":"application/javascript"},"body":"[object ArrayBuffer]"}',
					status: 200,
					timestamp: 538987518,
					duration: 0,
					transferredBodySize: 612,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'GET',
					url: 'https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/api/test-get',
					request: '{"headers":{},"body":"{}"}',
					response:
						'{"headers":{"content-type":"application/json"},"body":"{\\"success\\":true,\\"message\\":\\"GET request successful\\",\\"data\\":{\\"id\\":1,\\"name\\":\\"John Doe\\",\\"email\\":\\"john.doe@example.com\\",\\"createdAt\\":\\"2025-12-15T03:49:06.162Z\\"}}"}',
					status: 200,
					timestamp: 538987512,
					duration: 18,
					transferredBodySize: 155,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'GET',
					url: 'blob:https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/fcd75654-173a-4f5f-9b21-7e446976eb48',
					request: '{"headers":{},"body":"{}"}',
					response:
						'{"headers":{"content-length":"982","content-type":"application/javascript"},"body":"[object ArrayBuffer]"}',
					status: 200,
					timestamp: 538988479,
					duration: 1,
					transferredBodySize: 982,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'POST',
					url: 'https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/api/test-post',
					request:
						'{"headers":{"Content-Type":"application/json"},"body":"{\\"name\\":\\"a\\",\\"email\\":\\"a\\"}"}',
					response:
						'{"headers":{"content-type":"application/json"},"body":"{\\"success\\":true,\\"message\\":\\"POST request successful\\",\\"receivedData\\":{\\"name\\":\\"a\\",\\"email\\":\\"a\\"},\\"timestamp\\":\\"2025-12-15T03:49:07.011Z\\"}"}',
					status: 200,
					timestamp: 538988479,
					duration: 12,
					transferredBodySize: 131,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'GET',
					url: 'blob:https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/51bd3b1c-8a05-4071-8e9d-dc29135dcec2',
					request: '{"headers":{},"body":"{}"}',
					response:
						'{"headers":{"content-length":"1068","content-type":"application/javascript"},"body":"[object ArrayBuffer]"}',
					status: 200,
					timestamp: 538989567,
					duration: 1,
					transferredBodySize: 1068,
				},
				{
					type: 'NetworkRequest' as const,
					requestType: 'fetch',
					method: 'PUT',
					url: 'https://preview-command-example-kzmnd6lsfgn33w0to9qo.vusercontent.net/api/test-put',
					request:
						'{"headers":{"Content-Type":"application/json"},"body":"{\\"name\\":\\"a\\",\\"email\\":\\"a\\"}"}',
					response:
						'{"headers":{"content-type":"application/json"},"body":"{\\"success\\":false,\\"message\\":\\"PUT request failed\\",\\"error\\":\\"This endpoint always fails\\",\\"attemptedData\\":{\\"name\\":\\"a\\",\\"email\\":\\"a\\"}}"}',
					status: 500,
					timestamp: 538989534,
					duration: 12,
					transferredBodySize: 126,
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

export default function Recording() {
	const { data } = useLoaderData<typeof loader>()
	return (
		<>
			<RecordingViewer data={data} />
		</>
	)
}
