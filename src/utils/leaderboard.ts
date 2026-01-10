import { PlayerStats, RoundStats } from '../types';
import { PLAYERS } from '../config/players';

// In production, Cloudflare Pages Functions are served from the same domain
// In development, use the Cloudflare Pages Functions dev server (usually port 8788)
// For now, use empty string to use relative URLs (works in both prod and dev when deployed)
const API_BASE_URL = '';

// Fetch player stats from KV
export async function fetchPlayerStats(playerId: number): Promise<PlayerStats | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard/${playerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch player stats: ${response.status}`);
      return null;
    }

    const stats: PlayerStats = await response.json();
    return stats;
  } catch (error) {
    console.warn('Failed to fetch player stats from KV:', error);
    return null; // Fail silently, app works with localStorage only
  }
}

// Initialize player stats on app load - fetch from KV and merge with local
export async function initializePlayerStats(playerId: number): Promise<void> {
  try {
    const kvStats = await fetchPlayerStats(playerId);
    if (!kvStats) {
      // No stats in KV yet, continue with local only
      return;
    }

    // KV stats fetched successfully
    // The merge happens when syncing after a round
    // This function primarily ensures we have the latest from KV
    // We'll sync local stats to KV after next round
  } catch (error) {
    console.warn('Failed to initialize player stats:', error);
    // Fail silently, continue with local stats
  }
}

// Sync round stats to KV - fetches from KV first, merges, writes back
export async function syncStatsToLeaderboard(playerId: number, roundStats: RoundStats): Promise<boolean> {
  try {
    // Prepare the sync payload
    // The API will handle merging with existing KV stats
    const syncPayload = {
      playerId,
      roundStats: {
        correct: roundStats.correct,
        incorrect: roundStats.incorrect,
        totalTime: roundStats.totalTime,
        bestStreak: roundStats.bestStreak,
      },
    };

    const response = await fetch(`${API_BASE_URL}/api/leaderboard/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncPayload),
    });

    if (!response.ok) {
      console.error(`Failed to sync stats: ${response.status}`);
      return false;
    }

    const result = await response.json();
    
    // After successful sync, fetch updated stats and optionally update localStorage
    // For now, we'll keep localStorage as is and sync again on next round
    // The KV is the source of truth for the leaderboard
    
    return result.success === true;
  } catch (error) {
    console.warn('Failed to sync stats to leaderboard:', error);
    return false; // Fail silently, stats stay in localStorage
  }
}

// Fetch all player stats for leaderboard display
export async function fetchLeaderboard(): Promise<PlayerStats[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch leaderboard: ${response.status}`);
      return [];
    }

    const stats: PlayerStats[] = await response.json();
    
    // Ensure all 11 players are present, add zero stats for missing ones
    const allPlayers: PlayerStats[] = PLAYERS.map((player) => {
      const existing = stats.find(s => s.playerId === player.id);
      if (existing) {
        return existing;
      }
      return {
        playerId: player.id,
        name: player.name,
        number: player.number,
        stats: {
          totalAttempts: 0,
          totalCorrect: 0,
          bestStreak: 0,
          totalTime: 0,
          lastUpdated: 0,
        },
      };
    });
    
    return allPlayers;
  } catch (error) {
    console.warn('Failed to fetch leaderboard:', error);
    // Return empty array, leaderboard will show no data
    return [];
  }
}
