import React from 'react'

import type { PricingBlock as PricingBlockProps } from '@/payload-types'

export const PricingBlock: React.FC<PricingBlockProps> = (props) => {
  const {
    title = 'Choose your plan',
    subtitle = 'Select the perfect plan for your needs',
    plans = [],
    showFooter = true,
    footerText = 'Pre-negotiated discounts are available to early-stage startups and nonprofits.',
    footerButtonText = 'Apply now',
  } = props

  // Calculate discount percentage
  const calculateDiscount = (monthlyPrice: string, yearlyPrice: string): number => {
    const monthly = parseFloat(monthlyPrice)
    const yearly = parseFloat(yearlyPrice)

    if (
      monthlyPrice.toLowerCase() === 'custom' ||
      yearlyPrice.toLowerCase() === 'custom' ||
      isNaN(monthly) ||
      isNaN(yearly) ||
      monthly === 0
    ) {
      return 0
    }

    const discount = ((monthly * 12 - yearly) / (monthly * 12)) * 100
    return Math.round(discount)
  }

  const yearlyDiscount = plans?.length
    ? Math.max(...plans.map((plan) => calculateDiscount(plan.monthlyPrice || '0', plan.yearlyPrice || '0')))
    : 0

  return (
    <section className="relative w-full py-16 md:py-24">
      <div className="container relative mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h3 className="font-mono text-sm uppercase tracking-wide text-muted-foreground mb-6">
            {/* PRICING PLANS */}
          </h3>
          <h2 className="text-4xl md:text-6xl font-light text-primary mb-4">
            {title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex flex-col justify-center items-center mb-12">
          <div className="bg-muted flex h-11 w-fit shrink-0 items-center rounded-md p-1 text-lg">
            <button className="text-muted-foreground bg-background flex h-full cursor-pointer items-center justify-center px-7 font-semibold rounded-md">
              Monthly
            </button>
            <button className="text-muted-foreground flex h-full cursor-pointer items-center justify-center px-7 font-semibold rounded-md">
              Yearly
            </button>
          </div>
          {yearlyDiscount > 0 && (
            <span className="text-xs mt-2 text-muted-foreground">
              Save up to {yearlyDiscount}% with yearly plan
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className={`grid gap-0 border-l border-t border-dashed ${
          plans?.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
          plans?.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' :
          plans?.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {plans?.map((plan, index) => (
            <div 
              key={index}
              className={`border-b border-r border-dashed bg-background relative transition-all duration-200 ${
                plan.highlight 
                  ? 'md:-mt-8 bg-muted/30 hover:bg-gradient-to-b from-muted/10 to-muted/60' 
                  : 'hover:bg-gradient-to-b from-muted/5 to-muted/50'
              } transition-colors`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-secondary text-secondary-foreground px-3 py-1 text-xs rounded-full border border-border">
                  {plan.badge}
                </div>
              )}
              
              {/* Card Header */}
              <div className="p-6 pb-4 border-b border-dashed">
                <div className="space-y-2 mb-4">
                  <h3 className="text-xl font-semibold text-primary border-l-2 border-primary pl-4">
                    {plan.title}
                  </h3>
                  <p className="text-sm text-muted-foreground pl-4">
                    {plan.description}
                  </p>
                </div>
                <div className="space-y-1 pl-4">
                  <span className="text-4xl font-medium text-primary">
                    {parseFloat(plan.monthlyPrice || '0') >= 0 && plan.currency}
                    {plan.monthlyPrice}
                  </span>
                  <p className="text-muted-foreground">Per month</p>
                </div>
              </div>

              {/* Features */}
              <div className="p-6 space-y-4 flex-1">
                {plan.features?.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-sm flex-shrink-0"></div>
                    <span className="text-sm">{feature.name}</span>
                    <span className="ml-auto text-sm text-muted-foreground">Included</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="p-6 pt-0">
                <button
                  className={`w-full inline-flex items-center justify-center font-medium text-sm py-3 px-6 rounded-md transition-colors ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className={`flex items-center justify-between bg-muted/50 p-6 border border-dashed rounded-lg mt-12 ${
            plans?.length === 1 ? 'max-w-md mx-auto' :
            plans?.length === 2 ? 'max-w-4xl mx-auto' : ''
          }`}>
            <div className="flex flex-col md:flex-row gap-4 justify-between w-full">
              <p className="text-lg font-medium text-card-foreground text-left w-full my-auto">
                {footerText}
              </p>
              <button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-2 rounded-md transition-colors font-medium text-sm whitespace-nowrap">
                {footerButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
