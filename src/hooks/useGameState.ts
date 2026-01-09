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
  scenario: Scenario,
  mode: GameMode,
  practiceWeakSpots: boolean = false,
  learningMode: boolean = false,
  selectedPosition?: string | null
) {
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
    const position = mode === 'my_positions' && selectedPosition ? (selectedPosition as Position) : null;
    const prompts = generatePrompts(
      scenario,
      mode,
      position,
      practiceWeakSpots
    );

    // Generate answers for all prompts
    const promptsWithAnswers = prompts.map((p) => generateAnswers(p, scenario, roundState));

    setGameState((prev) => ({
      ...prev,
      prompts: promptsWithAnswers,
      currentPromptIndex: 0,
      timerActive: !learningMode,
      timerRemaining: TIMER_DURATION,
    }));
    setPromptStartTime(Date.now());
  }, [scenario, mode, practiceWeakSpots, learningMode, selectedPosition]);

  const handleTimeout = useCallback(() => {
    if (learningMode) return; // No timeout in learning mode
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

      // Update stats
      updatePositionStats(currentPrompt.role, false, timeMs);
      updateScenarioStats(scenario.id, false);
      updateOverallStats(false, currentStreak);
      setCurrentStreak(0);
      updateWeakSpots(
        currentPrompt.role,
        currentPrompt.questionType,
        currentPrompt.correctAnswer,
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
      if (showFeedback) return;

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
      updatePositionStats(currentPrompt.role, correct, timeMs);
      updateScenarioStats(scenario.id, correct);
      if (correct) {
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        updateOverallStats(true, newStreak);
      } else {
        setCurrentStreak(0);
        updateOverallStats(false, currentStreak);
      }
      updateWeakSpots(
        currentPrompt.role,
        currentPrompt.questionType,
        currentPrompt.correctAnswer,
        correct
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

  return {
    gameState,
    currentPrompt,
    showFeedback,
    roundComplete,
    handleAnswer,
    advanceToNext,
  };
}
