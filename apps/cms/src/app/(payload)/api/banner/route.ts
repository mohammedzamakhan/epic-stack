import { getPayload } from 'payload'
import config from '@payload-config'
import { getBannerData } from '@/endpoints/banner'

export async function GET() {
  const payload = await getPayload({ config })
  const result = await getBannerData(payload)

  if (!result.success) {
    return Response.json(result, { status: 500 })
  }

  return Response.json(result, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
