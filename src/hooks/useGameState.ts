import { useState, useEffect, useCallback } from 'react';
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
  scenario: Scenario | null,
  mode: GameMode,
  practiceWeakSpots: boolean = false,
  learningMode: boolean = false,
  selectedPosition?: string | null
) {
  // CRITICAL: All hooks must be called unconditionally before any early returns
  // This ensures hooks are always called in the same order
  const [gameState, setGameState] = useState<GameState>({
    currentScenario: scenario,
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
    // Don't initialize if scenario is null
    if (!scenario) {
      return;
    }
    
    try {
      const position = mode === 'my_positions' && selectedPosition ? (selectedPosition as Position) : null;
      
      console.log('useGameState: Initializing prompts', { mode, selectedPosition, position });
      
      // Validate position for my_positions mode
      if (mode === 'my_positions' && !position) {
        console.error('Missing position for my_positions mode. SelectedPosition:', selectedPosition);
        return;
      }
      
      const prompts = generatePrompts(
        scenario,
        mode,
        position,
        practiceWeakSpots
      );

      console.log('Generated prompts:', prompts.length, 'scenario:', scenario.id, 'roles:', Object.keys(scenario.roles));

      // Generate answers for all prompts
      let promptsWithAnswers;
      try {
        console.log('[useGameState] About to generate answers, roundState:', roundState);
        promptsWithAnswers = prompts.map((p, index) => {
          try {
            console.log(`[useGameState] Generating answers for prompt ${index}:`, p.role, p.questionType, 'role exists:', !!scenario.roles[p.role]);
            if (!scenario.roles[p.role]) {
              throw new Error(`Role ${p.role} not found in scenario ${scenario.id}`);
            }
            const result = generateAnswers(p, scenario, roundState);
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
  }, [scenario, mode, practiceWeakSpots, learningMode, selectedPosition]);

  const handleTimeout = useCallback(() => {
    if (learningMode || !scenario) return; // No timeout in learning mode or if scenario is null
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
      updateScenarioStats(scenario.id, false, false);
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
  }, [scenario, currentStreak, learningMode, promptStartTime]);

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
      if (showFeedback || !scenario) return;

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
      updateScenarioStats(scenario.id, correct, learningMode);
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
    [gameState, scenario, currentStreak, showFeedback, learningMode, promptStartTime]
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

  // Handle null scenario by returning default state
  // But all hooks have already been called above, so this is safe
  if (!scenario) {
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
