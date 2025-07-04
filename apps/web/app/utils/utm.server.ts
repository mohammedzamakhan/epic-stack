import { createCookieSessionStorage } from 'react-router'
import { getEnv } from './env.server'

export type UtmParams = {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  referrer?: string
}

// Session storage for temporarily storing UTM parameters
const ENV = getEnv()

const utmSessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'epic_utm',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: ['UTM_SESSION_SECRET'], // Use a simple secret for development
    secure: ENV.MODE === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
})

// Extract UTM parameters from request URL
export async function extractUtmParams(request: Request): Promise<UtmParams | null> {
  const url = new URL(request.url)
  
  const source = url.searchParams.get('utm_source')
  const medium = url.searchParams.get('utm_medium')
  const campaign = url.searchParams.get('utm_campaign')
  const term = url.searchParams.get('utm_term')
  const content = url.searchParams.get('utm_content')
  const ref = url.searchParams.get('ref')

  // Only return an object if at least one UTM parameter is present
  if (source || medium || campaign || term || content || ref) {
    return {
      source: source || undefined,
      medium: medium || undefined,
      campaign: campaign || undefined,
      term: term || undefined,
      content: content || undefined,
      referrer: ref || undefined,
    }
  }

  return null
}

// Store UTM parameters in session
export async function storeUtmParams(request: Request): Promise<Response | null> {
  const utmParams = await extractUtmParams(request)
  
  if (!utmParams) {
    return null
  }

  const session = await utmSessionStorage.getSession(request.headers.get('cookie'))
  
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) {
      session.set(key, value)
    }
  })

  return new Response(null, {
    headers: {
      'Set-Cookie': await utmSessionStorage.commitSession(session),
    },
  })
}

// Get stored UTM parameters from session
export async function getUtmParams(request: Request): Promise<UtmParams | null> {
  const session = await utmSessionStorage.getSession(request.headers.get('cookie'))
  
  const source = session.get('source')
  const medium = session.get('medium')
  const campaign = session.get('campaign')
  const term = session.get('term')
  const content = session.get('content')
  const referrer = session.get('referrer')

  if (source || medium || campaign || term || content || referrer) {
    return {
      source,
      medium,
      campaign,
      term,
      content,
      referrer,
    }
  }

  return null
}

// Clear UTM parameters from session
export async function clearUtmParams(request: Request): Promise<Response> {
  const session = await utmSessionStorage.getSession(request.headers.get('cookie'))
  
  return new Response(null, {
    headers: {
      'Set-Cookie': await utmSessionStorage.destroySession(session),
    },
  })
}
