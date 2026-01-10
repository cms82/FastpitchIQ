import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboard } from '../utils/leaderboard';
import { PlayerStats, LeaderboardMode } from '../types';
import PlayerDisplay from './PlayerDisplay';
import { Trophy, RefreshCw } from 'lucide-react';

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>('all_positions');
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // fetchLeaderboard already handles ranking and filtering
      const stats = await fetchLeaderboard(leaderboardMode);
      setLeaderboard(stats);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [leaderboardMode]);

  const getAccuracy = (stats: PlayerStats['stats']): number => {
    if (stats.totalAttempts === 0) return 0;
    return Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
  };

  const getAverageTime = (stats: PlayerStats['stats']): string => {
    if (stats.totalAttempts === 0) return '0.0';
    return (stats.totalTime / stats.totalAttempts / 1000).toFixed(1);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-safe">
        <div className="py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')} 
                className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-card-foreground">Leaderboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <PlayerDisplay />
              <button
                onClick={loadLeaderboard}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mode Toggle - Pill Style */}
          <div className="flex items-center justify-center mb-4">
            <div className="inline-flex rounded-full bg-secondary p-1 border border-border">
              <button
                onClick={() => setLeaderboardMode('one_position')}
                className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                  leaderboardMode === 'one_position'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                One Position
              </button>
              <button
                onClick={() => setLeaderboardMode('all_positions')}
                className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                  leaderboardMode === 'all_positions'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Positions
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && leaderboard.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="text-center py-12 space-y-4">
              <p className="text-destructive">{error}</p>
              <button
                onClick={loadLeaderboard}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Leaderboard */}
          {!loading && !error && leaderboard.length > 0 && (
            <div className="space-y-3">
              {/* Top 3 */}
              {leaderboard.slice(0, 3).map((player, index) => {
                const accuracy = getAccuracy(player.stats);
                const avgTime = getAverageTime(player.stats);
                return (
                  <div
                    key={player.playerId}
                    className={`
                      bg-card rounded-xl border-2 p-4
                      ${index === 0 ? 'border-primary bg-primary/5' : ''}
                      ${index === 1 ? 'border-muted-foreground/50 bg-secondary/50' : ''}
                      ${index === 2 ? 'border-primary/30 bg-primary/5' : ''}
                      ${index > 2 ? 'border-border' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-card-foreground w-8">
                          {getRankIcon(index)}
                        </span>
                        <div>
                          <p className="font-semibold text-card-foreground">
                            {player.number === 0 && player.playerId === 1 ? '#00' : player.number === 0 ? '#0' : `#${player.number}`} {player.name}
                          </p>
                          {player.stats.totalAttempts === 0 && (
                            <p className="text-xs text-muted-foreground">No attempts yet</p>
                          )}
                        </div>
                      </div>
                      {player.stats.totalAttempts > 0 && (
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{accuracy}%</p>
                        </div>
                      )}
                    </div>
                    {player.stats.totalAttempts > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-card-foreground">{accuracy}%</p>
                          <p className="text-xs text-muted-foreground">Accuracy</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-card-foreground">{avgTime}s</p>
                          <p className="text-xs text-muted-foreground">Avg Time</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-card-foreground">{player.stats.totalRounds}</p>
                          <p className="text-xs text-muted-foreground">Rounds</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Rest of players */}
              {leaderboard.slice(3).length > 0 && (
                <div className="space-y-2 pt-2">
                  {leaderboard.slice(3).map((player, index) => {
                    const globalIndex = index + 3;
                    const accuracy = getAccuracy(player.stats);
                    const avgTime = getAverageTime(player.stats);
                    return (
                      <div
                        key={player.playerId}
                        className="bg-card rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-6">
                              {globalIndex + 1}.
                            </span>
                            <div>
                              <p className="font-medium text-card-foreground text-sm">
                                {player.number === 0 && player.playerId === 1 ? '#00' : player.number === 0 ? '#0' : `#${player.number}`} {player.name}
                              </p>
                            </div>
                          </div>
                          {player.stats.totalAttempts > 0 ? (
                            <div className="text-right">
                              <p className="text-lg font-bold text-card-foreground">{accuracy}%</p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">—</p>
                          )}
                        </div>
                        {player.stats.totalAttempts > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/50">
                            <div className="text-center">
                              <p className="text-xs font-medium text-muted-foreground">{avgTime}s</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-medium text-muted-foreground">{player.stats.bestStreak}</p>
                              <p className="text-xs text-muted-foreground/70">Best Streak</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-medium text-muted-foreground">
                                {player.stats.totalRounds} rounds
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && leaderboard.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
              <p className="text-muted-foreground">Complete 5 rounds in Competition Mode to appear on the leaderboard!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
