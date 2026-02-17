import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add CORS headers for media file requests (needed for WebGL textures)
  if (request.nextUrl.pathname.startsWith('/api/media/')) {
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }

    // For actual requests, clone the response and add CORS headers
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/media/:path*',
}
