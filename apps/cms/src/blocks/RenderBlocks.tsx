import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { BuildForBlock } from '@/blocks/BuildFor/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FeaturedBlock } from '@/blocks/Featured/Component'
import { FeatureListBlock } from '@/blocks/FeatureList/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { LogosBlock } from '@/blocks/Logos/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { PricingBlock } from '@/blocks/Pricing/Component'
import { TestimonialsBlock } from '@/blocks/Testimonials/Component'

const blockComponents = {
  archive: ArchiveBlock,
  buildFor: BuildForBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  featured: FeaturedBlock,
  featureList: FeatureListBlock,
  formBlock: FormBlock,
  logos: LogosBlock,
  mediaBlock: MediaBlock,
  pricing: PricingBlock,
  testimonials: TestimonialsBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <div className="my-16" key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </div>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
