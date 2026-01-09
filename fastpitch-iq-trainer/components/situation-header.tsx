"use client"

import type { GameMode, Position, QuestionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SituationHeaderProps {
  situation: string
  role: Position
  questionType: QuestionType
  mode: GameMode
  currentQuestion: number
  totalQuestions: number
  timeRemaining: number
  totalTime: number
}

export function SituationHeader({
  situation,
  role,
  questionType,
  mode,
  currentQuestion,
  totalQuestions,
  timeRemaining,
  totalTime,
}: SituationHeaderProps) {
  const progress = (timeRemaining / totalTime) * 100

  return (
    <div className="space-y-4">
      {/* Top bar with mode and progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {mode === "my-positions" ? "My Positions" : "Whole Field"}
        </span>
        <span className="text-sm font-semibold text-card-foreground">
          {currentQuestion} / {totalQuestions}
        </span>
      </div>

      {/* Timer bar */}
      <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-100",
            progress > 30 ? "bg-primary" : progress > 10 ? "bg-yellow-500" : "bg-destructive",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Situation text */}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-card-foreground leading-tight text-balance">{situation}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            You are <span className="font-semibold text-primary">{role}</span>
          </span>
          {questionType === "throw" && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">Throw decision</span>
          )}
        </div>
      </div>
    </div>
  )
}
