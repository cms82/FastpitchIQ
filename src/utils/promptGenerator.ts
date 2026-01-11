import { Scenario, Prompt, Position, GameMode, QuestionType } from '../types';
import { PrimaryIntent, FielderAction } from '../constants';
import { getLastAskedAt } from './localStorage';
import { getTopWeakSpots } from './localStorage';

const PROMPTS_PER_ROUND = 6;
const BACKUP_TARGET_PERCENT = 0.7;

interface PromptCandidate {
  role: Position;
  questionType: QuestionType;
  priority: number; // Lower = higher priority
}

export function generatePrompts(
  scenarios: Scenario | Scenario[],
  mode: GameMode,
  selectedPosition?: Position | null,
  practiceWeakSpots: boolean = false
): Prompt[] {
  // Normalize to array
  const allScenarios = Array.isArray(scenarios) ? scenarios : [scenarios];
  
  if (allScenarios.length === 0) {
    throw new Error('No scenarios provided');
  }

  if (practiceWeakSpots) {
    // For weak spots, use all scenarios to find roles
    return generateWeakSpotsPrompts(allScenarios);
  }

  if (mode === 'my_positions') {
    return generateOnePositionPrompts(allScenarios, selectedPosition);
  } else {
    return generateWholeFieldPrompts(allScenarios);
  }
}

function generateOnePositionPrompts(
  allScenarios: Scenario[],
  selectedPosition?: Position | null
): Prompt[] {
  if (!selectedPosition) {
    throw new Error('Position required for One Position mode');
  }

  // Filter scenarios that have the selected position
  const validScenarios = allScenarios.filter(s => s.roles[selectedPosition as Position]);
  
  if (validScenarios.length === 0) {
    throw new Error(`Selected position ${selectedPosition} is not available in any scenario`);
  }

  const prompts: Prompt[] = [];
  let fielderActionUsed = false;

  // Generate 6 prompts, mixing scenarios
  for (let i = 0; i < PROMPTS_PER_ROUND; i++) {
    // Select a random scenario that has this position
    const scenario = validScenarios[Math.floor(Math.random() * validScenarios.length)];
    const roleDef = scenario.roles[selectedPosition as Position];
    
    // Decide question type
    let questionType: QuestionType = 'primary';
    const canUseFielderAction = roleDef.fielderAction && roleDef.primaryIntent === 'FIELD';

    // For fielders, can use fielderAction (at most 1 per round)
    // Use fielderAction for one prompt if available
    if (
      canUseFielderAction &&
      !fielderActionUsed &&
      (i === Math.floor(PROMPTS_PER_ROUND / 2) || Math.random() < 0.3)
    ) {
      questionType = 'fielderAction';
      fielderActionUsed = true;
    }

    prompts.push({
      scenarioId: scenario.id,
      role: selectedPosition,
      questionType,
      // For fielderAction questions, the correct answer is always the primaryIntent (e.g., "Field It")
      // The fielderAction is used to determine the question type, but primaryIntent is the answer
      correctAnswer: roleDef.primaryIntent,
      options: [], // Will be filled by answerGenerator
      correctIndex: 0, // Will be set by answerGenerator
    });
  }

  return prompts;
}

