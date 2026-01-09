import {
  Prompt,
  AnswerOption,
  QuestionType,
  Position,
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
  if (prompt.questionType === 'primary') {
    distractors = getPrimaryDistractors(roleDef, correctAnswer as PrimaryIntent);
  } else {
    distractors = getFielderActionDistractors(roleDef, correctAnswer as FielderAction);
  }

  // Ensure we have exactly 3 distractors
  while (distractors.length < 3) {
    const fallback = getFallbackDistractors(prompt.questionType, correctAnswer);
    if (!distractors.includes(fallback)) {
      distractors.push(fallback);
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
      // If all fallbacks are used, we need to break the loop
      // This shouldn't happen in practice, but handle it gracefully
      break;
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
