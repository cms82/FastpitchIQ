import {
  Prompt,
  AnswerOption,
  QuestionType,
  Scenario,
} from '../types';
import {
  PrimaryIntent,
  FielderAction,
  GLOBAL_PRIMARY_DISTRACTORS,
  GLOBAL_FIELDER_ACTION_DISTRACTORS,
} from '../constants';

interface RoundState {
  lastCorrectIndexHistory: number[]; // Last 5 correct indices
  lastOptionsSignatures: Map<string, string>; // Key: `${scenarioId}:${role}:${questionType}`, Value: signature
}

const MAX_RESHUFFLE_ATTEMPTS = 10;
const INDEX_HISTORY_SIZE = 5;
const MAX_SAME_INDEX_COUNT = 3; // Max times correct can appear in same index out of last 5

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateAnswers(
  prompt: Prompt,
  scenario: Scenario,
  roundState: RoundState
): Prompt {
  const roleDef = scenario.roles[prompt.role];
  const correctAnswer = prompt.correctAnswer;

  // Get distractors based on question type
  let distractors: AnswerOption[];
  try {
    if (prompt.questionType === 'primary') {
      distractors = getPrimaryDistractors(roleDef, correctAnswer as PrimaryIntent);
    } else {
      console.log('[generateAnswers] Getting fielder action distractors for:', correctAnswer, 'roleDef:', roleDef);
      distractors = getFielderActionDistractors(roleDef, correctAnswer as FielderAction);
      console.log('[generateAnswers] Got distractors:', distractors.length);
    }
  } catch (error) {
    console.error('[generateAnswers] Error getting distractors:', error);
    throw error;
  }

  // Ensure we have exactly 3 distractors
  let distractorAttempts = 0;
  const maxDistractorAttempts = 10; // Prevent infinite loop
  while (distractors.length < 3 && distractorAttempts < maxDistractorAttempts) {
    const fallback = getFallbackDistractors(prompt.questionType, correctAnswer);
    if (!distractors.includes(fallback)) {
      distractors.push(fallback);
    } else {
      distractorAttempts++;
      // If we can't find a unique fallback, break to avoid infinite loop
      // We'll handle this case below
      if (distractorAttempts >= 5) {
        console.warn('[generateAnswers] Could not find enough unique distractors, using what we have');
        break;
      }
    }
  }
  
  // If we still don't have 3, use all available options (except correct answer)
  if (distractors.length < 3) {
    console.log('[generateAnswers] Only have', distractors.length, 'distractors, filling with all available options');
    if (prompt.questionType === 'fielderAction') {
      // For fielderAction, use only FielderAction values that are in the distractor pools
      // Don't automatically add all available FielderAction values - respect what's in the pools
      const poolFielderActions = [
        ...(roleDef.distractorPoolHigh || []),
        ...(roleDef.distractorPoolLow || [])
      ].filter((d): d is FielderAction => 
        typeof d === 'string' && Object.values(FielderAction).includes(d as FielderAction) && d !== correctAnswer
      );
      
      // Add any FielderAction values from pools that aren't already in distractors
      for (const action of poolFielderActions) {
        if (!distractors.includes(action) && distractors.length < 3) {
          distractors.push(action);
        }
      }
      
      // If we still don't have 3 distractors, use primary intents as additional distractors to get to 4 total options
      if (distractors.length < 3) {
        console.log('[generateAnswers] FielderAction has limited options, adding primary intents as distractors');
        const primaryIntents = Object.values(PrimaryIntent).filter(i => !distractors.includes(i));
        while (distractors.length < 3 && primaryIntents.length > 0) {
          const intent = primaryIntents.shift();
          if (intent && !distractors.includes(intent)) {
            distractors.push(intent);
          }
        }
      }
    } else {
      const allIntents = Object.values(PrimaryIntent).filter(i => i !== correctAnswer && !distractors.includes(i));
      while (distractors.length < 3 && allIntents.length > 0) {
        const intent = allIntents.shift();
        if (intent && !distractors.includes(intent)) {
          distractors.push(intent);
        }
      }
    }
  }
  
  distractors = distractors.slice(0, 3);

  // Create options array: correct + 3 distractors
  let options: AnswerOption[] = [correctAnswer, ...distractors];

  // Enforce uniqueness and correctness constraints
  options = enforceUniqueness(options, correctAnswer);

  // Generate signature key
  const signatureKey = `${prompt.scenarioId}:${prompt.role}:${prompt.questionType}`;
  const lastSignature = roundState.lastOptionsSignatures.get(signatureKey);

  // Shuffle and check constraints
  let shuffledOptions: AnswerOption[];
  let correctIndex: number;
  let attempts = 0;

  do {
    shuffledOptions = shuffle(options);
    correctIndex = shuffledOptions.indexOf(correctAnswer);

    // Check if this violates index distribution rule
    const recentSameIndex = roundState.lastCorrectIndexHistory.filter(
      (idx) => idx === correctIndex
    ).length;

    if (recentSameIndex >= MAX_SAME_INDEX_COUNT && attempts < MAX_RESHUFFLE_ATTEMPTS) {
      attempts++;
      continue;
    }

    // Check signature
    const sortedOptionIds = [...shuffledOptions].sort().join(',');
    const signature = `${prompt.questionType}:${prompt.scenarioId}:${prompt.role}:${sortedOptionIds}:${correctAnswer}`;

    if (signature === lastSignature && attempts < MAX_RESHUFFLE_ATTEMPTS) {
      // Swap a distractor to break signature match
      const distractorIndices = shuffledOptions
        .map((opt, idx) => (opt !== correctAnswer ? idx : -1))
        .filter((idx) => idx !== -1);
      if (distractorIndices.length > 0) {
        const swapIdx = distractorIndices[Math.floor(Math.random() * distractorIndices.length)];
        const otherIdx = distractorIndices.find((idx) => idx !== swapIdx && idx !== correctIndex);
        if (otherIdx !== undefined) {
          [shuffledOptions[swapIdx], shuffledOptions[otherIdx]] = [
            shuffledOptions[otherIdx],
            shuffledOptions[swapIdx],
          ];
          correctIndex = shuffledOptions.indexOf(correctAnswer);
        }
      }
      attempts++;
      continue;
    }

    // Update round state
    roundState.lastCorrectIndexHistory.push(correctIndex);
    if (roundState.lastCorrectIndexHistory.length > INDEX_HISTORY_SIZE) {
      roundState.lastCorrectIndexHistory.shift();
    }
    roundState.lastOptionsSignatures.set(signatureKey, signature);

    break;
  } while (attempts < MAX_RESHUFFLE_ATTEMPTS);

  return {
    ...prompt,
    options: shuffledOptions,
    correctIndex,
  };
}

