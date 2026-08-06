import { type LoaderFunctionArgs } from 'react-router'
import {
	createOrUpdateOpenReplaySession,
	storeOpenReplaySessionData,
	getOpenReplaySessionData,
	deleteOpenReplaySessionData,
	type OpenReplayMessage,
} from '#app/utils/openreplay.server.ts'

/**
 * Test endpoint for OpenReplay session storage
 * GET /api/openreplay/v1/web/test-session
 *
 * This endpoint tests the OpenReplay session storage functionality
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const action = url.searchParams.get('action') || 'test'
	const sessionId = url.searchParams.get('sessionId') || 'test-session-123'

	try {
		switch (action) {
			case 'create': {
				await createOrUpdateOpenReplaySession(
					sessionId,
					'test-project',
					'test-user',
					{ source: 'test' },
				)
				return Response.json({ success: true, message: 'Session created' })
			}

			case 'store': {
				const testMessages: OpenReplayMessage[] = [
					{
						type: 'ConsoleLog',
						timestamp: Date.now(),
						data: {
							level: 'info',
							value: 'Test console log message',
						},
					},
					{
						type: 'MouseClick',
						timestamp: Date.now() + 1000,
						data: {
							elementId: 123,
							selector: '.test-button',
							x: 100,
							y: 200,
						},
					},
					{
						type: 'SetPageLocation',
						timestamp: Date.now() + 2000,
						data: {
							url: 'https://example.com/test',
							referrer: 'https://example.com',
							documentTitle: 'Test Page',
						},
					},
				]

				await storeOpenReplaySessionData(sessionId, testMessages)
				return Response.json({
					success: true,
					message: 'Messages stored',
					count: testMessages.length,
				})
			}

			case 'retrieve': {
				const sessionData = await getOpenReplaySessionData(sessionId)
				if (!sessionData) {
					return Response.json({ error: 'Session not found' }, { status: 404 })
				}
				return Response.json({ success: true, data: sessionData })
			}

			case 'delete': {
				await deleteOpenReplaySessionData(sessionId)
				return Response.json({ success: true, message: 'Session deleted' })
			}

			case 'test':
			default: {
				// Full test cycle
				console.log('Testing OpenReplay session storage...')

				// 1. Create session
				await createOrUpdateOpenReplaySession(
					sessionId,
					'test-project',
					'test-user',
					{ source: 'test' },
				)
				console.log('✓ Session created')

				// 2. Store messages
				const testMessages: OpenReplayMessage[] = [
					{
						type: 'ConsoleLog',
						timestamp: Date.now(),
						data: {
							level: 'info',
							value: 'Test console log message',
						},
					},
					{
						type: 'MouseClick',
						timestamp: Date.now() + 1000,
						data: {
							elementId: 123,
							selector: '.test-button',
							x: 100,
							y: 200,
						},
					},
				]

				await storeOpenReplaySessionData(sessionId, testMessages)
				console.log('✓ Messages stored')

				// 3. Retrieve data
				const sessionData = await getOpenReplaySessionData(sessionId)
				console.log('✓ Data retrieved:', {
					sessionId: sessionData?.sessionId,
					consoleLogs: sessionData?.consoleLogs.length,
					userActions: sessionData?.userActions.length,
				})

				// 4. Clean up
				await deleteOpenReplaySessionData(sessionId)
				console.log('✓ Session deleted')

				return Response.json({
					success: true,
					message: 'OpenReplay session storage test completed successfully',
					results: {
						sessionCreated: true,
						messagesStored: testMessages.length,
						dataRetrieved: !!sessionData,
						sessionDeleted: true,
					},
				})
			}
		}
	} catch (error) {
		console.error('Test error:', error)
		return Response.json(
			{
				error: 'Test failed',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		)
	}
}
