import { useState, useEffect, useCallback, useMemo } from 'react';
import { Scenario, GameMode, GameState, AnswerOption } from '../types';
import { generatePrompts } from '../utils/promptGenerator';
import { Position } from '../types';
import { generateAnswers, createRoundState } from '../utils/answerGenerator';
import {
  updatePositionStats,
  updateScenarioStats,
  updateOverallStats,
  updateWeakSpots,
} from '../utils/localStorage';

const TIMER_DURATION = 10000; // 10 seconds

export function useGameState(
  allScenarios: Scenario[],
  mode: GameMode,
  practiceWeakSpots: boolean = false,
  learningMode: boolean = false,
  selectedPosition?: string | null
) {
  // CRITICAL: All hooks must be called unconditionally before any early returns
  // This ensures hooks are always called in the same order
  
  // Create a memoized map of scenario ID to scenario for quick lookup
  // This prevents infinite loops by ensuring the map reference is stable
  const scenariosMap = useMemo(() => {
    const map = new Map<string, Scenario>();
    allScenarios.forEach(s => map.set(s.id, s));
    return map;
  }, [allScenarios]);
  
  // Use first scenario for currentScenario (for backwards compatibility with GameState type)
  const firstScenario = allScenarios.length > 0 ? allScenarios[0] : null;
  
  const [gameState, setGameState] = useState<GameState>({
    currentScenario: firstScenario,
    prompts: [],
    currentPromptIndex: 0,
    selectedAnswer: null,
    timerActive: false,
    timerRemaining: TIMER_DURATION,
    roundStats: {
      correct: 0,
      incorrect: 0,
      totalTime: 0,
      responses: [],
    },
  });

  const [roundState] = useState(() => createRoundState());
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [promptStartTime, setPromptStartTime] = useState(() => Date.now());

  // Initialize prompts
  useEffect(() => {
    // Don't initialize if no scenarios
    if (allScenarios.length === 0) {
      return;
    }
    
    try {
      const position = mode === 'my_positions' && selectedPosition ? (selectedPosition as Position) : null;
      
      console.log('useGameState: Initializing prompts', { mode, selectedPosition, position, totalScenarios: allScenarios.length });
      
      // Validate position for my_positions mode
      if (mode === 'my_positions' && !position) {
        console.error('Missing position for my_positions mode. SelectedPosition:', selectedPosition);
        return;
      }
      
      // Generate prompts from multiple scenarios (will mix scenarios within the round)
      const prompts = generatePrompts(
        allScenarios,
        mode,
        position,
        practiceWeakSpots
      );

      console.log('Generated prompts:', prompts.length, 'from', new Set(prompts.map(p => p.scenarioId)).size, 'different scenarios');

      // Generate answers for all prompts - each prompt may come from a different scenario
      let promptsWithAnswers;
      try {
        console.log('[useGameState] About to generate answers, roundState:', roundState);
        promptsWithAnswers = prompts.map((p, index) => {
          try {
            // Look up the scenario for this prompt
            const promptScenario = scenariosMap.get(p.scenarioId);
            if (!promptScenario) {
              throw new Error(`Scenario ${p.scenarioId} not found in scenarios map`);
            }
            console.log(`[useGameState] Generating answers for prompt ${index}:`, p.role, p.questionType, 'scenario:', p.scenarioId, 'role exists:', !!promptScenario.roles[p.role]);
            if (!promptScenario.roles[p.role]) {
              throw new Error(`Role ${p.role} not found in scenario ${p.scenarioId}`);
            }
            const result = generateAnswers(p, promptScenario, roundState);
            console.log(`[useGameState] Generated answers for prompt ${index}:`, result.options.length, 'options');
            return result;
          } catch (error) {
            console.error(`[useGameState] Error generating answers for prompt ${index}:`, p, error);
            throw error;
          }
        });
        console.log('[useGameState] Generated prompts with answers:', promptsWithAnswers.length);
      } catch (error) {
        console.error('[useGameState] Failed to generate answers:', error);
        console.error('[useGameState] Error stack:', error instanceof Error ? error.stack : 'No stack');
        throw error;
      }

      setGameState((prev) => {
        const newState = {
          ...prev,
          prompts: promptsWithAnswers,
          currentPromptIndex: 0,
          timerActive: !learningMode,
          timerRemaining: TIMER_DURATION,
        };
        console.log('[useGameState] Setting game state with prompts:', promptsWithAnswers.length, 'first prompt:', promptsWithAnswers[0]?.role);
        return newState;
      });
      setPromptStartTime(Date.now());
      console.log('[useGameState] State update queued');
    } catch (error) {
      console.error('Failed to initialize prompts:', error);
      // Set empty prompts to prevent infinite loading
      setGameState((prev) => ({
        ...prev,
        prompts: [],
        currentPromptIndex: 0,
      }));
    }
  }, [allScenarios, mode, practiceWeakSpots, learningMode, selectedPosition, scenariosMap]);

  const handleTimeout = useCallback(() => {
    if (learningMode || allScenarios.length === 0) return; // No timeout in learning mode or if no scenarios
    setGameState((prev) => {
      const currentPrompt = prev.prompts[prev.currentPromptIndex];
      if (!currentPrompt) return prev;

      // Mark as incorrect - use actual elapsed time or timer duration, whichever is greater
      const timeMs = Math.max(TIMER_DURATION, Date.now() - promptStartTime);
      const newStats = {
        ...prev.roundStats,
        incorrect: prev.roundStats.incorrect + 1,
        totalTime: prev.roundStats.totalTime + timeMs,
        responses: [
          ...prev.roundStats.responses,
          {
            prompt: currentPrompt,
            selected: null,
            correct: false,
            timeMs,
          },
        ],
      };

      // Update stats (timeout counts as incorrect) - timeouts only happen in timed mode
      updatePositionStats(currentPrompt.role, false, timeMs, false);
      updateScenarioStats(currentPrompt.scenarioId, false, false);
      updateOverallStats(false, currentStreak, false);
      setCurrentStreak(0);
      updateWeakSpots(
        currentPrompt.role,
        currentPrompt.questionType,
        currentPrompt.correctAnswer,
        false,
        false
      );

      setShowFeedback(true);

      return {
        ...prev,
        timerActive: false,
        timerRemaining: 0,
        roundStats: newStats,
      };
    });
  }, [allScenarios, currentStreak, learningMode, promptStartTime]);

  // Timer effect
  useEffect(() => {
    if (learningMode || !gameState.timerActive || showFeedback || roundComplete) return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        const newRemaining = prev.timerRemaining - 100;
        if (newRemaining <= 0) {
          // Timeout - mark as incorrect
          handleTimeout();
          return prev;
        }
        return { ...prev, timerRemaining: newRemaining };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [learningMode, gameState.timerActive, showFeedback, roundComplete, handleTimeout]);

  const handleAnswer = useCallback(
    (option: AnswerOption, index: number) => {
      if (showFeedback || allScenarios.length === 0) return;

      const currentPrompt = gameState.prompts[gameState.currentPromptIndex];
      if (!currentPrompt) return;

      // Calculate actual elapsed time from when prompt was shown
      const timeMs = Date.now() - promptStartTime;
      const correct = index === currentPrompt.correctIndex;

      const newStats = {
        ...gameState.roundStats,
        [correct ? 'correct' : 'incorrect']: gameState.roundStats[correct ? 'correct' : 'incorrect'] + 1,
        totalTime: gameState.roundStats.totalTime + timeMs,
        responses: [
          ...gameState.roundStats.responses,
          {
            prompt: currentPrompt,
            selected: option,
            correct,
            timeMs,
          },
        ],
      };

      // Update stats
      updatePositionStats(currentPrompt.role, correct, timeMs, learningMode);
      updateScenarioStats(currentPrompt.scenarioId, correct, learningMode);
      if (correct) {
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        updateOverallStats(true, newStreak, learningMode);
      } else {
        setCurrentStreak(0);
        updateOverallStats(false, currentStreak, learningMode);
      }
      updateWeakSpots(
        currentPrompt.role,
        currentPrompt.questionType,
        currentPrompt.correctAnswer,
        correct,
        learningMode
      );

    setGameState((prev) => ({
      ...prev,
      selectedAnswer: option,
      timerActive: learningMode ? false : false, // Keep timer inactive after answer
      roundStats: newStats,
    }));

      setShowFeedback(true);
    },
    [gameState, allScenarios, currentStreak, showFeedback, learningMode, promptStartTime]
  );

  const advanceToNext = useCallback(() => {
    const nextIndex = gameState.currentPromptIndex + 1;

    if (nextIndex >= gameState.prompts.length) {
      // Round complete
      setRoundComplete(true);
      return;
    }

    setShowFeedback(false);
    setPromptStartTime(Date.now()); // Reset start time for next prompt
    setGameState((prev) => ({
      ...prev,
      currentPromptIndex: nextIndex,
      selectedAnswer: null,
      timerActive: !learningMode,
      timerRemaining: TIMER_DURATION,
    }));
  }, [gameState.currentPromptIndex, gameState.prompts.length, learningMode]);

  const currentPrompt = gameState.prompts[gameState.currentPromptIndex] || null;
  
  // Debug logging when currentPrompt becomes available
  useEffect(() => {
    if (currentPrompt) {
      console.log('[useGameState] currentPrompt is now available:', currentPrompt.role, currentPrompt.questionType);
    }
  }, [currentPrompt]);

  // Handle empty scenarios by returning default state
  // But all hooks have already been called above, so this is safe
  if (allScenarios.length === 0) {
    return {
      gameState: {
        currentScenario: null as any,
        prompts: [],
        currentPromptIndex: 0,
        selectedAnswer: null,
        timerActive: false,
        timerRemaining: TIMER_DURATION,
        roundStats: {
          correct: 0,
          incorrect: 0,
          totalTime: 0,
          responses: [],
        },
      },
      currentPrompt: null,
      showFeedback: false,
      roundComplete: false,
      handleAnswer: () => {},
      advanceToNext: () => {},
    };
  }

  return {
    gameState,
    currentPrompt,
    showFeedback,
    roundComplete,
    handleAnswer,
    advanceToNext,
  };
}
