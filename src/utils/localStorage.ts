import {
  Position,
  PositionStats,
  ScenarioStats,
  OverallStats,
  UserPreferences,
  WeakSpot,
  QuestionType,
  AnswerOption,
} from '../types';

const STORAGE_KEYS = {
  PRIMARY_POSITION: 'fastpitchiq_primaryPosition',
  SECONDARY_POSITION: 'fastpitchiq_secondaryPosition',
  POSITION_STATS: 'fastpitchiq_positionStats',
  SCENARIO_STATS: 'fastpitchiq_scenarioStats',
  OVERALL_STATS: 'fastpitchiq_overallStats',
  WEAK_SPOTS: 'fastpitchiq_weakSpots',
} as const;

// User Preferences
export function getPreferences(): UserPreferences {
  const primary = localStorage.getItem(STORAGE_KEYS.PRIMARY_POSITION) as Position | null;
  const secondary = localStorage.getItem(STORAGE_KEYS.SECONDARY_POSITION) as Position | null;
  return {
    selectedPrimaryPosition: primary || null,
    selectedSecondaryPosition: secondary || null,
  };
}

export function savePreferences(prefs: UserPreferences): void {
  if (prefs.selectedPrimaryPosition) {
    localStorage.setItem(STORAGE_KEYS.PRIMARY_POSITION, prefs.selectedPrimaryPosition);
  } else {
    localStorage.removeItem(STORAGE_KEYS.PRIMARY_POSITION);
  }
  if (prefs.selectedSecondaryPosition) {
    localStorage.setItem(STORAGE_KEYS.SECONDARY_POSITION, prefs.selectedSecondaryPosition);
  } else {
    localStorage.removeItem(STORAGE_KEYS.SECONDARY_POSITION);
  }
}

// Position Stats
export function getPositionStats(): Record<Position, PositionStats> {
  const stored = localStorage.getItem(STORAGE_KEYS.POSITION_STATS);
  if (!stored) {
    return {} as Record<Position, PositionStats>;
  }
  return JSON.parse(stored);
}

export function updatePositionStats(
  position: Position,
  correct: boolean,
  timeMs: number
): void {
  const stats = getPositionStats();
  const current = stats[position] || { attempts: 0, correct: 0, avgTimeMs: 0, lastAskedAt: 0 };

  current.attempts += 1;
  if (correct) {
    current.correct += 1;
  }
  // Update average time
  const totalTime = current.avgTimeMs * (current.attempts - 1) + timeMs;
  current.avgTimeMs = totalTime / current.attempts;
  current.lastAskedAt = Date.now();

  stats[position] = current;
  localStorage.setItem(STORAGE_KEYS.POSITION_STATS, JSON.stringify(stats));
}

export function getLastAskedAt(position: Position): number {
  const stats = getPositionStats();
  return stats[position]?.lastAskedAt || 0;
}

// Scenario Stats
export function getScenarioStats(): Record<string, ScenarioStats> {
  const stored = localStorage.getItem(STORAGE_KEYS.SCENARIO_STATS);
  if (!stored) {
    return {};
  }
  return JSON.parse(stored);
}

export function updateScenarioStats(scenarioId: string, correct: boolean): void {
  const stats = getScenarioStats();
  const current = stats[scenarioId] || { attempts: 0, correct: 0 };

  current.attempts += 1;
  if (correct) {
    current.correct += 1;
  }

  stats[scenarioId] = current;
  localStorage.setItem(STORAGE_KEYS.SCENARIO_STATS, JSON.stringify(stats));
}

// Overall Stats
export function getOverallStats(): OverallStats {
  const stored = localStorage.getItem(STORAGE_KEYS.OVERALL_STATS);
  if (!stored) {
    return { totalAttempts: 0, totalCorrect: 0, bestStreak: 0 };
  }
  return JSON.parse(stored);
}

export function updateOverallStats(correct: boolean, currentStreak: number): void {
  const stats = getOverallStats();
  stats.totalAttempts += 1;
  if (correct) {
    stats.totalCorrect += 1;
    if (currentStreak > stats.bestStreak) {
      stats.bestStreak = currentStreak;
    }
  }
  localStorage.setItem(STORAGE_KEYS.OVERALL_STATS, JSON.stringify(stats));
}

// Weak Spots
export function getWeakSpots(): WeakSpot[] {
  const stored = localStorage.getItem(STORAGE_KEYS.WEAK_SPOTS);
  if (!stored) {
    return [];
  }
  return JSON.parse(stored);
}

export function updateWeakSpots(
  role: Position,
  questionType: QuestionType,
  intent: AnswerOption,
  correct: boolean
): void {
  const weakSpots = getWeakSpots();
  let spot = weakSpots.find(
    (s) => s.role === role && s.questionType === questionType && s.intent === intent
  );

  if (!spot) {
    spot = { role, questionType, intent, missCount: 0 };
    weakSpots.push(spot);
  }

  if (!correct) {
    spot.missCount += 1;
  }

  // Sort by miss count and keep top 10
  weakSpots.sort((a, b) => b.missCount - a.missCount);
  const topSpots = weakSpots.slice(0, 10);

  localStorage.setItem(STORAGE_KEYS.WEAK_SPOTS, JSON.stringify(topSpots));
}

export function getTopWeakSpots(count: number = 3): WeakSpot[] {
  const weakSpots = getWeakSpots();
  return weakSpots.slice(0, count);
}

// Reset all progress (stats only, keeps preferences)
export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEYS.POSITION_STATS);
  localStorage.removeItem(STORAGE_KEYS.SCENARIO_STATS);
  localStorage.removeItem(STORAGE_KEYS.OVERALL_STATS);
  localStorage.removeItem(STORAGE_KEYS.WEAK_SPOTS);
}

// Reset everything including preferences
export function resetAll(): void {
  resetProgress();
  localStorage.removeItem(STORAGE_KEYS.PRIMARY_POSITION);
  localStorage.removeItem(STORAGE_KEYS.SECONDARY_POSITION);
}
