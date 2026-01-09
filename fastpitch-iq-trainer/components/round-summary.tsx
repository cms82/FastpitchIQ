"use client"

import type { RoundSummaryData } from "@/lib/types"
import { Trophy, Clock, AlertTriangle } from "lucide-react"

interface RoundSummaryProps {
  data: RoundSummaryData
  onPlayAgain: () => void
  onSwitchMode: () => void
  onViewProgress: () => void
}

export function RoundSummary({ data, onPlayAgain, onSwitchMode, onViewProgress }: RoundSummaryProps) {
  const percentage = Math.round((data.score / data.total) * 100)
  const isGreat = percentage >= 80
  const isGood = percentage >= 60

  return (
    <div className="py-8 space-y-8">
      {/* Score display */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
          <Trophy className={`w-10 h-10 ${isGreat ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div>
          <h1 className="text-5xl font-bold text-card-foreground">
            {data.score} / {data.total}
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            {isGreat ? "Excellent!" : isGood ? "Good job!" : "Keep practicing!"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold text-card-foreground">{data.avgResponseTime.toFixed(1)}s</p>
          <p className="text-xs text-muted-foreground">Avg Response</p>
        </div>
        {data.weakSpot && (
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold text-card-foreground">{data.weakSpot}</p>
            <p className="text-xs text-muted-foreground">Weak Spot</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={onPlayAgain}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg transition-all active:scale-[0.98]"
        >
          Play Again
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSwitchMode}
            className="py-3 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all active:scale-[0.98]"
          >
            Switch Mode
          </button>
          <button
            onClick={onViewProgress}
            className="py-3 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all active:scale-[0.98]"
          >
            View Progress
          </button>
        </div>
      </div>
    </div>
  )
}
