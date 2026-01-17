import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useState, useEffect, useMemo } from 'react';
import Field from './Field';
import AnswerButtons from './AnswerButtons';
import FeedbackOverlay from './FeedbackOverlay';
import SituationHeader from './SituationHeader';
import PlayerDisplay from './PlayerDisplay';
import { GameMode, Scenario } from '../types';
import { POSITIONS } from '../constants';
import { Trophy, Clock, AlertTriangle } from 'lucide-react';
import { getPlayerId, getOverallStats } from '../utils/localStorage';
import { syncStatsToLeaderboard } from '../utils/leaderboard';

export default function GameScreen() {
  const { mode } = useParams<{ mode: GameMode }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const practiceWeakSpots = searchParams.get('weakSpots') === 'true';
  const learningMode = searchParams.get('learning') === 'true';
  const playParam = searchParams.get('play');
  const playNumber = playParam ? Number.parseInt(playParam, 10) : null;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isTestingPlay = isLocalhost && !!playNumber && !Number.isNaN(playNumber);
  const effectiveLearningMode = learningMode || isTestingPlay;
  const selectedPositionRaw = searchParams.get('position');
  const selectedPosition = selectedPositionRaw ? decodeURIComponent(selectedPositionRaw) : null;
  const effectivePosition = selectedPosition || (isLocalhost && mode === 'my_positions' ? 'RF' : null);

  // Debug logging - log immediately on render
  console.log('[GameScreen] Component rendering - Mode:', mode, 'URL:', window.location.href, 'Position:', selectedPosition, 'Learning:', learningMode, 'SearchParams:', Array.from(searchParams.entries()));
  
  // Debug logging in useEffect
  useEffect(() => {
    console.log('[GameScreen] useEffect - Mode:', mode, 'Position:', selectedPosition, 'Learning:', learningMode);
  }, [mode, selectedPosition, learningMode]);
  
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [scenarioLoading, setScenarioLoading] = useState(true);
  const scenariosForGame = useMemo(() => {
    if (!playNumber || Number.isNaN(playNumber)) {
      return allScenarios;
    }
    const index = playNumber - 1;
    if (index < 0 || index >= allScenarios.length) {
      return allScenarios;
    }
    return [allScenarios[index]];
  }, [allScenarios, playNumber]);

  // Load all scenarios from KV - will be mixed within each round
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const { loadScenariosAsync } = await import('../utils/scenarioEngine');
        // Force reload to ensure we get fresh scenarios from KV (in case new scenarios were added)
        const scenarios = await loadScenariosAsync(true); // Force reload from KV
        if (scenarios.length === 0) {
          console.error('No scenarios found in KV.');
          setAllScenarios([]);
          return;
        }
        console.log('[GameScreen] Loaded', scenarios.length, 'scenarios:', scenarios.map(s => s.id));
        setAllScenarios(scenarios);
      } catch (error) {
        console.error('Failed to load scenarios:', error);
        setAllScenarios([]);
      } finally {
        setScenarioLoading(false);
      }
    };
    loadScenarios();
  }, []);

  useEffect(() => {
    if (!isLocalhost || mode !== 'my_positions' || selectedPosition) return;
    const next = new URLSearchParams(searchParams);
    next.set('position', 'RF');
    setSearchParams(next, { replace: true });
  }, [isLocalhost, mode, selectedPosition, searchParams, setSearchParams]);
  
  // Validate routing and redirect if needed (using useEffect to avoid render-time navigation)
  useEffect(() => {
    // Use a longer delay to ensure URL params are fully parsed, especially on mobile
    const timeoutId = setTimeout(() => {
      // Only validate after component has mounted and params are available
      if (!mode) {
        // Mode not yet parsed, but don't redirect yet - might still be loading
        console.log('GameScreen: Waiting for mode parameter...');
        return;
      }

      // Validate mode
      if (mode !== 'my_positions' && mode !== 'whole_field') {
        console.error('GameScreen: Invalid mode:', mode);
        navigate('/', { replace: true });
        return;
      }

      // For my_positions mode, check if position is provided
      if (mode === 'my_positions') {
        // Try multiple ways to get position - check URL directly first (most reliable)
        const currentUrl = new URL(window.location.href);
        const posFromUrl = currentUrl.searchParams.get('position');
        const posFromSearchParams = searchParams.get('position');
        const posFromSelected = selectedPosition;
        const position = posFromUrl || posFromSearchParams || posFromSelected;
        
        if (!position) {
          // Position truly doesn't exist - wait a bit more for React Router to parse
          console.warn('GameScreen: Position not found yet. URL:', window.location.href, 'Search params:', Array.from(searchParams.entries()));
          // Don't redirect immediately - give it more time for params to be parsed
          // The validation will run again on the next render cycle
          return;
        } else {
          // Position is available - validate it's a valid position
          const validPositions = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
          const decodedPosition = decodeURIComponent(position);
          if (!validPositions.includes(decodedPosition)) {
            console.error('GameScreen: Invalid position value:', decodedPosition);
            navigate('/', { replace: true });
            return;
          }
        }
      }
    }, 500); // Increased delay to 500ms for better mobile/React Router compatibility

    return () => clearTimeout(timeoutId);
  }, [mode, selectedPosition, navigate, searchParams]);

  // Handle invalid mode redirect using useEffect (outside conditional)
  useEffect(() => {
    if (mode && mode !== 'my_positions' && mode !== 'whole_field') {
      console.error('[GameScreen] Invalid mode:', mode, 'Redirecting to home');
      navigate('/', { replace: true });
    }
  }, [mode, navigate]);

  // IMPORTANT: All hooks must be called unconditionally before any early returns
  // Call useGameState even if allScenarios is empty (it will handle empty scenarios)
  const { gameState, currentPrompt, showFeedback, roundComplete, handleAnswer, advanceToNext } =
    useGameState(scenariosForGame, mode || 'whole_field', practiceWeakSpots, effectiveLearningMode, effectivePosition);

  // Debug logging for game state - log when gameState changes
  // MUST be called before any early returns
  useEffect(() => {
    console.log('[GameScreen] Game state updated (useEffect):', {
      promptsLength: gameState.prompts.length,
      currentPromptIndex: gameState.currentPromptIndex,
      currentPrompt: currentPrompt ? `exists (${currentPrompt.role})` : 'null',
      roundComplete,
      willShowGame: currentPrompt !== null,
    });
    
    if (gameState.prompts.length > 0 && currentPrompt) {
      console.log('[GameScreen] ✅ Should be showing game now!');
    }
  }, [gameState.prompts.length, gameState.currentPromptIndex, currentPrompt, roundComplete]);

  // Sync stats to leaderboard when round completes (both practice and competition modes)
  // MUST be called before any early returns
  useEffect(() => {
    if (roundComplete) {
      const playerId = getPlayerId();
      if (playerId) {
        const { correct, incorrect, totalTime } = gameState.roundStats;
        
        // Determine leaderboard mode based on game mode
        const leaderboardMode: 'one_position' | 'all_positions' = mode === 'my_positions' ? 'one_position' : 'all_positions';
        
        // Get stats for best streak (use the appropriate mode)
        const overallStats = getOverallStats(learningMode);
        const bestStreak = overallStats.bestStreak;
        
        // Sync stats with practice mode flag
        syncStatsToLeaderboard(playerId, {
          correct,
          incorrect,
          totalTime,
          bestStreak,
          mode: leaderboardMode,
          practiceMode: learningMode ? 'practice' : 'competition',
          totalRounds: 1, // Each round completion = 1 round
        }).catch(err => {
          console.warn('Failed to sync stats to leaderboard:', err);
        });
      }
    }
  }, [roundComplete, gameState.roundStats, effectiveLearningMode, mode]);

  // Show loading while scenario is being loaded
  // CRITICAL: All hooks must be called before any early returns
  // Memoize the scenarios map here to ensure hooks are always called in the same order
  const scenariosMap = useMemo(() => {
    const map = new Map<string, Scenario>();
    scenariosForGame.forEach(s => map.set(s.id, s));
    return map;
  }, [scenariosForGame]);

  if (scenarioLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (allScenarios.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load game. Please refresh the page.</p>
          <p className="text-sm text-muted-foreground">No scenarios found in KV.</p>
        </div>
      </div>
    );
  }


  // Validate mode - but be lenient during initial load
  if (!mode) {
    console.log('[GameScreen] Mode not parsed yet, showing loading...');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-muted-foreground">Loading game mode...</div>
      </div>
    );
  }
  
  if (mode !== 'my_positions' && mode !== 'whole_field') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-muted-foreground">Invalid game mode. Redirecting...</div>
      </div>
    );
  }

  // Validate position for my_positions mode - but be more lenient during initial load
  if (mode === 'my_positions') {
    // Check both selectedPosition and searchParams to handle timing issues
    const posFromParams = searchParams.get('position');
    const position = selectedPosition || posFromParams;
    
    // Only show loading if we're still waiting for position AND we've given it time
    // This prevents immediate redirect before URL params are parsed
    if (!position) {
      // Check if position is in the URL directly - be lenient, let useEffect handle validation
      // Don't return early here - allow component to render and let validation useEffect handle it
      // The useEffect will redirect if position is truly missing after waiting for params to parse
    }
  }
  
  // Debug logging on every render
  console.log('[GameScreen] Render - prompts:', gameState.prompts.length, 'currentPrompt:', currentPrompt ? `exists (${currentPrompt.role})` : 'null', 'willRenderGame:', !!currentPrompt);

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
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all active:scale-[0.98]"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPrompt) {
    // Check if prompts are being generated
    if (gameState.prompts.length === 0) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-muted-foreground">Loading game...</div>
            <div className="text-xs text-muted-foreground">Setting up prompts</div>
          </div>
        </div>
      );
    }
    // If prompts exist but currentPrompt is null, there's an issue with the prompt index
    console.error('Prompts exist but currentPrompt is null', {
      promptsLength: gameState.prompts.length,
      currentPromptIndex: gameState.currentPromptIndex,
    });
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">Error loading prompt</div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary underline mt-2"
          >
            Return to home
          </button>
        </div>
      </div>
    );
  }

  // Get the scenario for the current prompt (each prompt can come from a different scenario)
  // scenariosMap is already memoized above (before early returns)
  const currentScenario = scenariosMap.get(currentPrompt.scenarioId);
  
  if (!currentScenario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error: Scenario not found for current prompt.</p>
        </div>
      </div>
    );
  }
  
  const roleDef = currentScenario.roles[currentPrompt.role];
  const currentPromptIndex = gameState.currentPromptIndex;
  const totalPrompts = gameState.prompts.length;
  const progress = `${currentPromptIndex + 1}/${totalPrompts}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-md px-4 pb-36">
        <div className="py-6 space-y-6">
        {/* Player Display */}
        <div className="flex justify-end">
          <PlayerDisplay />
        </div>
        
        {/* Test Play Selector */}
        {isLocalhost && (
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center">
              <label className="text-xs text-muted-foreground mr-2" htmlFor="play-select">
                Play
              </label>
              <select
                id="play-select"
                value={playNumber && !Number.isNaN(playNumber) ? playNumber : 'all'}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  const value = event.target.value;
                  if (value === 'all') {
                    next.delete('play');
                  } else {
                    next.set('play', value);
                  }
                  setSearchParams(next, { replace: true });
                }}
                className="px-2 py-1 rounded-md border border-border text-xs bg-white text-foreground"
              >
                <option value="all">All</option>
                {Array.from({ length: 46 }, (_, index) => (
                  <option key={`play-${index + 1}`} value={index + 1}>
                    {index + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="text-xs text-muted-foreground mr-2" htmlFor="position-select">
                Position
              </label>
              <select
                id="position-select"
                value={selectedPosition || 'all'}
                onChange={(event) => {
                  const value = event.target.value;
                  const next = new URLSearchParams(searchParams);
                  if (value === 'all') {
                    next.delete('position');
                  } else {
                    next.set('position', value);
                  }
                  if (mode !== 'my_positions' && value !== 'all') {
                    navigate(`/game/my_positions?${next.toString()}`);
                    return;
                  }
                  setSearchParams(next, { replace: true });
                }}
                className="px-2 py-1 rounded-md border border-border text-xs bg-white text-foreground"
              >
                <option value="all">All</option>
                {POSITIONS.map((pos) => (
                  <option key={`pos-${pos}`} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Situation Header */}
        <SituationHeader
          scenario={currentScenario}
          mode={mode}
          learningMode={effectiveLearningMode}
          role={currentPrompt.role}
          questionType={currentPrompt.questionType}
          progress={progress}
          playNumber={playNumber}
          timerRemaining={gameState.timerRemaining}
          timerTotal={10000}
          showTimer={!learningMode}
        />

        {/* Field Card */}
        <Field
          scenario={currentScenario}
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
          scenario={currentScenario}
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
