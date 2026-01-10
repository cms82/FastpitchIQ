import { useMemo } from 'react';
import {
  getAllPositionStats,
  getScenarioStats,
  getAllOverallStats,
  getTopWeakSpots,
} from '../utils/localStorage';
import { Position } from '../types';

export function useStats() {
  // Get stats from both learning and timed modes
  const { learning: learningPositionStats, timed: timedPositionStats } = useMemo(() => getAllPositionStats(), []);
  const timedScenarioStats = useMemo(() => getScenarioStats(false), []);
  const { learning: learningOverallStats, timed: timedOverallStats } = useMemo(() => getAllOverallStats(), []);
  
  // Use timed mode weak spots for display (learning mode stats kept separate but not shown)
  const weakSpots = useMemo(() => getTopWeakSpots(3, false), []);

  // Show timed mode stats on progress screen (learning mode stats stored separately)
  const positionStats = timedPositionStats; // Show timed mode stats
  const scenarioStats = timedScenarioStats; // Show timed mode stats
  const overallStats = timedOverallStats; // Show timed mode stats

  const accuracy = useMemo(() => {
    if (overallStats.totalAttempts === 0) return 0;
    return (overallStats.totalCorrect / overallStats.totalAttempts) * 100;
  }, [overallStats]);

  const avgResponseTime = useMemo(() => {
    const positions = Object.values(positionStats) as Array<{
      attempts: number;
      avgTimeMs: number;
    }>;
    if (positions.length === 0) return 0;

    const totalTime = positions.reduce((sum, pos) => sum + pos.avgTimeMs * pos.attempts, 0);
    const totalAttempts = positions.reduce((sum, pos) => sum + pos.attempts, 0);
    return totalAttempts > 0 ? totalTime / totalAttempts : 0;
  }, [positionStats]);

  const getPositionAccuracy = (position: Position): number => {
    const stats = positionStats[position];
    if (!stats || stats.attempts === 0) return 0;
    return (stats.correct / stats.attempts) * 100;
  };

  return {
    positionStats,
    scenarioStats,
    overallStats,
    weakSpots,
    accuracy,
    avgResponseTime,
    getPositionAccuracy,
    // Also expose learning mode stats if needed for future features
    learningPositionStats,
    timedPositionStats,
    learningOverallStats,
    timedOverallStats,
  };
}
