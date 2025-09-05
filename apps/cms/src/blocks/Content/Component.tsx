import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/Link'

export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { columns, richText, title, subtitle } = props

  const colsSpanClasses = {
    full: '12',
    half: '6',
    oneThird: '4',
    twoThirds: '8',
  }

  // If we have the new richText field, use the new design
  if (richText) {
    return (
      <section className="relative w-full py-16 md:py-24">
        <div className="container relative mx-auto px-4 md:px-6">
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && (
                <h3 className="font-mono text-sm uppercase tracking-wide text-muted-foreground mb-6">
                  {/* {title} */}
                </h3>
              )}
              {subtitle && (
                <h2 className="text-4xl md:text-6xl font-light text-primary mb-4">
                  {subtitle}
                </h2>
              )}
            </div>
          )}
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-background border border-dashed border-border p-8 md:p-12">
              <RichText data={richText} enableGutter={false} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Legacy column-based design for backward compatibility
  return (
    <div className="container my-16">
      <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-16">
        {columns &&
          columns.length > 0 &&
          columns.map((col, index) => {
            const { enableLink, link, richText, size } = col

            return (
              <div
                className={cn(`col-span-4 lg:col-span-${colsSpanClasses[size!]}`, {
                  'md:col-span-2': size !== 'full',
                })}
                key={index}
              >
                {richText && <RichText data={richText} enableGutter={false} />}

                {enableLink && <CMSLink {...link} />}
              </div>
            )
          })}
      </div>
    </div>
  )
}
