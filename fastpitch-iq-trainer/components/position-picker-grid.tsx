"use client"

import type { Position } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface PositionPickerGridProps {
  primaryPosition: Position | null
  secondaryPosition: Position | null
  onSelectPrimary: (position: Position) => void
  onSelectSecondary: (position: Position) => void
}

const POSITIONS: Position[] = ["LF", "CF", "RF", "3B", "SS", "2B", "P", "C", "1B"]

const POSITION_LABELS: Record<Position, string> = {
  P: "Pitcher",
  C: "Catcher",
  "1B": "First Base",
  "2B": "Second Base",
  SS: "Shortstop",
  "3B": "Third Base",
  LF: "Left Field",
  CF: "Center Field",
  RF: "Right Field",
}

export function PositionPickerGrid({
  primaryPosition,
  secondaryPosition,
  onSelectPrimary,
  onSelectSecondary,
}: PositionPickerGridProps) {
  const handleSelect = (position: Position) => {
    if (primaryPosition === position) {
      return
    }
    if (secondaryPosition === position) {
      return
    }
    if (!primaryPosition) {
      onSelectPrimary(position)
    } else if (!secondaryPosition) {
      onSelectSecondary(position)
    }
  }

  const getSelectionState = (position: Position) => {
    if (primaryPosition === position) return "primary"
    if (secondaryPosition === position) return "secondary"
    return "none"
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {!primaryPosition
            ? "Select your primary position"
            : !secondaryPosition
              ? "Now select your secondary position"
              : "Positions selected!"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {POSITIONS.map((position) => {
          const state = getSelectionState(position)
          return (
            <button
              key={position}
              onClick={() => handleSelect(position)}
              className={cn(
                "relative rounded-xl p-4 transition-all duration-200 active:scale-95",
                "flex flex-col items-center justify-center gap-1 min-h-[80px]",
                "border-2",
                state === "none" && "bg-card border-border hover:border-primary/30",
                state === "primary" && "bg-primary/10 border-primary",
                state === "secondary" && "bg-primary/5 border-primary/50",
              )}
            >
              {state !== "none" && (
                <div
                  className={cn(
                    "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                    state === "primary" ? "bg-primary" : "bg-primary/60",
                  )}
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <span className={cn("text-xl font-bold", state !== "none" ? "text-primary" : "text-card-foreground")}>
                {position}
              </span>
              <span className="text-xs text-muted-foreground">{POSITION_LABELS[position]}</span>
              {state === "primary" && <span className="text-[10px] font-medium text-primary mt-1">PRIMARY</span>}
              {state === "secondary" && <span className="text-[10px] font-medium text-primary/70 mt-1">SECONDARY</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
