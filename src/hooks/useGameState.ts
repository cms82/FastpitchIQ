import { useState, useEffect, useCallback } from 'react';
import { Scenario, Prompt, GameMode, GameState, AnswerOption } from '../types';
import { generatePrompts } from '../utils/promptGenerator';
import { generateAnswers, createRoundState } from '../utils/answerGenerator';
import {
  updatePositionStats,
  updateScenarioStats,
  updateOverallStats,
  updateWeakSpots,
} from '../utils/localStorage';
import { getPreferences } from '../utils/localStorage';

const TIMER_DURATION = 10000; // 10 seconds

export function useGameState(
  scenario: Scenario,
  mode: GameMode,
  practiceWeakSpots: boolean = false,
  learningMode: boolean = false
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

  // Initialize prompts
  useEffect(() => {
    const prefs = getPreferences();
    const prompts = generatePrompts(
      scenario,
      mode,
      prefs.selectedPrimaryPosition,
      prefs.selectedSecondaryPosition,
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
  }, [scenario, mode, practiceWeakSpots, learningMode]);

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
  }, [learningMode, gameState.timerActive, showFeedback, roundComplete]);

  const handleTimeout = useCallback(() => {
    if (learningMode) return; // No timeout in learning mode
    const currentPrompt = gameState.prompts[gameState.currentPromptIndex];
    if (!currentPrompt) return;

    const startTime = TIMER_DURATION;
    const timeMs = TIMER_DURATION;

    // Mark as incorrect
    const newStats = {
      ...gameState.roundStats,
      incorrect: gameState.roundStats.incorrect + 1,
      totalTime: gameState.roundStats.totalTime + timeMs,
      responses: [
        ...gameState.roundStats.responses,
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

    setGameState((prev) => ({
      ...prev,
      timerActive: false,
      timerRemaining: 0,
      roundStats: newStats,
    }));

    setShowFeedback(true);
  }, [gameState, scenario, currentStreak, learningMode]);

  const handleAnswer = useCallback(
    (option: AnswerOption, index: number) => {
      if (showFeedback) return;

      const currentPrompt = gameState.prompts[gameState.currentPromptIndex];
      if (!currentPrompt) return;

      const timeMs = learningMode ? 0 : TIMER_DURATION - gameState.timerRemaining;
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
    [gameState, scenario, currentStreak, showFeedback, learningMode]
  );

  const advanceToNext = useCallback(() => {
    const nextIndex = gameState.currentPromptIndex + 1;

    if (nextIndex >= gameState.prompts.length) {
      // Round complete
      setRoundComplete(true);
      return;
    }

    setShowFeedback(false);
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
