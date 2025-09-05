import React, { CSSProperties } from 'react'

import type { BuildForBlock as BuildForBlockProps } from '@/payload-types'

interface RippleProps {
  mainCircleSize?: number
  mainCircleOpacity?: number
  numCircles?: number
  className?: string
}

const Ripple = React.memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
}: RippleProps) {
  return (
    <div
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden ${className || ''}`}
      style={{
        maskImage: 'linear-gradient(to bottom, white, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, white, transparent)',
      }}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70
        const opacity = mainCircleOpacity - i * 0.03
        const animationDelay = `${i * 0.06}s`
        const borderOpacity = 5 + i * 5

        const rippleStyle: CSSProperties = {
          width: `${size}px`,
          height: `${size}px`,
          opacity,
          '--duration': '2s',
          '--i': i,
        } as CSSProperties

        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-ripple"
            style={rippleStyle}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-full w-full"
              style={{
                filter: 'drop-shadow(0 20px 13px rgb(0 0 0 / 0.03)) drop-shadow(0 8px 5px rgb(0 0 0 / 0.08))'
              }}
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                className="fill-foreground/25"
                style={{
                  stroke: `hsl(var(--foreground), ${borderOpacity / 100})`,
                  strokeWidth: '0.5px',
                }}
              />
            </svg>
          </div>
        )
      })}
    </div>
  )
})

Ripple.displayName = 'Ripple'

export const BuildForBlock: React.FC<BuildForBlockProps> = (props) => {
  const {
    title = 'Build by developers,',
    highlightText = 'crafted for developers',
    rippleSettings,
  } = props

  const rippleProps = {
    mainCircleSize: rippleSettings?.mainCircleSize || 210,
    mainCircleOpacity: rippleSettings?.mainCircleOpacity || 0.24,
    numCircles: rippleSettings?.numCircles || 8,
  }

  return (
    <section className="relative bg-muted">
      <Ripple {...rippleProps} className="absolute top-0 left-0 w-full h-full overflow-hidden" />
      <div className="container px-4 relative py-36">
        <h2 className="text-4xl md:text-6xl font-normal text-center relative tracking-wide">
          {title}
          <br />
          <span className="bg-gradient-to-r from-[#8b5cf6] from-[28%] via-[#d946ef] via-[70%] to-[#f43f5e] dark:from-[#fff1be] dark:from-[28%] dark:via-[#ee87cb] dark:via-[70%] dark:to-[#b060ff] bg-clip-text text-transparent">
            {highlightText}
          </span>
        </h2>
      </div>
    </section>
  )
}
