import type { Media } from '@/payload-types'
import { createImageCaption } from './helpers'

export const image1: Omit<Media, 'createdAt' | 'id' | 'updatedAt'> = {
  alt: 'Curving abstract shapes with an orange and blue gradient',
  caption: createImageCaption('Andrew Kliatskyi', 'https://unsplash.com/@kirp'),
}
