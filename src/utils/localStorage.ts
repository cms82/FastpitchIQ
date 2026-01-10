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
  POSITION_STATS_LEARNING: 'fastpitchiq_positionStats_learning',
  POSITION_STATS_TIMED: 'fastpitchiq_positionStats_timed',
  SCENARIO_STATS: 'fastpitchiq_scenarioStats',
  SCENARIO_STATS_LEARNING: 'fastpitchiq_scenarioStats_learning',
  SCENARIO_STATS_TIMED: 'fastpitchiq_scenarioStats_timed',
  OVERALL_STATS: 'fastpitchiq_overallStats',
  OVERALL_STATS_LEARNING: 'fastpitchiq_overallStats_learning',
  OVERALL_STATS_TIMED: 'fastpitchiq_overallStats_timed',
  WEAK_SPOTS: 'fastpitchiq_weakSpots',
  WEAK_SPOTS_LEARNING: 'fastpitchiq_weakSpots_learning',
  WEAK_SPOTS_TIMED: 'fastpitchiq_weakSpots_timed',
  PLAYER_ID: 'fastpitchiq_playerId',
  LEARNING_MODE: 'fastpitchiq_learningMode',
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

// Position Stats - separated by learning mode
export function getPositionStats(learningMode: boolean = false): Record<Position, PositionStats> {
  try {
    const key = learningMode ? STORAGE_KEYS.POSITION_STATS_LEARNING : STORAGE_KEYS.POSITION_STATS_TIMED;
    const stored = safeGetItem(key);
    if (!stored) {
      return {} as Record<Position, PositionStats>;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get position stats:', error);
    return {} as Record<Position, PositionStats>;
  }
}

export function getAllPositionStats(): { learning: Record<Position, PositionStats>; timed: Record<Position, PositionStats> } {
  return {
    learning: getPositionStats(true),
    timed: getPositionStats(false),
  };
}

export function updatePositionStats(
  position: Position,
  correct: boolean,
  timeMs: number,
  learningMode: boolean = false
): void {
  try {
    const key = learningMode ? STORAGE_KEYS.POSITION_STATS_LEARNING : STORAGE_KEYS.POSITION_STATS_TIMED;
    const stats = getPositionStats(learningMode);
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
    safeSetItem(key, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to update position stats:', error);
  }
}

export function getLastAskedAt(position: Position, learningMode: boolean = false): number {
  const stats = getPositionStats(learningMode);
  return stats[position]?.lastAskedAt || 0;
}

// Scenario Stats - separated by learning mode
export function getScenarioStats(learningMode: boolean = false): Record<string, ScenarioStats> {
  try {
    const key = learningMode ? STORAGE_KEYS.SCENARIO_STATS_LEARNING : STORAGE_KEYS.SCENARIO_STATS_TIMED;
    const stored = safeGetItem(key);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get scenario stats:', error);
    return {};
  }
}

export function updateScenarioStats(scenarioId: string, correct: boolean, learningMode: boolean = false): void {
  try {
    const key = learningMode ? STORAGE_KEYS.SCENARIO_STATS_LEARNING : STORAGE_KEYS.SCENARIO_STATS_TIMED;
    const stats = getScenarioStats(learningMode);
    const current = stats[scenarioId] || { attempts: 0, correct: 0 };

    current.attempts += 1;
    if (correct) {
      current.correct += 1;
    }

    stats[scenarioId] = current;
    safeSetItem(key, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to update scenario stats:', error);
  }
}

// Overall Stats - separated by learning mode
export function getOverallStats(learningMode: boolean = false): OverallStats {
  try {
    const key = learningMode ? STORAGE_KEYS.OVERALL_STATS_LEARNING : STORAGE_KEYS.OVERALL_STATS_TIMED;
    const stored = safeGetItem(key);
    if (!stored) {
      return { totalAttempts: 0, totalCorrect: 0, bestStreak: 0 };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get overall stats:', error);
    return { totalAttempts: 0, totalCorrect: 0, bestStreak: 0 };
  }
}

export function getAllOverallStats(): { learning: OverallStats; timed: OverallStats } {
  return {
    learning: getOverallStats(true),
    timed: getOverallStats(false),
  };
}

export function updateOverallStats(correct: boolean, currentStreak: number, learningMode: boolean = false): void {
  try {
    const key = learningMode ? STORAGE_KEYS.OVERALL_STATS_LEARNING : STORAGE_KEYS.OVERALL_STATS_TIMED;
    const stats = getOverallStats(learningMode);
    stats.totalAttempts += 1;
    if (correct) {
      stats.totalCorrect += 1;
      if (currentStreak > stats.bestStreak) {
        stats.bestStreak = currentStreak;
      }
    }
    safeSetItem(key, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to update overall stats:', error);
  }
}

// Weak Spots - separated by learning mode
export function getWeakSpots(learningMode: boolean = false): WeakSpot[] {
  try {
    const key = learningMode ? STORAGE_KEYS.WEAK_SPOTS_LEARNING : STORAGE_KEYS.WEAK_SPOTS_TIMED;
    const stored = safeGetItem(key);
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
  correct: boolean,
  learningMode: boolean = false
): void {
  try {
    const key = learningMode ? STORAGE_KEYS.WEAK_SPOTS_LEARNING : STORAGE_KEYS.WEAK_SPOTS_TIMED;
    const weakSpots = getWeakSpots(learningMode);
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

    safeSetItem(key, JSON.stringify(topSpots));
  } catch (error) {
    console.error('Failed to update weak spots:', error);
  }
}

export function getTopWeakSpots(count: number = 3, learningMode: boolean = false): WeakSpot[] {
  const weakSpots = getWeakSpots(learningMode);
  return weakSpots.slice(0, count);
}

// Reset all progress (stats only, keeps preferences)
export function resetProgress(): void {
  try {
    // Reset both learning and timed mode stats
    safeRemoveItem(STORAGE_KEYS.POSITION_STATS);
    safeRemoveItem(STORAGE_KEYS.POSITION_STATS_LEARNING);
    safeRemoveItem(STORAGE_KEYS.POSITION_STATS_TIMED);
    safeRemoveItem(STORAGE_KEYS.SCENARIO_STATS);
    safeRemoveItem(STORAGE_KEYS.SCENARIO_STATS_LEARNING);
    safeRemoveItem(STORAGE_KEYS.SCENARIO_STATS_TIMED);
    safeRemoveItem(STORAGE_KEYS.OVERALL_STATS);
    safeRemoveItem(STORAGE_KEYS.OVERALL_STATS_LEARNING);
    safeRemoveItem(STORAGE_KEYS.OVERALL_STATS_TIMED);
    safeRemoveItem(STORAGE_KEYS.WEAK_SPOTS);
    safeRemoveItem(STORAGE_KEYS.WEAK_SPOTS_LEARNING);
    safeRemoveItem(STORAGE_KEYS.WEAK_SPOTS_TIMED);
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

// Reset player ID (allows re-selection)
export function resetPlayerId(): void {
  try {
    safeRemoveItem(STORAGE_KEYS.PLAYER_ID);
  } catch (error) {
    console.error('Failed to reset player ID:', error);
  }
}

// Player ID storage
export function getPlayerId(): number | null {
  try {
    const stored = safeGetItem(STORAGE_KEYS.PLAYER_ID);
    if (!stored) return null;
    const playerId = parseInt(stored, 10);
    return isNaN(playerId) ? null : playerId;
  } catch (error) {
    console.error('Failed to get player ID:', error);
    return null;
  }
}

export function setPlayerId(playerId: number): void {
  try {
    safeSetItem(STORAGE_KEYS.PLAYER_ID, playerId.toString());
  } catch (error) {
    console.error('Failed to set player ID:', error);
  }
}

// Learning Mode Preference
export function getLearningMode(): boolean {
  try {
    const stored = safeGetItem(STORAGE_KEYS.LEARNING_MODE);
    if (stored === null) {
      // Default to practice mode (true) if not set
      return true;
    }
    return stored === 'true';
  } catch (error) {
    console.error('Failed to get learning mode:', error);
    return true; // Default to practice mode
  }
}

export function setLearningMode(learningMode: boolean): void {
  try {
    safeSetItem(STORAGE_KEYS.LEARNING_MODE, learningMode ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to set learning mode:', error);
  }
}