function getPrimaryDistractors(
  roleDef: Scenario['roles'][keyof Scenario['roles']],
  correctAnswer: PrimaryIntent
): PrimaryIntent[] {
  const primaryValues = Object.values(PrimaryIntent) as string[];
  const high = roleDef.distractorPoolHigh.filter(
    (d): d is PrimaryIntent => typeof d === 'string' && primaryValues.includes(d)
  );
  const low = roleDef.distractorPoolLow.filter(
    (d): d is PrimaryIntent => typeof d === 'string' && primaryValues.includes(d)
  );

  // Use high priority distractors first, then low
  const distractors: PrimaryIntent[] = [];
  
  // Add high priority (up to 3)
  for (const d of high) {
    if (d !== correctAnswer && !distractors.includes(d)) {
      distractors.push(d);
      if (distractors.length >= 3) break;
    }
  }

  // Fill with low priority if needed
  for (const d of low) {
    if (d !== correctAnswer && !distractors.includes(d)) {
      distractors.push(d);
      if (distractors.length >= 3) break;
    }
  }

  return distractors;
}

function getFielderActionDistractors(
  roleDef: Scenario['roles'][keyof Scenario['roles']],
  correctAnswer: FielderAction
): FielderAction[] {
  const fielderValues = Object.values(FielderAction) as string[];
  const high = roleDef.distractorPoolHigh.filter(
    (d): d is FielderAction => typeof d === 'string' && fielderValues.includes(d)
  );
  const low = roleDef.distractorPoolLow.filter(
    (d): d is FielderAction => typeof d === 'string' && fielderValues.includes(d)
  );

  const distractors: FielderAction[] = [];
  
  // Add high priority (up to 2 for fielderAction)
  for (const d of high) {
    if (d !== correctAnswer && !distractors.includes(d)) {
      distractors.push(d);
      if (distractors.length >= 2) break;
    }
  }

  // Fill with low priority if needed
  for (const d of low) {
    if (d !== correctAnswer && !distractors.includes(d)) {
      distractors.push(d);
      if (distractors.length >= 2) break;
    }
  }

  return distractors;
}

function getFallbackDistractors(questionType: QuestionType, correctAnswer: AnswerOption): AnswerOption {
  if (questionType === 'primary') {
    const available = GLOBAL_PRIMARY_DISTRACTORS.filter((d) => d !== correctAnswer);
    if (available.length === 0) {
      // Fallback to any primary intent if all are used
      const all = Object.values(PrimaryIntent).filter((d) => d !== correctAnswer);
      return all[Math.floor(Math.random() * all.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  } else {
    const available = GLOBAL_FIELDER_ACTION_DISTRACTORS.filter((d) => d !== correctAnswer);
    if (available.length === 0) {
      // Fallback to any fielder action if all are used
      const all = Object.values(FielderAction).filter((d) => d !== correctAnswer);
      return all[Math.floor(Math.random() * all.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }
}

function enforceUniqueness(options: AnswerOption[], correctAnswer: AnswerOption): AnswerOption[] {
  const unique: AnswerOption[] = [correctAnswer];
  const seen = new Set<AnswerOption>([correctAnswer]);

  for (const opt of options) {
    if (opt !== correctAnswer && !seen.has(opt)) {
      unique.push(opt);
      seen.add(opt);
    }
  }

  // If we don't have 4 unique options, fill with fallback
  const questionType: QuestionType = Object.values(PrimaryIntent).includes(correctAnswer as PrimaryIntent)
    ? 'primary'
    : 'fielderAction';
  
  while (unique.length < 4) {
    const fallback = getFallbackDistractors(questionType, correctAnswer);
    if (!seen.has(fallback)) {
      unique.push(fallback);
      seen.add(fallback);
    } else {
      // If all fallbacks are used, try to use any available option that's not already in unique
      const allPossibleOptions = questionType === 'primary' ? Object.values(PrimaryIntent) : Object.values(FielderAction);
      const unusedOption = allPossibleOptions.find(opt => !seen.has(opt));
      if (unusedOption) {
        unique.push(unusedOption);
        seen.add(unusedOption);
      } else {
        // If still not enough, allow mixing types for fielderAction questions to get to 4 options
        if (questionType === 'fielderAction' && unique.length < 4) {
          const primaryIntents = Object.values(PrimaryIntent).filter(i => !seen.has(i));
          if (primaryIntents.length > 0) {
            const intent = primaryIntents[0];
            unique.push(intent);
            seen.add(intent);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
  }

  return unique.slice(0, 4);
}

export function createRoundState(): RoundState {
  return {
    lastCorrectIndexHistory: [],
    lastOptionsSignatures: new Map(),
  };
}
