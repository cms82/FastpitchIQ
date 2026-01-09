"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { PrimaryActionCard } from "@/components/primary-action-card"
import { PositionPickerGrid } from "@/components/position-picker-grid"
import { SituationHeader } from "@/components/situation-header"
import { FieldCard } from "@/components/field-card"
import { AnswerGrid } from "@/components/answer-grid"
import { FeedbackOverlay } from "@/components/feedback-overlay"
import { RoundSummary } from "@/components/round-summary"
import { ProgressDashboard } from "@/components/progress-dashboard"
import { TutorialOverlay } from "@/components/tutorial-overlay"
import type { Position, GameMode, Situation, FeedbackData, RoundSummaryData, ProgressData } from "@/lib/types"
import { Target, Globe, BarChart3 } from "lucide-react"

// Mock data for demonstration
const MOCK_SITUATIONS: Situation[] = [
  {
    id: "1",
    description: "Single to LF — Runner on 2nd",
    role: "RF",
    questionType: "responsibility",
    ballZone: "LF",
    runners: ["2B"],
    options: [
      { id: "a", label: "Back up 3B" },
      { id: "b", label: "Back up home" },
      { id: "c", label: "Stay in position" },
      { id: "d", label: "Cut off throw" },
    ],
    correctAnswerId: "b",
    explanation: "With a runner on 2nd and a hit to LF, RF backs up home in case of an overthrow.",
  },
  {
    id: "2",
    description: "Fly ball to CF — Bases loaded, 1 out",
    role: "SS",
    questionType: "throw",
    ballZone: "CF",
    runners: ["1B", "2B", "3B"],
    options: [
      { id: "a", label: "Cut to home" },
      { id: "b", label: "Cut to 3B" },
      { id: "c", label: "Let it through" },
      { id: "d", label: "Cut to 2B" },
    ],
    correctAnswerId: "a",
    explanation: "With bases loaded, SS is the cutoff. Priority is preventing the run at home.",
    correctTarget: "Home",
  },
  {
    id: "3",
    description: "Bunt down 3B line — Runner on 1st",
    role: "P",
    questionType: "responsibility",
    ballZone: "BUNT",
    runners: ["1B"],
    options: [
      { id: "a", label: "Field the bunt" },
      { id: "b", label: "Cover 1B" },
      { id: "c", label: "Cover home" },
      { id: "d", label: "Back up 3B" },
    ],
    correctAnswerId: "b",
    explanation: "On a bunt toward 3B, pitcher covers 1B so 1B can charge.",
  },
  {
    id: "4",
    description: "Ground ball to SS — Runner on 1st, 0 outs",
    role: "2B",
    questionType: "responsibility",
    ballZone: "SS-HOLE",
    runners: ["1B"],
    options: [
      { id: "a", label: "Cover 2B for turn" },
      { id: "b", label: "Cover 1B" },
      { id: "c", label: "Back up SS" },
      { id: "d", label: "Hold position" },
    ],
    correctAnswerId: "a",
    explanation: "2B covers the bag on a ball hit to SS side for the double play turn.",
  },
  {
    id: "5",
    description: "Line drive to RF gap — Runner on 1st",
    role: "CF",
    questionType: "responsibility",
    ballZone: "RF",
    runners: ["1B"],
    options: [
      { id: "a", label: "Back up RF" },
      { id: "b", label: "Cut off the throw" },
      { id: "c", label: "Cover 2B" },
      { id: "d", label: "Trail the runner" },
    ],
    correctAnswerId: "a",
    explanation: "CF backs up RF on balls hit to right side to prevent extra bases.",
  },
  {
    id: "6",
    description: "Pop fly behind 1B — Bases empty",
    role: "2B",
    questionType: "responsibility",
    ballZone: "RF-LINE",
    runners: [],
    options: [
      { id: "a", label: "Call for ball" },
      { id: "b", label: "Cover 1B" },
      { id: "c", label: "Let RF take it" },
      { id: "d", label: "Back up 1B" },
    ],
    correctAnswerId: "a",
    explanation: "2B has priority on pop flies in the shallow right field area.",
  },
]

const MOCK_PROGRESS: ProgressData = {
  overallAccuracy: 72,
  avgResponseTime: 3.2,
  bestStreak: 8,
  positionStats: {
    P: 65,
    C: 80,
    "1B": 75,
    "2B": 70,
    SS: 68,
    "3B": 55,
    LF: 85,
    CF: 78,
    RF: 72,
  },
  weakSpots: ["Bunt defense as 3B", "Cutoff decisions from RF", "Double play coverage at SS"],
}

type Screen = "home" | "setup" | "game" | "summary" | "progress"

