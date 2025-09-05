import React from 'react'

import type { FeaturedBlock as FeaturedBlockProps } from '@/payload-types'

export const FeaturedBlock: React.FC<FeaturedBlockProps> = (props) => {
  const {
    title = 'Launch your SaaS faster than ever',
    description = 'Everything you need to build a production-ready SaaS. Authentication, payments, emails, and more - all pre-built and ready to go.',
    buttonText = 'View features',
    buttonUrl = '#features',
    features = [],
  } = props

  return (
    <section className="w-full text-foreground py-16 md:py-24 relative">
      <div className="container px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-0">
          <div className="space-y-6 col-span-6">
            <h2 className="text-4xl md:text-6xl font-light text-primary">
              {title}
            </h2>
            <p className="text-xl text-muted-foreground max-w-[600px]">
              {description}
            </p>
            <a
              href={buttonUrl || '#features'}
              className="inline-flex items-center text-lg font-medium text-primary hover:text-primary/80 border-b-2 border-transparent hover:border-primary/80 transition-colors"
            >
              {buttonText}
            </a>
          </div>
          <div className="grid sm:grid-cols-4 col-span-6">
            <div className="col-span-2 border-l border-muted">
              {features?.slice(0, 2).map((feature, idx) => (
                <div
                  key={idx}
                  className={`space-y-2 border-b border-muted py-4 hover:bg-gradient-to-${
                    idx === 0 ? 'b' : 't'
                  } from-muted/5 to-muted/50 transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-primary pl-4 border-l-2 border-primary">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-md text-muted-foreground pl-4">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="col-span-2 border-r border-muted">
              {features?.slice(2, 4).map((feature, idx) => (
                <div
                  key={idx}
                  className={`space-y-2 border-b border-muted py-4 hover:bg-gradient-to-${
                    idx === 0 ? 'b' : 't'
                  } from-muted/5 to-muted/50 transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-primary pl-4 border-l-2 border-primary">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-md text-muted-foreground pl-4">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
