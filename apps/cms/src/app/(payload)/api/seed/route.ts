import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'
import { seed } from '@/endpoints/seed'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await getPayload({ config })

    await seed({
      payload,
      req: {
        payload,
        user: null,
        headers: new Headers(),
        context: {},
      } as any,
    })

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
    })
  } catch (error) {
    console.error('Seeding error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request)
}
