import React from 'react'
import { Link, useFetcher } from 'react-router'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Icon } from './ui/icon'
import { type OnboardingProgressData } from '#app/utils/onboarding'

interface OnboardingChecklistProps {
  progress: OnboardingProgressData
  orgSlug: string
  organizationId: string
  variant?: 'sidebar' | 'dashboard'
  className?: string
}

export function OnboardingChecklist({
  progress,
  orgSlug,
  organizationId,
  variant = 'dashboard',
  className = ''
}: OnboardingChecklistProps) {
  const fetcher = useFetcher()

  // Don't show if completed and not visible
  if (progress.isCompleted && !progress.isVisible) {
    return null
  }

  const progressPercentage = (progress.completedCount / progress.totalSteps) * 100

  const handleStepAction = (step: any) => {
    if (!step.actionConfig) return

    switch (step.actionConfig.type) {
      case 'navigate':
        // Navigation will be handled by the Link component
        // Don't auto-complete navigation steps - let auto-detection handle it
        break
      case 'modal':
        // Handle modal opening
        if (step.actionConfig.target === 'command-menu') {
          // Trigger command menu and mark as completed since it's hard to auto-detect
          const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            ctrlKey: true
          })
          document.dispatchEvent(event)
        }
        break
      case 'external':
        window.open(step.actionConfig.target, '_blank')
        break
    }
  }

  const handleHide = () => {
    fetcher.submit(
      { organizationId },
      { method: 'POST', action: `/api/onboarding/hide` }
    )
  }

  if (variant === 'sidebar') {
    return (
      <div className={`relative overflow-hidden px-4 py-3 rounded-lg bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-slate-800/20 border border-slate-600/50 backdrop-blur-sm ${className}`}>
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent opacity-40" />

        <div className="relative z-10">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-sm" />
              <span className="text-sm font-semibold text-white">Get Started</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-white bg-slate-700/80 px-1.5 py-0.5 rounded border border-slate-600/50">
                {progress.completedCount}/{progress.totalSteps}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Progress
              value={progressPercentage}
              className="h-2.5 bg-slate-700/60 border border-slate-600/50 shadow-inner"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-200 font-medium">
                {Math.round(progressPercentage)}% complete
              </span>
              {progressPercentage === 100 && (
                <div className="flex items-center gap-1 text-xs text-white font-medium bg-green-600/80 px-2 py-0.5 rounded-full border border-green-500/50">
                  <Icon name="check" className="w-3 h-3" />
                  Done!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Get Started</h3>
          <p className="text-sm text-muted-foreground">
            {progress.completedCount} of {progress.totalSteps} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {Math.round(progressPercentage)}%
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHide}
            className="h-8 w-8 p-0"
          >
            <Icon name="cross-1" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Progress value={progressPercentage} className="mb-6" />

      <div className="space-y-3">
        {progress.steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${step.isCompleted
              ? 'bg-muted/50 border-muted'
              : 'bg-background border-border hover:bg-muted/30'
              }`}
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${step.isCompleted
              ? 'bg-primary border-primary'
              : 'border-muted-foreground'
              }`}>
              {step.isCompleted && <Icon name="check" className="w-3 h-3 text-primary-foreground" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-sm ${step.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}>
                {step.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {step.description}
              </p>

              {!step.isCompleted && step.actionConfig && (
                <div className="mt-2">
                  {step.actionConfig.type === 'navigate' ? (
                    <Link
                      to={`/app/${orgSlug}${step.actionConfig.target}`}
                      onClick={() => handleStepAction(step)}
                    >
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        {step.actionConfig.label}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => handleStepAction(step)}
                    >
                      {step.actionConfig.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}