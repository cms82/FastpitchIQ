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

// Safe localStorage access helper
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage access failed:', error);
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('localStorage write failed:', error);
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('localStorage remove failed:', error);
  }
}

// User Preferences
export function getPreferences(): UserPreferences {
  try {
    const primary = safeGetItem(STORAGE_KEYS.PRIMARY_POSITION) as Position | null;
    const secondary = safeGetItem(STORAGE_KEYS.SECONDARY_POSITION) as Position | null;
    return {
      selectedPrimaryPosition: primary || null,
      selectedSecondaryPosition: secondary || null,
    };
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return {
      selectedPrimaryPosition: null,
      selectedSecondaryPosition: null,
    };
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (prefs.selectedPrimaryPosition) {
    safeSetItem(STORAGE_KEYS.PRIMARY_POSITION, prefs.selectedPrimaryPosition);
  } else {
    safeRemoveItem(STORAGE_KEYS.PRIMARY_POSITION);
  }
  if (prefs.selectedSecondaryPosition) {
    safeSetItem(STORAGE_KEYS.SECONDARY_POSITION, prefs.selectedSecondaryPosition);
  } else {
    safeRemoveItem(STORAGE_KEYS.SECONDARY_POSITION);
  }
}

// Position Stats
export function getPositionStats(): Record<Position, PositionStats> {
  try {
    const stored = safeGetItem(STORAGE_KEYS.POSITION_STATS);
    if (!stored) {
      return {} as Record<Position, PositionStats>;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get position stats:', error);
    return {} as Record<Position, PositionStats>;
  }
}

export function updatePositionStats(
  position: Position,
  correct: boolean,
  timeMs: number
): void {
  try {
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
    safeSetItem(STORAGE_KEYS.POSITION_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to update position stats:', error);
  }
}

export function getLastAskedAt(position: Position): number {
  const stats = getPositionStats();
  return stats[position]?.lastAskedAt || 0;
}

// Scenario Stats
export function getScenarioStats(): Record<string, ScenarioStats> {
  try {
    const stored = safeGetItem(STORAGE_KEYS.SCENARIO_STATS);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get scenario stats:', error);
    return {};
  }
}

export function updateScenarioStats(scenarioId: string, correct: boolean): void {
  try {
    const stats = getScenarioStats();
    const current = stats[scenarioId] || { attempts: 0, correct: 0 };

    current.attempts += 1;
    if (correct) {
      current.correct += 1;
    }

    stats[scenarioId] = current;
    safeSetItem(STORAGE_KEYS.SCENARIO_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to update scenario stats:', error);
  }
}

// Overall Stats
export function getOverallStats(): OverallStats {
  try {
    const stored = safeGetItem(STORAGE_KEYS.OVERALL_STATS);
    if (!stored) {
      return { totalAttempts: 0, totalCorrect: 0, bestStreak: 0 };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get overall stats:', error);
    return { totalAttempts: 0, totalCorrect: 0, bestStreak: 0 };
  }
}

export function updateOverallStats(correct: boolean, currentStreak: number): void {
  try {
    const stats = getOverallStats();
    stats.totalAttempts += 1;
    if (correct) {
      stats.totalCorrect += 1;
      if (currentStreak > stats.bestStreak) {
        stats.bestStreak = currentStreak;
      }
    }
    safeSetItem(STORAGE_KEYS.OVERALL_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to update overall stats:', error);
  }
}

// Weak Spots
export function getWeakSpots(): WeakSpot[] {
  try {
    const stored = safeGetItem(STORAGE_KEYS.WEAK_SPOTS);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get weak spots:', error);
    return [];
  }
}

export function updateWeakSpots(
  role: Position,
  questionType: QuestionType,
  intent: AnswerOption,
  correct: boolean
): void {
  try {
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

    safeSetItem(STORAGE_KEYS.WEAK_SPOTS, JSON.stringify(topSpots));
  } catch (error) {
    console.error('Failed to update weak spots:', error);
  }
}

export function getTopWeakSpots(count: number = 3): WeakSpot[] {
  const weakSpots = getWeakSpots();
  return weakSpots.slice(0, count);
}

// Reset all progress (stats only, keeps preferences)
export function resetProgress(): void {
  try {
    safeRemoveItem(STORAGE_KEYS.POSITION_STATS);
    safeRemoveItem(STORAGE_KEYS.SCENARIO_STATS);
    safeRemoveItem(STORAGE_KEYS.OVERALL_STATS);
    safeRemoveItem(STORAGE_KEYS.WEAK_SPOTS);
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
}

// Reset everything including preferences
export function resetAll(): void {
  try {
    resetProgress();
    safeRemoveItem(STORAGE_KEYS.PRIMARY_POSITION);
    safeRemoveItem(STORAGE_KEYS.SECONDARY_POSITION);
  } catch (error) {
    console.error('Failed to reset all:', error);
  }
}
