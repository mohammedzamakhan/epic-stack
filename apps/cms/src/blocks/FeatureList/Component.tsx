import React, { useState } from 'react'

import type { FeatureListBlock as FeatureListBlockProps } from '@/payload-types'

interface Feature {
  title: string
  description: string
  image?: string
  backgroundImage?: string
  testimonial?: {
    logo?: string
    logoAlt?: string
    text: string
    companyName?: string
  }
}

export const FeatureListBlock: React.FC<FeatureListBlockProps> = (props) => {
  const {
    title = 'Data for every industry',
    subtitle = 'Regardless of your industry, get the most relevant type of data for you.',
    features = [],
  } = props

  const [currentIndex, setCurrentIndex] = useState(0)
  const totalFeatures = features.length

  // Transform the CMS data structure to match our component interface
  const transformedFeatures: Feature[] = features.map((feature) => ({
    title: feature.title || '',
    description: feature.description || '',
    image: feature.image || undefined,
    backgroundImage: feature.backgroundImage || undefined,
    testimonial: feature.testimonial ? {
      logo: feature.testimonial.logo || undefined,
      logoAlt: feature.testimonial.logoAlt || undefined,
      text: feature.testimonial.text || '',
      companyName: feature.testimonial.companyName || undefined,
    } : undefined,
  }))

  const goToSlide = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalFeatures - 1)))
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < totalFeatures - 1) {
      goToSlide(currentIndex + 1)
    }
  }

  return (
    <section className="relative w-full py-16 md:py-24">
      <div className="container relative mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="mb-8 md:mb-11 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-4xl md:text-6xl font-light text-primary mb-4">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-[600px]">
              {subtitle}
            </p>
          </div>
          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-muted-foreground border border-dashed border-border"
              aria-label="Previous feature"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            {/* Pagination Dots */}
            <div className="flex items-center gap-2 bg-muted p-4 rounded-full border border-dashed border-border">
              {transformedFeatures.map((_, index) => (
                <button 
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    index === currentIndex
                      ? 'bg-primary w-4'
                      : 'bg-muted-foreground hover:bg-primary/60'
                  }`}
                  aria-label={`Go to feature ${index + 1}`}
                />
              ))}
            </div>
            <button 
              onClick={goToNext}
              disabled={currentIndex === totalFeatures - 1}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 text-muted-foreground border border-dashed border-border"
              aria-label="Next feature"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Feature Cards Container */}
        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out gap-5"
            style={{
              transform: `translateX(-${currentIndex * (window.innerWidth < 768 ? window.innerWidth * 0.9 + 20 : 620)}px)`
            }}
          >
            {transformedFeatures.map((feature, index) => (
              <div key={index} className="flex-shrink-0 w-[90vw] md:w-[600px]">
                {/* Content Section */}
                <div className="py-6 min-h-[150px]">
                  <h5 className="mb-3 text-primary text-2xl md:text-3xl font-medium border-l-2 border-primary pl-4">
                    {feature.title}
                  </h5>
                  <p className="text-muted-foreground leading-relaxed max-w-[500px] pl-4">
                    {feature.description}
                  </p>
                </div>

                {/* Image Section */}
                <div className="relative">
                  {feature.backgroundImage && (
                    <div 
                      className="h-80 relative bg-cover bg-center bg-no-repeat rounded-lg border border-dashed border-border overflow-hidden"
                      style={{ backgroundImage: `url(${feature.backgroundImage})` }}
                    >
                      {feature.testimonial && (
                        <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm border-t border-dashed border-border p-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div className="flex items-center gap-3">
                              {feature.testimonial.logo && (
                                <img 
                                  src={feature.testimonial.logo}
                                  alt={feature.testimonial.logoAlt || feature.testimonial.companyName}
                                  className="h-8 w-auto object-contain"
                                />
                              )}
                              {!feature.testimonial.logo && feature.testimonial.companyName && (
                                <div className="text-sm font-medium text-primary">
                                  {feature.testimonial.companyName}
                                </div>
                              )}
                            </div>
                            <div className="max-w-[420px]">
                              <p className="text-sm text-muted-foreground leading-tight">
                                {feature.testimonial.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {feature.image && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-8 md:top-16 w-[260px] md:w-[380px]">
                      <div className="bg-background rounded-lg overflow-hidden h-[260px] md:h-[380px] border border-dashed border-border shadow-lg">
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className="hidden md:block h-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
