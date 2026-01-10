import { PlayerStats, RoundStats, LeaderboardMode } from '../types';
import { PLAYERS } from '../config/players';

// In production, Cloudflare Pages Functions are served from the same domain
// In development, use the Cloudflare Pages Functions dev server (usually port 8788)
// For now, use empty string to use relative URLs (works in both prod and dev when deployed)
const API_BASE_URL = '';

// Fetch player stats from KV with timeout
export async function fetchPlayerStats(playerId: number): Promise<PlayerStats | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE_URL}/api/leaderboard/${playerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch player stats: ${response.status}`);
      return null;
    }

    const stats: PlayerStats = await response.json();
    return stats;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch player stats timed out');
    } else {
      console.warn('Failed to fetch player stats from KV:', error);
    }
    return null; // Fail silently, app works with localStorage only
  }
}

// Initialize player stats on app load - fetch from KV and merge with local
export async function initializePlayerStats(playerId: number): Promise<void> {
  // Check if running in development mode (Cloudflare Functions don't run locally)
  // Use window.location to detect dev vs production
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDevelopment) {
    // Silently skip KV fetch in development - functions don't run in Vite dev server
    return;
  }

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
    // Ensure mode is set (default to 'all_positions' for backwards compatibility)
    const mode: LeaderboardMode = roundStats.mode || 'all_positions';
    const practiceMode = roundStats.practiceMode || 'competition'; // Default to competition for backwards compatibility
    
    // Prepare the sync payload
    // The API will handle merging with existing KV stats
    const syncPayload = {
      playerId,
      mode,
      practiceMode,
      roundStats: {
        correct: roundStats.correct,
        incorrect: roundStats.incorrect,
        totalTime: roundStats.totalTime,
        bestStreak: roundStats.bestStreak,
        totalRounds: roundStats.totalRounds || 1,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_BASE_URL}/api/leaderboard/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Sync stats timed out');
    } else {
      console.warn('Failed to sync stats to leaderboard:', error);
    }
    return false; // Fail silently, stats stay in localStorage
  }
}

// Fetch all player stats for leaderboard display by mode
export async function fetchLeaderboard(mode: LeaderboardMode = 'all_positions'): Promise<PlayerStats[]> {
  // Check if running in development mode (Cloudflare Functions don't run locally)
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDevelopment) {
    // Return all players with zero stats in development - functions don't run in Vite dev server
    return PLAYERS.map((player) => ({
      playerId: player.id,
      name: player.name,
      number: player.number,
      stats: {
        totalAttempts: 0,
        totalCorrect: 0,
        bestStreak: 0,
        totalTime: 0,
        totalRounds: 0,
        lastUpdated: 0,
      },
    }));
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const leaderboardMode = mode || 'all_positions';
    const response = await fetch(`${API_BASE_URL}/api/leaderboard?mode=${leaderboardMode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch leaderboard: ${response.status}`);
      // Return all players with zero stats as fallback
      return PLAYERS.map((player) => ({
        playerId: player.id,
        name: player.name,
        number: player.number,
        stats: {
          totalAttempts: 0,
          totalCorrect: 0,
          bestStreak: 0,
          totalTime: 0,
          totalRounds: 0,
          lastUpdated: 0,
        },
      }));
    }

    // Check if response is actually JSON (not HTML from a 404/redirect)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Invalid response type:', contentType);
      // Return all players with zero stats as fallback
      return PLAYERS.map((player) => ({
        playerId: player.id,
        name: player.name,
        number: player.number,
        stats: {
          totalAttempts: 0,
          totalCorrect: 0,
          bestStreak: 0,
          totalTime: 0,
          totalRounds: 0,
          lastUpdated: 0,
        },
      }));
    }

    const stats: PlayerStats[] = await response.json();
    
    // Ensure all 11 players are present, add zero stats for missing ones
    const allPlayers: PlayerStats[] = PLAYERS.map((player) => {
      const existing = stats.find(s => s.playerId === player.id);
      if (existing) {
        // Ensure totalRounds exists (for backwards compatibility)
        return {
          ...existing,
          stats: {
            ...existing.stats,
            totalRounds: existing.stats.totalRounds || 0,
          },
        };
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
          totalRounds: 0,
          lastUpdated: 0,
        },
      };
    });
    
    // Filter players with less than 5 rounds (minimum threshold)
    const MIN_ROUNDS = 5;
    const eligiblePlayers = allPlayers.filter(p => p.stats.totalRounds >= MIN_ROUNDS);
    
    // Calculate confidence-adjusted score for ranking
    // Score = (correct + minAttempts × globalAvg) / (totalAttempts + minAttempts)
    const MIN_ATTEMPTS = 30; // 5 rounds × 6 prompts = 30 minimum attempts
    const globalAvg = eligiblePlayers.length > 0
      ? eligiblePlayers.reduce((sum, p) => {
          const accuracy = p.stats.totalAttempts > 0 ? p.stats.totalCorrect / p.stats.totalAttempts : 0;
          return sum + accuracy;
        }, 0) / eligiblePlayers.length
      : 0.7; // Default 70% if no players
    
    // Calculate confidence-adjusted scores and sort
    const rankedPlayers = eligiblePlayers.map(player => {
      const confidenceScore = (player.stats.totalCorrect + MIN_ATTEMPTS * globalAvg) / (player.stats.totalAttempts + MIN_ATTEMPTS);
      return { ...player, confidenceScore };
    }).sort((a, b) => {
      // Primary: Confidence-adjusted score (descending)
      if (Math.abs(a.confidenceScore - b.confidenceScore) > 0.001) {
        return b.confidenceScore - a.confidenceScore;
      }
      // Secondary: Total attempts (descending) - more rounds = better
      if (a.stats.totalAttempts !== b.stats.totalAttempts) {
        return b.stats.totalAttempts - a.stats.totalAttempts;
      }
      // Tertiary: Best streak (descending)
      return b.stats.bestStreak - a.stats.bestStreak;
    });
    
    // Remove confidenceScore before returning
    return rankedPlayers.map(({ confidenceScore, ...player }) => player);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch leaderboard timed out');
    } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
      // This happens when HTML is returned instead of JSON (e.g., in dev mode)
      console.warn('Invalid JSON response - API endpoint may not be available');
    } else {
      // Only log in production - in dev we already handled it above
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn('Failed to fetch leaderboard:', error);
      }
    }
    // Return all players with zero stats as fallback
    return PLAYERS.map((player) => ({
      playerId: player.id,
      name: player.name,
      number: player.number,
      stats: {
        totalAttempts: 0,
        totalCorrect: 0,
        bestStreak: 0,
        totalTime: 0,
        totalRounds: 0,
        lastUpdated: 0,
      },
    }));
  }
}
