import { Scenario, BallZone } from '../types';
import { ballZoneCoordinates } from '../constants';
import scenariosData from '../content/scenarios.json';

// Validate scenario structure
function validateScenario(scenario: any): scenario is Scenario {
  if (!scenario.id || !scenario.title || !scenario.category) {
    throw new Error(`Scenario ${scenario.id || 'unknown'}: missing id, title, or category`);
  }

  if (!scenario.situation?.runners || !scenario.situation?.ballZone) {
    throw new Error(`Scenario ${scenario.id}: missing situation.runners or situation.ballZone`);
  }

  // Validate ballZone exists in coordinates map
  if (!ballZoneCoordinates[scenario.situation.ballZone as BallZone]) {
    throw new Error(
      `Scenario ${scenario.id}: ballZone "${scenario.situation.ballZone}" not found in ballZoneCoordinates`
    );
  }

  // Validate roleGroups structure
  if (
    !scenario.roleGroups ||
    !Array.isArray(scenario.roleGroups.ballSide) ||
    !Array.isArray(scenario.roleGroups.infieldCore) ||
    !Array.isArray(scenario.roleGroups.coverage) ||
    !Array.isArray(scenario.roleGroups.backups)
  ) {
    throw new Error(`Scenario ${scenario.id}: missing or invalid roleGroups structure`);
  }

  // Validate roles exist for all positions referenced
  if (!scenario.roles || typeof scenario.roles !== 'object') {
    throw new Error(`Scenario ${scenario.id}: missing or invalid roles object`);
  }

  // Validate each role has required fields and sufficient distractors
  for (const [position, role] of Object.entries(scenario.roles)) {
    if (!role.primaryIntent) {
      throw new Error(`Scenario ${scenario.id}: role ${position} missing primaryIntent`);
    }
    if (!role.explanation) {
      throw new Error(`Scenario ${scenario.id}: role ${position} missing explanation`);
    }
    if (!Array.isArray(role.distractorPoolHigh) || !Array.isArray(role.distractorPoolLow)) {
      throw new Error(`Scenario ${scenario.id}: role ${position} missing distractorPoolHigh or distractorPoolLow`);
    }

    // Validate primary intent has at least 3 distractors
    const primaryDistractors = role.distractorPoolHigh.length + role.distractorPoolLow.length;
    if (primaryDistractors < 3) {
      console.warn(
        `Scenario ${scenario.id}: role ${position} has only ${primaryDistractors} primary distractors (will use fallback)`
      );
    }

    // Validate fielderAction has at least 2 distractors if present
    if (role.fielderAction) {
      // For fielderAction, we need to check if there are fielderAction distractors
      // This is a simplified check - in practice, we'd filter by type
      const fielderDistractors = role.distractorPoolHigh.length + role.distractorPoolLow.length;
      if (fielderDistractors < 2) {
        console.warn(
          `Scenario ${scenario.id}: role ${position} has only ${fielderDistractors} fielderAction distractors (will use fallback)`
        );
      }
    }
  }

  return true;
}

let loadedScenarios: Scenario[] | null = null;

export function loadScenarios(): Scenario[] {
  if (loadedScenarios) {
    return loadedScenarios;
  }

  try {
    const scenarios = scenariosData as Scenario[];
    const validated: Scenario[] = [];

    for (const scenario of scenarios) {
      try {
        validateScenario(scenario);
        validated.push(scenario);
      } catch (error) {
        if (import.meta.env.DEV) {
          throw error;
        } else {
          console.error('Content validation error:', error);
          // In prod, skip invalid scenarios but don't crash
        }
      }
    }

    if (validated.length === 0) {
      throw new Error('No valid scenarios found');
    }

    loadedScenarios = validated;
    return validated;
  } catch (error) {
    if (import.meta.env.DEV) {
      throw error;
    } else {
      // In prod, show error screen (handled by component)
      throw new Error('Failed to load scenarios');
    }
  }
}

export function getRandomScenario(): Scenario {
  const scenarios = loadScenarios();
  const randomIndex = Math.floor(Math.random() * scenarios.length);
  return scenarios[randomIndex];
}

export function getScenarioById(id: string): Scenario | undefined {
  const scenarios = loadScenarios();
  return scenarios.find((s) => s.id === id);
}
