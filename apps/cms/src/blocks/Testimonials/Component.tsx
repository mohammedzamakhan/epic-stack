import React from 'react'

import type { TestimonialsBlock as TestimonialsBlockProps } from '@/payload-types'

interface Author {
  name: string
  title: string
  company: string
  image: string
}

interface Testimonial {
  quote: string
  author: Author
  variant?: 'default' | 'stripe' | 'vercel'
}

export const TestimonialsBlock: React.FC<TestimonialsBlockProps> = (props) => {
  const {
    title = 'What our customers say',
    subtitle = 'about collaborating with us',
    testimonials = [],
  } = props

  // Transform the CMS data structure to match our component interface
  const transformedTestimonials: Testimonial[] = (testimonials || []).map((testimonial) => ({
    quote: testimonial.quote || '',
    author: {
      name: testimonial.authorName || '',
      title: testimonial.authorTitle || '',
      company: testimonial.authorCompany || '',
      image: testimonial.authorImage || 'https://i.pravatar.cc/150?img=1',
    },
    variant: (testimonial.variant as 'default' | 'stripe' | 'vercel') || 'default',
  }))

  return (
    <section className="relative w-full bg-gradient-to-br pt-12">
      <div className="container relative px-4 md:px-6">
        <div className="mb-8 flex flex-col items-center space-y-4">
          <h3 className="text-center font-mono text-sm uppercase tracking-wide text-muted-foreground">
            {/* WHAT PEOPLE ARE SAYING */}
          </h3>
          <h2 className="max-w-4xl text-center text-3xl tracking-tight sm:text-5xl md:text-6xl">
            {title}
            <br />
            {subtitle}
          </h2>
        </div>
      </div>
      <div className="mt-12 w-full border-y border-dashed">
        <div className="container relative px-4 md:px-6">
          <div className="relative border-muted bg-background">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {transformedTestimonials.map((testimonial, index) => {
                const isFirstCard = index === 0
                const isStripeCard = testimonial.variant === 'stripe'
                const isVercelCard = testimonial.variant === 'vercel'
                
                return (
                  <div
                    key={index}
                    className={`border-foreground/1 transition-colors border border-dashed ${
                      isFirstCard
                        ? 'row-span-2 border-foreground/10 bg-muted shadow-lg hover:bg-muted/50'
                        : isStripeCard
                        ? 'bg-foreground text-background shadow-lg md:row-span-2 border-foreground'
                        : isVercelCard
                        ? 'bg-primary text-primary-foreground shadow-lg hover:bg-primary/90'
                        : 'bg-background hover:bg-muted/50'
                    } ${index === 7 ? 'lg:hidden' : ''}`}
                  >
                    <div className="p-6 flex h-full flex-col justify-between">
                      {(isFirstCard || isStripeCard) && (
                        <div className="mb-6">
                          {isFirstCard ? (
                            <svg
                              width="32"
                              height="32"
                              viewBox="0 0 76 65"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-foreground"
                            >
                              <path
                                d="M37.5274 0L75.0548 65H0L37.5274 0Z"
                                fill="currentColor"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="96"
                              height="40"
                              viewBox="0 0 96 40"
                              fill="currentColor"
                              className="text-background"
                            >
                              <path d="M8.954 14.517c-2.29 0-4.147 1.057-4.147 3.072 0 1.496.812 2.486 2.994 3.127l1.993.587c1.087.321 1.596.724 1.596 1.427 0 .862-.87 1.403-2.112 1.403-1.267 0-2.194-.587-2.29-1.68H4.75c.12 1.888 1.752 3.204 4.252 3.204 2.397 0 4.3-1.195 4.3-3.149 0-1.633-.893-2.552-2.994-3.171l-1.895-.54c-1.136-.346-1.704-.724-1.704-1.427 0-.817.845-1.333 2.002-1.333 1.184 0 1.98.54 2.087 1.61h2.194c-.083-1.935-1.728-3.13-4.036-3.13zm9.835 0c-3.185 0-5.15 2.2-5.15 5.722 0 3.523 1.965 5.722 5.15 5.722 3.173 0 5.15-2.199 5.15-5.722 0-3.522-1.977-5.722-5.15-5.722zm0 1.957c1.74 0 2.835 1.45 2.835 3.765 0 2.304-1.095 3.765-2.835 3.765-1.752 0-2.835-1.461-2.835-3.765 0-2.315 1.083-3.765 2.835-3.765z" />
                            </svg>
                          )}
                        </div>
                      )}
                      <blockquote className="mb-4 text-lg">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-full">
                          <img
                            src={testimonial.author.image}
                            alt={testimonial.author.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {testimonial.author.name}
                          </div>
                          <div className={`text-sm ${
                            isStripeCard 
                              ? 'text-muted' 
                              : 'text-muted-foreground'
                          }`}>
                            {testimonial.author.title} / {testimonial.author.company}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
