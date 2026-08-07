export const prerender = false

export async function GET() {
	return new Response(
		JSON.stringify({
			status: 'ok',
			message: 'Sites status endpoint operational',
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=60',
			},
		},
	)
}
