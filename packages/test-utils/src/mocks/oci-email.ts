import { faker } from '@faker-js/faker'
import { HttpResponse, http, type HttpHandler } from 'msw'
import { writeOciSubmitEmail } from './utils.ts'

const { json } = HttpResponse

/** Keep in sync with `packages/email/src/oci/mock-transport.ts`. */
const OCI_EMAIL_MOCK_SUBMIT_URL =
	'https://mock.epic-stack.test/oci-email/actions/submitEmail'

const OCI_DATAPLANE_SUBMIT_URL =
	/https:\/\/cell0\.submit\.email\.[^/]+\/actions\/submitEmail$/

async function handleOciSubmitEmail(request: { json: () => Promise<unknown> }) {
	const body = await request.json()
	console.info('🔶 mocked OCI email contents:', body)

	await writeOciSubmitEmail(body)

	return json({
		emailSubmittedResponse: {
			messageId: faker.string.uuid(),
		},
		opcRequestId: faker.string.uuid(),
	})
}

export const handlers: Array<HttpHandler> = [
	http.post(OCI_EMAIL_MOCK_SUBMIT_URL, async ({ request }) => {
		return handleOciSubmitEmail(request)
	}),
	// When OCI_* creds are set in a test env, the SDK hits the regional dataplane URL.
	http.post(OCI_DATAPLANE_SUBMIT_URL, async ({ request }) => {
		return handleOciSubmitEmail(request)
	}),
]
