import { useMemo } from 'react';
import {
  getPositionStats,
  getScenarioStats,
  getOverallStats,
  getTopWeakSpots,
} from '../utils/localStorage';
import { Position } from '../types';

export function useStats() {
  const positionStats = useMemo(() => getPositionStats(), []);
  const scenarioStats = useMemo(() => getScenarioStats(), []);
  const overallStats = useMemo(() => getOverallStats(), []);
  const weakSpots = useMemo(() => getTopWeakSpots(3), []);

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
  };
}
