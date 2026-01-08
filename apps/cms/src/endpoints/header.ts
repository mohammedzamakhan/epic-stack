import type { Payload } from 'payload'

export const getHeaderData = async (payload: Payload) => {
  try {
    const header = await payload.findGlobal({
      slug: 'header',
      depth: 2,
    })

    return {
      success: true,
      data: header,
    }
  } catch {
    return {
      success: false,
      error: 'Failed to fetch header data',
    }
  }
}
