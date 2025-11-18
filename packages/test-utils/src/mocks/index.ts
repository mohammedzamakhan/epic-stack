import closeWithGrace from 'close-with-grace'
import { setupServer } from 'msw/node'
import { handlers as githubHandlers } from './github.ts'
import { handlers as pwnedPasswordApiHandlers } from './pwned-passwords.ts'
import { handlers as resendHandlers } from './resend.ts'
import { handlers as stripeHandlers } from './stripe.ts'
import { handlers as tigrisHandlers } from './tigris.ts'

export const server = setupServer(
    ...stripeHandlers, // Put Stripe handlers first so they take precedence
    ...resendHandlers,
    ...githubHandlers,
    ...tigrisHandlers,
    ...pwnedPasswordApiHandlers,
)

// Add request interceptor to completely bypass Stripe requests
server.events.on('request:start', ({ request }) => {
    if (request.url.includes('api.stripe.com')) {
        console.log(
            'MSW: Intercepted Stripe request, attempting to bypass:',
            request.url,
        )
    }
})

// Configure MSW to bypass Stripe entirely
const bypassUrls = [
    'api.stripe.com',
    'stripe.com',
    '.sentry.io',
    '__rrdt',
    'api.novu.co',
]

server.listen({
    onUnhandledRequest(request, print) {
        const url = request.url

        // Check if this request should be bypassed entirely
        if (bypassUrls.some((pattern) => url.includes(pattern))) {
            if (url.includes('api.stripe.com')) {
                console.log('MSW: Bypassing Stripe request:', url)
            }
            return // Don't print warning, just let it pass through
        }

        // Print the regular MSW unhandled request warning for other requests
        print.warning()
    },
})

if (process.env.NODE_ENV !== 'test') {
    console.info('🔶 Mock server installed')

    closeWithGrace(() => {
        server.close()
    })
}

