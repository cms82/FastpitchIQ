"use client"

import type { Position, ProgressData } from "@/lib/types"
import { Target, Clock, Flame, AlertTriangle } from "lucide-react"

interface ProgressDashboardProps {
  data: ProgressData
  onPracticeWeakSpots: () => void
  onBack: () => void
}

const POSITIONS: Position[] = ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF"]

export function ProgressDashboard({ data, onPracticeWeakSpots, onBack }: ProgressDashboardProps) {
  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-card-foreground">Your Progress</h1>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Target className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-card-foreground">{data.overallAccuracy}%</p>
          <p className="text-xs text-muted-foreground">Accuracy</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold text-card-foreground">{data.avgResponseTime.toFixed(1)}s</p>
          <p className="text-xs text-muted-foreground">Avg Time</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <Flame className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-card-foreground">{data.bestStreak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
      </div>

      {/* Position accuracy grid */}
      <div className="space-y-3">
        <h2 className="font-semibold text-card-foreground">Position Accuracy</h2>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((pos) => {
            const accuracy = data.positionStats[pos] ?? 0
            const isLow = accuracy < 60
            return (
              <div
                key={pos}
                className={`bg-card rounded-lg border p-3 text-center ${isLow ? "border-primary/50" : "border-border"}`}
              >
                <p className="text-sm font-bold text-card-foreground">{pos}</p>
                <p className={`text-lg font-semibold ${isLow ? "text-primary" : "text-muted-foreground"}`}>
                  {accuracy}%
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weak spots */}
      {data.weakSpots.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-card-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            Weak Spots
          </h2>
          <div className="space-y-2">
            {data.weakSpots.map((spot, i) => (
              <div
                key={i}
                className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-card-foreground"
              >
                {spot}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice button */}
      <button
        onClick={onPracticeWeakSpots}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg transition-all active:scale-[0.98]"
      >
        Practice Weak Spots
      </button>
    </div>
  )
}
