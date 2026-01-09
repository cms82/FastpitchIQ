import { Scenario, Prompt, Position, GameMode, QuestionType } from '../types';
import { getLastAskedAt } from './localStorage';
import { getTopWeakSpots } from './localStorage';

const PROMPTS_PER_ROUND = 6;
const PRIMARY_WEIGHT = 0.8;
const BACKUP_TARGET_PERCENT = 0.7;

interface PromptCandidate {
  role: Position;
  questionType: QuestionType;
  priority: number; // Lower = higher priority
}

export function generatePrompts(
  scenario: Scenario,
  mode: GameMode,
  primaryPosition?: Position | null,
  secondaryPosition?: Position | null,
  practiceWeakSpots: boolean = false
): Prompt[] {
  if (practiceWeakSpots) {
    return generateWeakSpotsPrompts(scenario);
  }

  if (mode === 'my_positions') {
    return generateMyPositionsPrompts(scenario, primaryPosition, secondaryPosition);
  } else {
    return generateWholeFieldPrompts(scenario);
  }
}

function generateMyPositionsPrompts(
  scenario: Scenario,
  primaryPosition?: Position | null,
  secondaryPosition?: Position | null
): Prompt[] {
  if (!primaryPosition) {
    throw new Error('Primary position required for My Positions mode');
  }

  const prompts: Prompt[] = [];
  const availableRoles: Position[] = [];

  // Collect available roles
  if (primaryPosition && scenario.roles[primaryPosition as Position]) {
    availableRoles.push(primaryPosition);
  }
  if (secondaryPosition && scenario.roles[secondaryPosition as Position] && secondaryPosition !== primaryPosition) {
    availableRoles.push(secondaryPosition);
  }

  if (availableRoles.length === 0) {
    throw new Error('No available roles for selected positions');
  }

  // Generate 6 prompts with weighted selection
  let fielderActionUsed = false;

  for (let i = 0; i < PROMPTS_PER_ROUND; i++) {
    // Weighted selection: 80% primary, 20% secondary
    const usePrimary = Math.random() < PRIMARY_WEIGHT || availableRoles.length === 1;
    const selectedRole = usePrimary ? availableRoles[0] : availableRoles[1];

    const roleDef = scenario.roles[selectedRole];

    // Decide question type
    let questionType: QuestionType = 'primary';

    // For fielders, can use fielderAction (at most 1 per round)
    if (
      !fielderActionUsed &&
      roleDef.fielderAction &&
      roleDef.primaryIntent === 'FIELD' &&
      Math.random() < 0.3 // 30% chance to use fielderAction
    ) {
      questionType = 'fielderAction';
      fielderActionUsed = true;
    }

    prompts.push({
      scenarioId: scenario.id,
      role: selectedRole,
      questionType,
      correctAnswer: questionType === 'primary' ? roleDef.primaryIntent : roleDef.fielderAction!,
      options: [], // Will be filled by answerGenerator
      correctIndex: 0, // Will be set by answerGenerator
    });
  }

  return prompts;
}

