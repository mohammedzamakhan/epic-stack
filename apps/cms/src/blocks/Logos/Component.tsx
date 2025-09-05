import React from 'react'

import type { LogosBlock as LogosBlockProps } from '@/payload-types'

export const LogosBlock: React.FC<LogosBlockProps> = (props) => {
  const { title = '// TRUSTED BY LEADING TEAMS', companies = [] } = props

  return (
    <section className="relative">
      <div className="container relative mx-auto px-4 py-12 md:px-6">
        <h3 className="text-center font-mono text-sm uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <div className="relative mt-6">
          <div className="grid grid-cols-4 border-l border-t border-dashed md:grid-cols-12">
            {companies?.map((company, idx) => (
              <div
                key={idx}
                className="col-span-2 flex items-center justify-center border-b border-r border-dashed bg-background"
              >
                <img
                  width={112}
                  height={40}
                  src={`https://cdn.magicui.design/companies/${company.name}.svg`}
                  className="my-4 h-10 w-28"
                  alt={company.name || 'Company logo'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
