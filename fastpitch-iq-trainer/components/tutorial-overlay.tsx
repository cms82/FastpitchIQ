"use client"

import { Lightbulb } from "lucide-react"

interface TutorialOverlayProps {
  onDismiss: () => void
}

export function TutorialOverlay({ onDismiss }: TutorialOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-7 h-7 text-primary" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-card-foreground mb-4">How to Play</h2>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              1
            </span>
            <p className="text-sm text-card-foreground">Read the situation at the top</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              2
            </span>
            <p className="text-sm text-card-foreground">Answer for the highlighted role on the field</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              3
            </span>
            <p className="text-sm text-card-foreground">Go fast – learn faster!</p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all active:scale-[0.98]"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}