export default function FastpitchIQTrainer() {
  const [screen, setScreen] = useState<Screen>("home")
  const [showTutorial, setShowTutorial] = useState(false)
  const [mode, setMode] = useState<GameMode>("my-positions")
  const [primaryPosition, setPrimaryPosition] = useState<Position | null>(null)
  const [secondaryPosition, setSecondaryPosition] = useState<Position | null>(null)

  // Game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(10)
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [results, setResults] = useState<{ correct: boolean; time: number }[]>([])
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())

  const currentSituation = MOCK_SITUATIONS[currentQuestionIndex]
  const totalQuestions = 6

  // Check for first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("fastpitch-tutorial-seen")
    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
  }, [])

  // Timer effect
  useEffect(() => {
    if (screen !== "game" || feedback) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          handleAnswer("timeout")
          return 10
        }
        return prev - 0.1
      })
    }, 100)

    return () => clearInterval(timer)
  }, [screen, feedback, currentQuestionIndex])

  const handleDismissTutorial = () => {
    setShowTutorial(false)
    localStorage.setItem("fastpitch-tutorial-seen", "true")
  }

  const handleStartQuiz = (selectedMode: GameMode) => {
    setMode(selectedMode)
    if (selectedMode === "my-positions" && !primaryPosition) {
      setScreen("setup")
    } else {
      startGame()
    }
  }

  const startGame = () => {
    setCurrentQuestionIndex(0)
    setTimeRemaining(10)
    setResults([])
    setFeedback(null)
    setQuestionStartTime(Date.now())
    setScreen("game")
  }

  const handleAnswer = useCallback(
    (answerId: string) => {
      if (feedback) return

      const responseTime = (Date.now() - questionStartTime) / 1000
      const isCorrect = answerId === currentSituation.correctAnswerId

      setResults((prev) => [...prev, { correct: isCorrect, time: responseTime }])

      setFeedback({
        correct: isCorrect,
        correctAnswer: currentSituation.options.find((o) => o.id === currentSituation.correctAnswerId)?.label || "",
        correctTarget: currentSituation.correctTarget,
        explanation: currentSituation.explanation,
      })
    },
    [feedback, questionStartTime, currentSituation],
  )

  const handleContinue = () => {
    setFeedback(null)

    if (currentQuestionIndex + 1 >= totalQuestions) {
      setScreen("summary")
    } else {
      setCurrentQuestionIndex((prev) => prev + 1)
      setTimeRemaining(10)
      setQuestionStartTime(Date.now())
    }
  }

  const getSummaryData = (): RoundSummaryData => {
    const correct = results.filter((r) => r.correct).length
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length
    return {
      score: correct,
      total: totalQuestions,
      avgResponseTime: avgTime || 0,
      weakSpot: correct < 4 ? "Cutoff decisions" : undefined,
    }
  }

  return (
    <AppShell>
      {showTutorial && <TutorialOverlay onDismiss={handleDismissTutorial} />}

      {screen === "home" && (
        <div className="py-12 space-y-8">
          {/* Logo & Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-card-foreground">Fastpitch IQ Trainer</h1>
            <p className="text-muted-foreground">6 quick prompts per round. Get faster every day.</p>
          </div>

          {/* Main actions */}
          <div className="space-y-3">
            <PrimaryActionCard
              title="Quiz – My Positions"
              description="Practice your primary & secondary spots"
              icon={<Target className="w-6 h-6" />}
              onClick={() => handleStartQuiz("my-positions")}
            />
            <PrimaryActionCard
              title="Quiz – Whole Field"
              description="Play all 9 positions randomly"
              icon={<Globe className="w-6 h-6" />}
              onClick={() => handleStartQuiz("whole-field")}
            />
            <PrimaryActionCard
              title="Review My Progress"
              description="See your stats and weak spots"
              icon={<BarChart3 className="w-6 h-6" />}
              onClick={() => setScreen("progress")}
              variant="secondary"
            />
          </div>
        </div>
      )}

      {screen === "setup" && (
        <div className="py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreen("home")}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-card-foreground">Select Positions</h1>
          </div>

          <PositionPickerGrid
            primaryPosition={primaryPosition}
            secondaryPosition={secondaryPosition}
            onSelectPrimary={setPrimaryPosition}
            onSelectSecondary={setSecondaryPosition}
          />

          <button
            onClick={startGame}
            disabled={!primaryPosition || !secondaryPosition}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}

      {screen === "game" && currentSituation && (
        <div className="py-6 pb-36 space-y-6">
          <SituationHeader
            situation={currentSituation.description}
            role={currentSituation.role}
            questionType={currentSituation.questionType}
            mode={mode}
            currentQuestion={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            timeRemaining={timeRemaining}
            totalTime={10}
          />

          <FieldCard
            activeRole={currentSituation.role}
            ballZone={currentSituation.ballZone}
            runners={currentSituation.runners}
          />

          <AnswerGrid options={currentSituation.options} onSelect={handleAnswer} disabled={!!feedback} />

          {feedback && <FeedbackOverlay feedback={feedback} onContinue={handleContinue} />}
        </div>
      )}

      {screen === "summary" && (
        <RoundSummary
          data={getSummaryData()}
          onPlayAgain={startGame}
          onSwitchMode={() => {
            setMode(mode === "my-positions" ? "whole-field" : "my-positions")
            startGame()
          }}
          onViewProgress={() => setScreen("progress")}
        />
      )}

      {screen === "progress" && (
        <ProgressDashboard
          data={MOCK_PROGRESS}
          onPracticeWeakSpots={() => {
            setMode("my-positions")
            startGame()
          }}
          onBack={() => setScreen("home")}
        />
      )}
    </AppShell>
  )
}
