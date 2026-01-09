// Types for Fastpitch IQ Trainer

export type Position = "P" | "C" | "1B" | "2B" | "SS" | "3B" | "LF" | "CF" | "RF"

export type QuestionType = "responsibility" | "throw"

export type GameMode = "my-positions" | "whole-field"

export interface AnswerOption {
  id: string
  label: string
  icon?: string
}

export interface Situation {
  id: string
  description: string
  role: Position
  questionType: QuestionType
  ballZone: string
  runners: ("1B" | "2B" | "3B")[]
  options: AnswerOption[]
  correctAnswerId: string
  explanation: string
  correctTarget?: string
}

export interface GameState {
  mode: GameMode
  currentQuestion: number
  totalQuestions: number
  timeRemaining: number
  totalTime: number
}

export interface RoundResult {
  correct: boolean
  responseTime: number
  questionId: string
}

export interface RoundSummaryData {
  score: number
  total: number
  avgResponseTime: number
  weakSpot?: string
}

export interface ProgressData {
  overallAccuracy: number
  avgResponseTime: number
  bestStreak: number
  positionStats: Record<Position, number>
  weakSpots: string[]
}

export interface FeedbackData {
  correct: boolean
  correctAnswer: string
  correctTarget?: string
  explanation: string
}
