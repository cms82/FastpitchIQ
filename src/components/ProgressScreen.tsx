import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStats } from '../hooks/useStats';
import { POSITIONS } from '../constants';
import { intentLabels } from '../constants';
import { resetProgress, getPreferences } from '../utils/localStorage';
import ConfirmationDialog from './ConfirmationDialog';
import { Target, Clock, Flame, AlertTriangle } from 'lucide-react';

export default function ProgressScreen() {
  const navigate = useNavigate();
  const { overallStats, positionStats, weakSpots, accuracy, avgResponseTime } = useStats();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const prefs = getPreferences();

  const handlePracticeWeakSpots = () => {
    // Navigate to game with weak spots mode
    // For now, we'll use a query param or state to indicate weak spots mode
    navigate('/game/whole_field?weakSpots=true');
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = () => {
    resetProgress();
    setShowResetConfirm(false);
    // Force refresh by reloading the page to update stats
    window.location.reload();
  };

  const handleResetCancel = () => {
    setShowResetConfirm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-safe">
        <div className="py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-card-foreground">Your Progress</h1>
          </div>

          {/* Overall stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <Target className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-card-foreground">{accuracy.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold text-card-foreground">{(avgResponseTime / 1000).toFixed(1)}s</p>
              <p className="text-xs text-muted-foreground">Avg Time</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <Flame className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-card-foreground">{overallStats.bestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          </div>

          {/* Position accuracy grid */}
          <div className="space-y-3">
            <h2 className="font-semibold text-card-foreground">Position Accuracy</h2>
            <div className="grid grid-cols-3 gap-2">
              {POSITIONS.map((pos) => {
                const stats = positionStats[pos];
                const posAccuracy = stats ? Math.round((stats.correct / stats.attempts) * 100) : 0;
                const isLow = posAccuracy < 60;
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

          {/* Actions */}
          <div className="space-y-2">
            {prefs.selectedPrimaryPosition && (
              <button
                onClick={() => navigate('/setup')}
                className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all active:scale-[0.98]"
              >
                Edit Positions
              </button>
            )}
            <button
              onClick={handleResetClick}
              className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-medium transition-all active:scale-[0.98]"
            >
              Reset Progress
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showResetConfirm}
        title="Reset Progress"
        message="Are you sure you want to reset all your progress? This will clear all stats, accuracy data, and weak spots. Your position preferences will be kept. This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
    </div>
  );
}
