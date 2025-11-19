import type { Media } from '@/payload-types'
import { createImageCaption } from './helpers'

export const image3: Omit<Media, 'createdAt' | 'id' | 'updatedAt'> = {
  alt: 'Straight metallic shapes with an orange and blue gradient',
  caption: createImageCaption('Andrew Kliatskyi', 'https://unsplash.com/@kirp'),
}
