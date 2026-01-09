import type { Payload } from 'payload'

export const getBannerData = async (payload: Payload) => {
  try {
    const banner = await payload.findGlobal({
      slug: 'banner',
      depth: 2,
    })

    return {
      success: true,
      data: banner,
    }
  } catch {
    return {
      success: false,
      error: 'Failed to fetch banner data',
    }
  }
}
