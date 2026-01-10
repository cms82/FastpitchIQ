import { useNavigate } from 'react-router-dom';
import { useStats } from '../hooks/useStats';
import { POSITIONS } from '../constants';
import { intentLabels } from '../constants';
import PlayerDisplay from './PlayerDisplay';
import { Target, Clock, Flame, AlertTriangle } from 'lucide-react';

export default function ProgressScreen() {
  const navigate = useNavigate();
  const { 
    weakSpots,
    learningOverallStats,
    learningPositionStats,
    timedOverallStats,
    timedPositionStats
  } = useStats();

  const handlePracticeWeakSpots = () => {
    // Navigate to game with weak spots mode
    // For now, we'll use a query param or state to indicate weak spots mode
    navigate('/game/whole_field?weakSpots=true');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-safe">
        <div className="py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-card-foreground">Your Progress</h1>
            </div>
            <PlayerDisplay />
          </div>

          {/* Competition Mode Stats Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-card-foreground">Competition Mode Stats</h2>
              <span className="text-xs text-muted-foreground">(10s timer)</span>
            </div>

            {/* Overall stats - Timed Mode */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Target className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-card-foreground">
                  {timedOverallStats.totalAttempts > 0 
                    ? Math.round((timedOverallStats.totalCorrect / timedOverallStats.totalAttempts) * 100) 
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold text-card-foreground">
                  {(() => {
                    const positions = Object.values(timedPositionStats);
                    if (positions.length === 0) return '0.0';
                    const totalTime = positions.reduce((sum: number, pos: any) => sum + (pos.avgTimeMs || 0) * (pos.attempts || 0), 0);
                    const totalAttempts = positions.reduce((sum: number, pos: any) => sum + (pos.attempts || 0), 0);
                    return totalAttempts > 0 ? (totalTime / totalAttempts / 1000).toFixed(1) : '0.0';
                  })()}s
                </p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Flame className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-card-foreground">{timedOverallStats.bestStreak}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>

            {/* Position accuracy grid - Timed Mode */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-card-foreground">Position Accuracy</h3>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((pos) => {
                  const stats = timedPositionStats[pos];
                  const posAccuracy = stats && stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
                  const isLow = posAccuracy < 60 && stats && stats.attempts > 0;
                  return (
                    <div
                      key={pos}
                      className={`bg-card rounded-lg border p-3 text-center ${isLow ? 'border-primary/50' : 'border-border'}`}
                    >
                      <p className="text-sm font-bold text-card-foreground">{pos}</p>
                      <p className={`text-lg font-semibold ${isLow ? 'text-primary' : 'text-muted-foreground'}`}>
                        {posAccuracy}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Practice Mode Stats Section */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-card-foreground">Practice Mode Stats</h2>
              <span className="text-xs text-muted-foreground">(no timer)</span>
            </div>

            {/* Overall stats - Learning Mode */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Target className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-card-foreground">
                  {learningOverallStats.totalAttempts > 0 
                    ? Math.round((learningOverallStats.totalCorrect / learningOverallStats.totalAttempts) * 100) 
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold text-card-foreground">
                  {(() => {
                    const positions = Object.values(learningPositionStats);
                    if (positions.length === 0) return '0.0';
                    const totalTime = positions.reduce((sum: number, pos: any) => sum + (pos.avgTimeMs || 0) * (pos.attempts || 0), 0);
                    const totalAttempts = positions.reduce((sum: number, pos: any) => sum + (pos.attempts || 0), 0);
                    return totalAttempts > 0 ? (totalTime / totalAttempts / 1000).toFixed(1) : '0.0';
                  })()}s
                </p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Flame className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-card-foreground">{learningOverallStats.bestStreak}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>

            {/* Position accuracy grid - Learning Mode */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-card-foreground">Position Accuracy</h3>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((pos) => {
                  const stats = learningPositionStats[pos];
                  const posAccuracy = stats && stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
                  const isLow = posAccuracy < 60 && stats && stats.attempts > 0;
                  return (
                    <div
                      key={pos}
                      className={`bg-card rounded-lg border p-3 text-center ${isLow ? 'border-primary/50' : 'border-border'}`}
                    >
                      <p className="text-sm font-bold text-card-foreground">{pos}</p>
                      <p className={`text-lg font-semibold ${isLow ? 'text-primary' : 'text-muted-foreground'}`}>
                        {posAccuracy}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weak spots */}
          {weakSpots.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-card-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Weak Spots
              </h2>
              <div className="space-y-2">
                {weakSpots.map((spot, i) => (
                  <div
                    key={i}
                    className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-card-foreground"
                  >
                    {spot.role} - {intentLabels[spot.intent]} ({spot.questionType})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Practice button */}
          {weakSpots.length > 0 && (
            <button
              onClick={handlePracticeWeakSpots}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg transition-all active:scale-[0.98]"
            >
              Practice Weak Spots
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
