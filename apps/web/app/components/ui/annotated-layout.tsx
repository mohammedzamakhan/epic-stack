import { type ReactNode } from 'react'

interface AnnotatedLayoutProps {
  children: ReactNode
}

export function AnnotatedLayout({ children }: AnnotatedLayoutProps) {
  return (
    <div className="flex flex-col gap-8 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border [&>*:not(:last-child)]:pb-8">
      {children}
    </div>
  )
}

interface AnnotatedSectionProps {
  title: string
  description: string
  children: ReactNode
}

export function AnnotatedSection({ title, description, children }: AnnotatedSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="space-y-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      <div className="lg:col-span-2">
        {children}
      </div>
    </div>
  )
}
