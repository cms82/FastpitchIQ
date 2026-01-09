import { Scenario } from '../types';

export function formatSituation(scenario: Scenario): string {
  // If scenario.title exists and is well-formatted, use it
  if (scenario.title && scenario.title.length < 50) {
    return scenario.title;
  }

  // Otherwise, compute from category + ballZone + runners
  const { category, situation } = scenario;
  const { runners, ballZone } = situation;

  // Format runners
  const runnerParts: string[] = [];
  if (runners.on1) runnerParts.push('1st');
  if (runners.on2) runnerParts.push('2nd');
  if (runners.on3) runnerParts.push('3rd');

  let runnersText: string;
  if (runnerParts.length === 0) {
    runnersText = 'No runners';
  } else if (runnerParts.length === 1) {
    runnersText = `Runner on ${runnerParts[0]}`;
  } else if (runnerParts.length === 2) {
    runnersText = `Runners on ${runnerParts[0]} & ${runnerParts[1]}`;
  } else {
    runnersText = 'Bases loaded';
  }

  // Format play type based on category
  let playType: string;
  if (category === 'bunt') {
    playType = 'Bunt';
  } else if (category === 'cut_relay') {
    // Determine hit type from ballZone
    if (ballZone.startsWith('LF')) {
      playType = 'Single to LF';
    } else if (ballZone.startsWith('CF')) {
      playType = 'Single to CF';
    } else if (ballZone.startsWith('RF')) {
      playType = 'Single to RF';
    } else if (ballZone.includes('INFIELD')) {
      playType = 'Infield hit';
    } else {
      playType = 'Hit';
    }
  } else {
    playType = 'Play';
  }

  return `${playType} — ${runnersText}`;
}
