import { useState, useEffect } from 'react';
import { fetchCoachStats, CoachPlayerStats, CoachPlayerModeStats } from '../utils/coach';
import { RefreshCw, TrendingUp, Clock, Target, Calendar } from 'lucide-react';

export default function CoachScreen() {
  const [stats, setStats] = useState<CoachPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCoachStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load coach stats');
      console.error('Error loading coach stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActivityColor = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return 'text-muted-foreground';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'text-green-600';
    if (diffDays <= 3) return 'text-green-500';
    if (diffDays <= 7) return 'text-yellow-600';
    if (diffDays <= 14) return 'text-orange-600';
    return 'text-red-600';
  };

  const getActivityBgColor = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return 'bg-muted-foreground';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'bg-green-600';
    if (diffDays <= 3) return 'bg-green-500';
    if (diffDays <= 7) return 'bg-yellow-600';
    if (diffDays <= 14) return 'bg-orange-600';
    return 'bg-red-600';
  };

  // Combine practice and competition stats for totals
  const getTotalRounds = (player: CoachPlayerStats): number => {
    const onePosPrac = player.onePosition.practice?.totalRounds || 0;
    const onePosComp = player.onePosition.competition?.totalRounds || 0;
    const allPosPrac = player.allPositions.practice?.totalRounds || 0;
    const allPosComp = player.allPositions.competition?.totalRounds || 0;
    return onePosPrac + onePosComp + allPosPrac + allPosComp;
  };

  const getTotalAttempts = (player: CoachPlayerStats): number => {
    const onePosPrac = player.onePosition.practice?.totalAttempts || 0;
    const onePosComp = player.onePosition.competition?.totalAttempts || 0;
    const allPosPrac = player.allPositions.practice?.totalAttempts || 0;
    const allPosComp = player.allPositions.competition?.totalAttempts || 0;
    return onePosPrac + onePosComp + allPosPrac + allPosComp;
  };

  const getTotalCorrect = (player: CoachPlayerStats): number => {
    const onePosPrac = player.onePosition.practice?.totalCorrect || 0;
    const onePosComp = player.onePosition.competition?.totalCorrect || 0;
    const allPosPrac = player.allPositions.practice?.totalCorrect || 0;
    const allPosComp = player.allPositions.competition?.totalCorrect || 0;
    return onePosPrac + onePosComp + allPosPrac + allPosComp;
  };

  const getOverallAccuracy = (player: CoachPlayerStats): number => {
    const totalAttempts = getTotalAttempts(player);
    const totalCorrect = getTotalCorrect(player);
    if (totalAttempts === 0) return 0;
    return Math.round((totalCorrect / totalAttempts) * 100);
  };

  const getLastActivity = (player: CoachPlayerStats): number => {
    const onePosPracTime = player.onePosition.practice?.lastUpdated || 0;
    const onePosCompTime = player.onePosition.competition?.lastUpdated || 0;
    const allPosPracTime = player.allPositions.practice?.lastUpdated || 0;
    const allPosCompTime = player.allPositions.competition?.lastUpdated || 0;
    return Math.max(onePosPracTime, onePosCompTime, allPosPracTime, allPosCompTime);
  };

  // Get combined stats for a specific game mode (one position or all positions)
  const getModeStats = (modeStats: CoachPlayerModeStats) => {
    const practice = modeStats.practice;
    const competition = modeStats.competition;
    
    const totalRounds = (practice?.totalRounds || 0) + (competition?.totalRounds || 0);
    const totalAttempts = (practice?.totalAttempts || 0) + (competition?.totalAttempts || 0);
    const totalCorrect = (practice?.totalCorrect || 0) + (competition?.totalCorrect || 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;
    const lastUpdated = Math.max(
      practice?.lastUpdated || 0,
      competition?.lastUpdated || 0
    );
    
    return { totalRounds, totalAttempts, totalCorrect, accuracy, lastUpdated };
  };

  // Sort by last activity (most recent first)
  const sortedStats = [...stats].sort((a, b) => {
    const aTime = getLastActivity(a);
    const bTime = getLastActivity(b);
    return bTime - aTime;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 pb-safe py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">Coach Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Player progress and usage tracking</p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Total Rounds</p>
            </div>
            <p className="text-2xl font-bold text-card-foreground">
              {stats.reduce((sum, p) => sum + getTotalRounds(p), 0)}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Avg Accuracy</p>
            </div>
            <p className="text-2xl font-bold text-card-foreground">
              {(() => {
                const playersWithStats = stats.filter(p => getTotalAttempts(p) > 0);
                if (playersWithStats.length === 0) return '0%';
                const avg = playersWithStats.reduce((sum, p) => sum + getOverallAccuracy(p), 0) / playersWithStats.length;
                return `${Math.round(avg)}%`;
              })()}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Active Players</p>
            </div>
            <p className="text-2xl font-bold text-card-foreground">
              {stats.filter(p => getLastActivity(p) > 0 && (Date.now() - getLastActivity(p)) < 7 * 24 * 60 * 60 * 1000).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Today's Activity</p>
            </div>
            <p className="text-2xl font-bold text-card-foreground">
              {stats.filter(p => {
                const lastActivity = getLastActivity(p);
                if (!lastActivity) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return lastActivity >= today.getTime();
              }).length}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && stats.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading coach stats...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12 space-y-4">
            <p className="text-destructive">{error}</p>
            <button
              onClick={loadStats}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Players Table */}
        {!loading && !error && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-card-foreground">Player</th>
                    <th className="text-center p-4 font-semibold text-card-foreground whitespace-nowrap">One Position</th>
                    <th className="text-center p-4 font-semibold text-card-foreground whitespace-nowrap">All Positions</th>
                    <th className="text-center p-4 font-semibold text-card-foreground">Total</th>
                    <th className="text-center p-4 font-semibold text-card-foreground whitespace-nowrap">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map((player, index) => {
                    const onePosStats = getModeStats(player.onePosition);
                    const allPosStats = getModeStats(player.allPositions);
                    const totalRounds = getTotalRounds(player);
                    const totalAttempts = getTotalAttempts(player);
                    const totalCorrect = getTotalCorrect(player);
                    const overallAccuracy = getOverallAccuracy(player);
                    const lastActivity = getLastActivity(player);

                    return (
                      <tr
                        key={player.playerId}
                        className={`border-b border-border/50 ${index % 2 === 0 ? 'bg-card' : 'bg-secondary/20'}`}
                      >
                        {/* Player Info */}
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-card-foreground">
                              {player.number === 0 && player.playerId === 1 ? '#00' : player.number === 0 ? '#0' : `#${player.number}`} {player.name}
                            </p>
                          </div>
                        </td>

                        {/* One Position Stats */}
                        <td className="p-4 text-center">
                          {onePosStats.totalRounds > 0 ? (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-card-foreground">
                                {onePosStats.totalRounds} rounds
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className={`font-medium ${onePosStats.accuracy !== null && onePosStats.accuracy >= 80 ? 'text-green-600' : onePosStats.accuracy !== null && onePosStats.accuracy >= 60 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                  {onePosStats.accuracy}%
                                </span>
                                {' • '}
                                {onePosStats.totalAttempts} attempts
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(player.onePosition.practice?.totalRounds || 0) > 0 && (
                                  <span>Practice: {player.onePosition.practice?.totalRounds || 0}</span>
                                )}
                                {(player.onePosition.practice?.totalRounds || 0) > 0 && (player.onePosition.competition?.totalRounds || 0) > 0 && ' • '}
                                {(player.onePosition.competition?.totalRounds || 0) > 0 && (
                                  <span>Compete: {player.onePosition.competition?.totalRounds || 0}</span>
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No activity</p>
                          )}
                        </td>

                        {/* All Positions Stats */}
                        <td className="p-4 text-center">
                          {allPosStats.totalRounds > 0 ? (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-card-foreground">
                                {allPosStats.totalRounds} rounds
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className={`font-medium ${allPosStats.accuracy !== null && allPosStats.accuracy >= 80 ? 'text-green-600' : allPosStats.accuracy !== null && allPosStats.accuracy >= 60 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                  {allPosStats.accuracy}%
                                </span>
                                {' • '}
                                {allPosStats.totalAttempts} attempts
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(player.allPositions.practice?.totalRounds || 0) > 0 && (
                                  <span>Practice: {player.allPositions.practice?.totalRounds || 0}</span>
                                )}
                                {(player.allPositions.practice?.totalRounds || 0) > 0 && (player.allPositions.competition?.totalRounds || 0) > 0 && ' • '}
                                {(player.allPositions.competition?.totalRounds || 0) > 0 && (
                                  <span>Compete: {player.allPositions.competition?.totalRounds || 0}</span>
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No activity</p>
                          )}
                        </td>

                        {/* Total Stats */}
                        <td className="p-4 text-center">
                          {totalAttempts > 0 ? (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-card-foreground">
                                {totalRounds} rounds
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className={`font-medium ${overallAccuracy >= 80 ? 'text-green-600' : overallAccuracy >= 60 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                  {overallAccuracy}%
                                </span>
                                {' • '}
                                {totalAttempts} attempts
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {totalCorrect}/{totalAttempts} correct
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No activity</p>
                          )}
                        </td>

                        {/* Last Activity */}
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <p className={`text-xs font-medium ${getActivityColor(lastActivity)}`}>
                              {formatDate(lastActivity)}
                            </p>
                            {lastActivity > 0 && (
                              <div className={`w-2 h-2 rounded-full ${getActivityBgColor(lastActivity)}`} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
