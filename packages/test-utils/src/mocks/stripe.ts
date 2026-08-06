import { http, passthrough } from 'msw'

export const handlers = [
	// Completely passthrough all Stripe API calls - don't intercept them at all
	http.get('https://api.stripe.com/*', ({ request }) => {
		console.log('MSW: passthroughing Stripe GET request:', request.url)
		return passthrough()
	}),
	http.post('https://api.stripe.com/*', ({ request }) => {
		console.log('MSW: passthroughing Stripe POST request:', request.url)
		return passthrough()
	}),
	http.put('https://api.stripe.com/*', ({ request }) => {
		console.log('MSW: passthroughing Stripe PUT request:', request.url)
		return passthrough()
	}),
	http.delete('https://api.stripe.com/*', ({ request }) => {
		console.log('MSW: passthroughing Stripe DELETE request:', request.url)
		return passthrough()
	}),
	http.patch('https://api.stripe.com/*', ({ request }) => {
		console.log('MSW: passthroughing Stripe PATCH request:', request.url)
		return passthrough()
	}),
]
