"use client"

import { AlertCircle } from "lucide-react"

interface ContentErrorProps {
  message: string
  onRetry?: () => void
}

export function ContentError({ message, onRetry }: ContentErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground mb-1">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium transition-all active:scale-[0.98]"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
