import { Scenario, BallZone, RoleDefinition } from '../types';
import { Position } from '../constants';
import { ballZoneCoordinates } from '../constants';
import { fetchScenarios } from './scenarios';

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
  for (const [position, role] of Object.entries(scenario.roles) as [Position, RoleDefinition][]) {
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
let kvScenariosCache: Scenario[] | null = null;

// Load scenarios from KV only (no static scenarios)
export async function loadScenariosAsync(): Promise<Scenario[]> {
  try {
    // Load from KV only
    const kvScenarios = await fetchScenarios();
    
    if (kvScenarios.length === 0) {
      console.warn('No scenarios found in KV');
      return [];
    }
    
    // Validate and cache KV scenarios
    const validated: Scenario[] = [];
    for (const scenario of kvScenarios) {
      try {
        validateScenario(scenario);
        validated.push(scenario);
      } catch (error) {
        console.error('KV scenario validation error:', error);
        // Skip invalid KV scenarios
      }
    }
    
    if (validated.length === 0) {
      throw new Error('No valid scenarios found in KV');
    }
    
    kvScenariosCache = validated;
    return validated;
  } catch (error) {
    console.error('Failed to load scenarios from KV:', error);
    throw error;
  }
}

// Synchronous version for backwards compatibility (uses cached KV scenarios if available)
export function loadScenarios(): Scenario[] {
  if (loadedScenarios) {
    return loadedScenarios;
  }

  // Use cached KV scenarios if available
  if (kvScenariosCache) {
    loadedScenarios = kvScenariosCache;
    return loadedScenarios;
  }

  // If no cache, return empty array (scenarios should be loaded async first)
  console.warn('Scenarios not loaded yet. Call loadScenariosAsync() first.');
  return [];
}

// Export function to reload scenarios (useful after admin edits)
export async function reloadScenarios(): Promise<void> {
  loadedScenarios = null;
  kvScenariosCache = null;
  // Pre-load KV scenarios for next use
  await loadScenariosAsync();
}

export function getRandomScenario(allScenarios?: Scenario[]): Scenario {
  const scenarios = allScenarios || loadScenarios();
  if (scenarios.length === 0) {
    throw new Error('No scenarios available to pick from.');
  }
  const randomIndex = Math.floor(Math.random() * scenarios.length);
  return scenarios[randomIndex];
}

export function getScenarioById(id: string, allScenarios?: Scenario[]): Scenario | undefined {
  const scenarios = allScenarios || loadScenarios();
  return scenarios.find((s) => s.id === id);
}
