import { PrimaryIntent, FielderAction, Position, BallZone } from '../constants';

// Re-export types for convenience
export type { Position, BallZone };
export { PrimaryIntent, FielderAction };

export type QuestionType = 'primary' | 'fielderAction';

export type AnswerOption = PrimaryIntent | FielderAction;

export type GameMode = 'my_positions' | 'whole_field';

export interface Runners {
  on1: boolean;
  on2: boolean;
  on3: boolean;
}

export interface Situation {
  runners: Runners;
  ballZone: BallZone;
  goal?: string; // Optional goal description for the play
}

export interface RoleDefinition {
  primaryIntent: PrimaryIntent;
  fielderAction?: FielderAction; // Optional; only for roles that field the ball
  target?: string; // Used only for feedback text
  steps?: Array<{ // Optional sequence of actions for the role
    type: string;
    target?: string;
    via?: string;
    style?: string;
  }>;
  explanation: string; // One sentence max
  distractorPoolHigh: (PrimaryIntent | FielderAction)[]; // Plausible distractors
  distractorPoolLow: (PrimaryIntent | FielderAction)[]; // Less plausible but still softball-related
}

export interface RoleGroups {
  ballSide: Position[]; // Fielders on ball side
  infieldCore: Position[]; // Primary cutoff/base coverage
  coverage: Position[]; // Base coverage
  backups: Position[]; // Backup roles
}

export interface PromptPlan {
  recommendedRoles?: Position[]; // Optional recommended roles to prioritize
  difficulty?: 1 | 2 | 3; // Optional difficulty level
}

export interface Scenario {
  id: string;
  title: string;
  category: 'cut_relay' | 'bunt' | 'other';
  situation: Situation;
  roles: Record<Position, RoleDefinition>;
  roleGroups: RoleGroups;
  promptPlan?: PromptPlan;
}

export interface Prompt {
  scenarioId: string;
  role: Position;
  questionType: QuestionType;
  correctAnswer: AnswerOption;
  options: AnswerOption[]; // 4 options, shuffled
  correctIndex: number; // Index of correct answer in options array
}

export interface GameState {
  currentScenario: Scenario | null;
  prompts: Prompt[];
  currentPromptIndex: number;
  selectedAnswer: AnswerOption | null;
  timerActive: boolean;
  timerRemaining: number;
  roundStats: {
    correct: number;
    incorrect: number;
    totalTime: number;
    responses: Array<{
      prompt: Prompt;
      selected: AnswerOption | null;
      correct: boolean;
      timeMs: number;
    }>;
  };
}

export interface PositionStats {
  attempts: number;
  correct: number;
  avgTimeMs: number;
  lastAskedAt: number; // Timestamp
}

export interface ScenarioStats {
  attempts: number;
  correct: number;
}

export interface OverallStats {
  totalAttempts: number;
  totalCorrect: number;
  bestStreak: number;
}

export interface WeakSpot {
  role: Position;
  questionType: QuestionType;
  intent: AnswerOption;
  missCount: number;
}

export interface UserPreferences {
  selectedPrimaryPosition: Position | null;
  selectedSecondaryPosition: Position | null;
}

// Leaderboard types
export interface RoundStats {
  correct: number;
  incorrect: number;
  totalTime: number; // in milliseconds
  bestStreak: number;
}

export interface PlayerLeaderboardStats {
  totalAttempts: number;
  totalCorrect: number;
  bestStreak: number;
  totalTime: number; // in milliseconds
  lastUpdated: number; // timestamp
}

export interface PlayerStats {
  playerId: number;
  name: string;
  number: number;
  stats: PlayerLeaderboardStats;
}