function generateWholeFieldPrompts(scenario: Scenario): Prompt[] {
  const prompts: Prompt[] = [];
  const usedRoles = new Set<Position>();
  let fielderActionUsed = false;

  // Hard minimums: must include at least 1 from each group
  const requiredGroups = [
    { name: 'ballSide', roles: scenario.roleGroups.ballSide },
    { name: 'infieldCore', roles: scenario.roleGroups.infieldCore },
    { name: 'coverage', roles: scenario.roleGroups.coverage },
  ];

  // Fill required groups first
  for (const group of requiredGroups) {
    const available = group.roles.filter(
      (role) => scenario.roles[role as Position] && !usedRoles.has(role)
    );
    if (available.length > 0) {
      const selected = available[Math.floor(Math.random() * available.length)] as Position;
      usedRoles.add(selected);
      const roleDef = scenario.roles[selected];

      prompts.push({
        scenarioId: scenario.id,
        role: selected,
        questionType: 'primary',
        correctAnswer: roleDef.primaryIntent,
        options: [],
        correctIndex: 0,
      });
    }
  }

  // Soft constraint: try to include backup role (~70% of rounds)
  const shouldIncludeBackup = Math.random() < BACKUP_TARGET_PERCENT;
  if (shouldIncludeBackup && prompts.length < PROMPTS_PER_ROUND) {
    const backupRoles = scenario.roleGroups.backups.filter(
      (role) => scenario.roles[role as Position] && !usedRoles.has(role)
    );
    if (backupRoles.length > 0) {
      // Prefer least recently asked
      backupRoles.sort((a, b) => getLastAskedAt(a as Position) - getLastAskedAt(b as Position));
      const selected = backupRoles[0] as Position;
      usedRoles.add(selected);
      const roleDef = scenario.roles[selected];

      prompts.push({
        scenarioId: scenario.id,
        role: selected,
        questionType: 'primary',
        correctAnswer: roleDef.primaryIntent,
        options: [],
        correctIndex: 0,
      });
    }
  }

  // Fill remaining slots using coverage algorithm
  const allPositions: Position[] = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
  const candidates: PromptCandidate[] = [];

  for (const position of allPositions) {
    if (usedRoles.has(position) || !scenario.roles[position as Position]) {
      continue;
    }

    const lastAskedAt = getLastAskedAt(position);
    let priority = lastAskedAt; // Lower timestamp = higher priority

    // Boost recommended roles
    if (scenario.promptPlan?.recommendedRoles?.includes(position)) {
      priority -= 1000000; // Boost priority
    }

    candidates.push({
      role: position,
      questionType: 'primary',
      priority,
    });
  }

  // Sort by priority (lower = higher priority)
  candidates.sort((a, b) => a.priority - b.priority);

  // Fill remaining prompts
  while (prompts.length < PROMPTS_PER_ROUND && candidates.length > 0) {
    const candidate = candidates.shift()!;
    const roleDef = scenario.roles[candidate.role as Position];

    // Check if we can use fielderAction for this fielder
    let questionType: QuestionType = 'primary';
    if (
      !fielderActionUsed &&
      roleDef.fielderAction &&
      roleDef.primaryIntent === 'FIELD' &&
      Math.random() < 0.3
    ) {
      questionType = 'fielderAction';
      fielderActionUsed = true;
    }

    prompts.push({
      scenarioId: scenario.id,
      role: candidate.role,
      questionType,
      correctAnswer: questionType === 'primary' ? roleDef.primaryIntent : roleDef.fielderAction!,
      options: [],
      correctIndex: 0,
    });
  }

  return prompts;
}

function generateWeakSpotsPrompts(scenario: Scenario): Prompt[] {
  const weakSpots = getTopWeakSpots(6);
  const prompts: Prompt[] = [];

  for (const spot of weakSpots) {
    // Only include if this scenario has the role
    if (!scenario.roles[spot.role]) {
      continue;
    }

    const roleDef = scenario.roles[spot.role];
    const correctAnswer =
      spot.questionType === 'primary' ? roleDef.primaryIntent : roleDef.fielderAction;

    if (!correctAnswer) {
      continue; // Skip if fielderAction not available
    }

    prompts.push({
      scenarioId: scenario.id,
      role: spot.role,
      questionType: spot.questionType,
      correctAnswer,
      options: [],
      correctIndex: 0,
    });

    if (prompts.length >= PROMPTS_PER_ROUND) {
      break;
    }
  }

  // Fill remaining slots with regular generation if needed
  if (prompts.length < PROMPTS_PER_ROUND) {
    const remaining = PROMPTS_PER_ROUND - prompts.length;
    const regularPrompts = generateWholeFieldPrompts(scenario);
    prompts.push(...regularPrompts.slice(0, remaining));
  }

  return prompts.slice(0, PROMPTS_PER_ROUND);
}
