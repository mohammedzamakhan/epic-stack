export const prerender = false

function appOrigin() {
	return (process.env.PUBLIC_APP_URL || 'http://localhost:3001').replace(
		/\/$/,
		'',
	)
}

async function proxyVideo(request: Request) {
	const incoming = new URL(request.url)
	const upstreamUrl = `${appOrigin()}/resources/videos/source${incoming.search}`
	const headers = new Headers()
	const range = request.headers.get('Range')
	if (range) headers.set('Range', range)

	let upstream: Response
	try {
		upstream = await fetch(upstreamUrl, {
			method: request.method === 'HEAD' ? 'HEAD' : 'GET',
			headers,
		})
	} catch {
		return new Response('Bad Gateway', { status: 502 })
	}

	const out = new Headers()
	for (const name of [
		'content-type',
		'content-length',
		'content-range',
		'accept-ranges',
		'cache-control',
		'etag',
		'last-modified',
	]) {
		const value = upstream.headers.get(name)
		if (value) out.set(name, value)
	}

	return new Response(request.method === 'HEAD' ? null : upstream.body, {
		status: upstream.status,
		headers: out,
	})
}

export function GET({ request }: { request: Request }) {
	return proxyVideo(request)
}

export function HEAD({ request }: { request: Request }) {
	return proxyVideo(request)
}
