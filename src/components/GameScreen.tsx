import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getRandomScenario } from '../utils/scenarioEngine';
import { useState, useEffect } from 'react';
import Field from './Field';
import AnswerButtons from './AnswerButtons';
import FeedbackOverlay from './FeedbackOverlay';
import SituationHeader from './SituationHeader';
import { GameMode } from '../types';
import { Trophy, Clock, AlertTriangle } from 'lucide-react';
import { getPlayerId } from '../utils/localStorage';
import { getOverallStats } from '../utils/localStorage';
import { syncStatsToLeaderboard } from '../utils/leaderboard';

export default function GameScreen() {
  const { mode } = useParams<{ mode: GameMode }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const practiceWeakSpots = searchParams.get('weakSpots') === 'true';
  const learningMode = searchParams.get('learning') === 'true';
  const selectedPosition = searchParams.get('position') || null;
  const [scenario] = useState(() => {
    try {
      return getRandomScenario();
    } catch (error) {
      console.error('Failed to load scenario:', error);
      return null;
    }
  });
  
  if (!scenario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load game. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  // Validate that position is provided for my_positions mode
  if (mode === 'my_positions' && !selectedPosition) {
    navigate('/');
    return null;
  }
  
  const { gameState, currentPrompt, showFeedback, roundComplete, handleAnswer, advanceToNext } =
    useGameState(scenario, mode || 'whole_field', practiceWeakSpots, learningMode, selectedPosition);

  if (!mode || (mode !== 'my_positions' && mode !== 'whole_field')) {
    navigate('/');
    return null;
  }

  // Sync stats to leaderboard when round completes
  useEffect(() => {
    if (roundComplete) {
      const playerId = getPlayerId();
      if (playerId) {
        const { correct, incorrect, totalTime } = gameState.roundStats;
        const overallStats = getOverallStats();
        const bestStreak = overallStats.bestStreak;
        
        syncStatsToLeaderboard(playerId, {
          correct,
          incorrect,
          totalTime,
          bestStreak,
        }).catch(err => {
          console.warn('Failed to sync stats to leaderboard:', err);
        });
      }
    }
  }, [roundComplete, gameState.roundStats]);

  if (roundComplete) {
    const { correct, incorrect, totalTime, responses } = gameState.roundStats;
    const total = correct + incorrect;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgTime = responses.length > 0 ? (totalTime / responses.length / 1000).toFixed(1) : '0';
    const isGreat = percentage >= 80;
    const isGood = percentage >= 60;

    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-md px-4 pb-safe">
          <div className="py-8 space-y-8">
            {/* Score display */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                <Trophy className={`w-10 h-10 ${isGreat ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-card-foreground">
                  {correct} / {total}
                </h1>
                <p className="text-lg text-muted-foreground mt-1">
                  {isGreat ? 'Excellent!' : isGood ? 'Good job!' : 'Keep practicing!'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold text-card-foreground">{avgTime}s</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
              {percentage < 67 && (
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <AlertTriangle className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-sm font-semibold text-card-foreground">Keep practicing</p>
                  <p className="text-xs text-muted-foreground">Weak Spot</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg transition-all active:scale-[0.98]"
              >
                Play Again
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const newMode = mode === 'my_positions' ? 'whole_field' : 'my_positions';
                    if (newMode === 'whole_field') {
                      navigate(`/game/${newMode}${learningMode ? '?learning=true' : ''}`);
                    } else {
                      // For my_positions, go back to home to select position
                      navigate('/');
                    }
                    window.location.reload();
                  }}
                  className="py-3 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all active:scale-[0.98]"
                >
                  Switch Mode
                </button>
                <button
                  onClick={() => navigate('/progress')}
                  className="py-3 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all active:scale-[0.98]"
                >
                  View Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPrompt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const roleDef = scenario.roles[currentPrompt.role];
  const currentPromptIndex = gameState.currentPromptIndex;
  const totalPrompts = gameState.prompts.length;
  const progress = `${currentPromptIndex + 1}/${totalPrompts}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-md px-4 pb-36">
        <div className="py-6 space-y-6">
        {/* Situation Header */}
        <SituationHeader
          scenario={scenario}
          mode={mode}
          learningMode={learningMode}
          role={currentPrompt.role}
          questionType={currentPrompt.questionType}
          progress={progress}
          timerRemaining={gameState.timerRemaining}
          timerTotal={10000}
          showTimer={!learningMode}
        />

        {/* Field Card */}
        <Field
          scenario={scenario}
          highlightedRole={currentPrompt.role}
          showFeedback={showFeedback ? { role: currentPrompt.role, target: roleDef.target } : null}
        />

        </div>
      </div>

      {/* Answer Grid - Fixed bottom */}
      <AnswerButtons
        options={currentPrompt.options}
        correctIndex={currentPrompt.correctIndex}
        onSelect={(option, index) => handleAnswer(option, index)}
        disabled={showFeedback}
        selectedIndex={
          gameState.selectedAnswer
            ? currentPrompt.options.indexOf(gameState.selectedAnswer)
            : null
        }
        showCorrect={showFeedback}
      />

      {/* Feedback Overlay */}
      {showFeedback && (
        <FeedbackOverlay
          prompt={currentPrompt}
          scenario={scenario}
          correct={
            gameState.selectedAnswer
              ? currentPrompt.options.indexOf(gameState.selectedAnswer) === currentPrompt.correctIndex
              : false
          }
          selectedAnswer={gameState.selectedAnswer || null}
          onContinue={advanceToNext}
        />
      )}
    </div>
  );
}
