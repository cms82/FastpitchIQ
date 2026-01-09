"use client"

import type { AnswerOption } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AnswerGridProps {
  options: AnswerOption[]
  onSelect: (optionId: string) => void
  disabled?: boolean
}

export function AnswerGrid({ options, onSelect, disabled = false }: AnswerGridProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border pb-safe">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className={cn("grid gap-3", options.length <= 2 ? "grid-cols-1" : "grid-cols-2")}>
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              disabled={disabled}
              className={cn(
                "min-h-[56px] px-4 py-3 rounded-xl font-semibold text-base",
                "bg-card border-2 border-border text-card-foreground",
                "transition-all duration-150",
                "hover:border-primary/50 hover:bg-primary/5",
                "active:scale-[0.97] active:bg-primary active:text-primary-foreground active:border-primary",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