function generateWholeFieldPrompts(allScenarios: Scenario[]): Prompt[] {
  const prompts: Prompt[] = [];
  const usedRoles = new Set<Position>();
  let fielderActionUsed = false;

  // Collect all required groups from all scenarios
  const allRequiredGroups: Array<{ name: string; roles: Position[]; scenario: Scenario }> = [];
  for (const scenario of allScenarios) {
    allRequiredGroups.push(
      { name: 'ballSide', roles: scenario.roleGroups.ballSide, scenario },
      { name: 'infieldCore', roles: scenario.roleGroups.infieldCore, scenario },
      { name: 'coverage', roles: scenario.roleGroups.coverage, scenario }
    );
  }

  // Fill required groups first - try to get at least one from each group type across all scenarios
  const groupTypes = ['ballSide', 'infieldCore', 'coverage'];
  for (const groupType of groupTypes) {
    const groupsOfType = allRequiredGroups.filter(g => g.name === groupType);
    const availableRoles: Array<{ role: Position; scenario: Scenario }> = [];
    
    for (const group of groupsOfType) {
      for (const role of group.roles) {
        if (group.scenario.roles[role as Position] && !usedRoles.has(role)) {
          availableRoles.push({ role: role as Position, scenario: group.scenario });
        }
      }
    }
    
    if (availableRoles.length > 0) {
      const selected = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      usedRoles.add(selected.role);
      const roleDef = selected.scenario.roles[selected.role];

      prompts.push({
        scenarioId: selected.scenario.id,
        role: selected.role,
        questionType: 'primary',
        correctAnswer: roleDef.primaryIntent,
        options: [],
        correctIndex: 0,
      });
    }
  }

  // Soft constraint: try to include backup role (~70% of rounds) from any scenario
  const shouldIncludeBackup = Math.random() < BACKUP_TARGET_PERCENT;
  if (shouldIncludeBackup && prompts.length < PROMPTS_PER_ROUND) {
    const backupRoles: Array<{ role: Position; scenario: Scenario }> = [];
    for (const scenario of allScenarios) {
      for (const role of scenario.roleGroups.backups) {
        if (scenario.roles[role as Position] && !usedRoles.has(role)) {
          backupRoles.push({ role: role as Position, scenario });
        }
      }
    }
    
    if (backupRoles.length > 0) {
      // Prefer least recently asked (use timed mode stats for prompt selection)
      backupRoles.sort((a, b) => getLastAskedAt(a.role, false) - getLastAskedAt(b.role, false));
      const selected = backupRoles[0];
      usedRoles.add(selected.role);
      const roleDef = selected.scenario.roles[selected.role];

      prompts.push({
        scenarioId: selected.scenario.id,
        role: selected.role,
        questionType: 'primary',
        correctAnswer: roleDef.primaryIntent,
        options: [],
        correctIndex: 0,
      });
    }
  }

  // Fill remaining slots using coverage algorithm - can use any scenario
  const allPositions: Position[] = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
  const candidates: Array<PromptCandidate & { scenario: Scenario }> = [];

  for (const scenario of allScenarios) {
    for (const position of allPositions) {
      if (usedRoles.has(position) || !scenario.roles[position as Position]) {
        continue;
      }

      // Use timed mode stats for prompt selection priority
      const lastAskedAt = getLastAskedAt(position, false);
      let priority = lastAskedAt; // Lower timestamp = higher priority

      // Boost recommended roles
      if (scenario.promptPlan?.recommendedRoles?.includes(position)) {
        priority -= 1000000; // Boost priority
      }

      candidates.push({
        role: position,
        questionType: 'primary',
        priority,
        scenario,
      });
    }
  }

  // Sort by priority (lower = higher priority)
  candidates.sort((a, b) => a.priority - b.priority);

  // Fill remaining prompts
  while (prompts.length < PROMPTS_PER_ROUND && candidates.length > 0) {
    const candidate = candidates.shift()!;
    const roleDef = candidate.scenario.roles[candidate.role as Position];

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
      scenarioId: candidate.scenario.id,
      role: candidate.role,
      questionType,
      // For fielderAction questions, the correct answer is always the primaryIntent (e.g., "Field It")
      // The fielderAction is used to determine the question type, but primaryIntent is the answer
      correctAnswer: roleDef.primaryIntent,
      options: [],
      correctIndex: 0,
    });
    
    // Mark this role as used to avoid duplicates
    usedRoles.add(candidate.role);
  }

  return prompts;
}

function generateWeakSpotsPrompts(allScenarios: Scenario[]): Prompt[] {
  // Use timed mode weak spots for practice (learning mode stats kept separate)
  const weakSpots = getTopWeakSpots(6, false);
  const prompts: Prompt[] = [];
  
  // Create a map of scenarios by role availability
  const scenariosByRole = new Map<Position, Scenario[]>();
  for (const scenario of allScenarios) {
    for (const position of Object.keys(scenario.roles) as Position[]) {
      if (!scenariosByRole.has(position)) {
        scenariosByRole.set(position, []);
      }
      scenariosByRole.get(position)!.push(scenario);
    }
  }

  for (const spot of weakSpots) {
    // Find a scenario that has this role
    const scenariosWithRole = scenariosByRole.get(spot.role as Position);
    if (!scenariosWithRole || scenariosWithRole.length === 0) {
      continue;
    }
    
    // Select a random scenario that has this role
    const scenario = scenariosWithRole[Math.floor(Math.random() * scenariosWithRole.length)];
    const roleDef = scenario.roles[spot.role as Position];

    // Decide question type based on weak spot
    let questionType: QuestionType = spot.questionType;
    let correctAnswer: PrimaryIntent | FielderAction;

    if (questionType === 'primary') {
      correctAnswer = spot.intent as PrimaryIntent;
    } else {
      // If weak spot is fielderAction, use primaryIntent as correct answer
      correctAnswer = roleDef.primaryIntent;
    }

    prompts.push({
      scenarioId: scenario.id,
      role: spot.role as Position,
      questionType,
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
    const regularPrompts = generateWholeFieldPrompts(allScenarios);
    prompts.push(...regularPrompts.slice(0, remaining));
  }

  return prompts.slice(0, PROMPTS_PER_ROUND);
}
