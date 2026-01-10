import { PlayerStats } from '../types';
import { PLAYERS } from '../config/players';

const API_BASE_URL = '';

export interface CoachPlayerModeStats {
  practice: PlayerStats['stats'] | null;
  competition: PlayerStats['stats'] | null;
}

export interface CoachPlayerStats {
  playerId: number;
  name: string;
  number: number;
  onePosition: CoachPlayerModeStats;
  allPositions: CoachPlayerModeStats;
}

// Fetch all player stats for coach view (both game modes and both practice modes)
export async function fetchCoachStats(): Promise<CoachPlayerStats[]> {
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDevelopment) {
    // Return mock data in development
    return PLAYERS.map(player => ({
      playerId: player.id,
      name: player.name,
      number: player.number,
      onePosition: { practice: null, competition: null },
      allPositions: { practice: null, competition: null },
    }));
  }

  try {
    // Fetch stats for both game modes and both practice modes in parallel
    const [
      onePosPractice,
      onePosCompetition,
      allPosPractice,
      allPosCompetition,
    ] = await Promise.all([
      fetch(`${API_BASE_URL}/api/leaderboard?mode=one_position&practiceMode=practice`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE_URL}/api/leaderboard?mode=one_position&practiceMode=competition`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE_URL}/api/leaderboard?mode=all_positions&practiceMode=practice`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE_URL}/api/leaderboard?mode=all_positions&practiceMode=competition`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    // Combine stats for each player
    return PLAYERS.map(player => {
      const onePosPrac = (onePosPractice as PlayerStats[]).find(s => s.playerId === player.id);
      const onePosComp = (onePosCompetition as PlayerStats[]).find(s => s.playerId === player.id);
      const allPosPrac = (allPosPractice as PlayerStats[]).find(s => s.playerId === player.id);
      const allPosComp = (allPosCompetition as PlayerStats[]).find(s => s.playerId === player.id);

      return {
        playerId: player.id,
        name: player.name,
        number: player.number,
        onePosition: {
          practice: onePosPrac?.stats || null,
          competition: onePosComp?.stats || null,
        },
        allPositions: {
          practice: allPosPrac?.stats || null,
          competition: allPosComp?.stats || null,
        },
      };
    });
  } catch (error) {
    console.warn('Failed to fetch coach stats:', error);
    // Return players with null stats on error
    return PLAYERS.map(player => ({
      playerId: player.id,
      name: player.name,
      number: player.number,
      onePosition: { practice: null, competition: null },
      allPositions: { practice: null, competition: null },
    }));
  }
}
