import type { Payload } from 'payload'

export const getFooterData = async (payload: Payload) => {
  try {
    const footer = await payload.findGlobal({
      slug: 'footer',
      depth: 2,
    })

    return {
      success: true,
      data: footer,
    }
  } catch {
    return {
      success: false,
      error: 'Failed to fetch footer data',
    }
  }
}
