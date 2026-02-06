interface Env {
  LEADERBOARD_KV: KVNamespace;
  PLAYERS_KV: KVNamespace;
}

interface Player {
  id: number;
  name: string;
  number: number;
}

interface PlayerStats {
  playerId: number;
  name: string;
  number: number;
  stats: {
    totalAttempts: number;
    totalCorrect: number;
    bestStreak: number;
    totalTime: number;
    totalRounds: number;
    lastUpdated: number;
  };
}

interface RoundStats {
  correct: number;
  incorrect: number;
  totalTime: number;
  bestStreak: number;
  totalRounds?: number;
}

interface SyncRequest {
  playerId: number;
  mode?: string; // 'one_position' or 'all_positions'
  practiceMode?: 'practice' | 'competition'; // Track practice vs competition
  roundStats: RoundStats;
}

async function fetchPlayerById(env: Env, playerId: number): Promise<Player | null> {
  const playerJson = await env.PLAYERS_KV.get(`player:${playerId}`);
  if (!playerJson) return null;

  try {
    return JSON.parse(playerJson) as Player;
  } catch (e) {
    console.error(`Failed to parse player:${playerId} from PLAYERS_KV`, e);
    return null;
  }
}

// POST /api/leaderboard/sync - Update player stats with incremental merge
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    const body: SyncRequest = await request.json();
    const { playerId, mode, roundStats } = body;

    if (!playerId || !roundStats) {
      return new Response(JSON.stringify({ error: 'Missing playerId or roundStats' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Default to 'all_positions' and 'competition' for backwards compatibility
    const leaderboardMode = (mode === 'one_position' || mode === 'all_positions') ? mode : 'all_positions';
    const practiceMode = (body.practiceMode === 'practice' || body.practiceMode === 'competition') ? body.practiceMode : 'competition';

    // New key structure: player:{id}:{gameMode}:{practiceMode}
    // For backwards compatibility, also support old format (implicitly competition)
    const key = `player:${playerId}:${leaderboardMode}:${practiceMode}`;

    // Fetch existing stats from KV
    const existingValue = await env.LEADERBOARD_KV.get(key);
    let existingStats: PlayerStats | null = null;

    if (existingValue) {
      try {
        existingStats = JSON.parse(existingValue);
      } catch (e) {
        console.error(`Failed to parse existing stats for player ${playerId}:`, e);
      }
    }

    // Get player info from PLAYERS_KV
    const player = await fetchPlayerById(env, playerId);
    if (!player) {
      return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Merge stats incrementally
    const newAttempts = roundStats.correct + roundStats.incorrect;
    const newCorrect = roundStats.correct;
    const newTotalTime = roundStats.totalTime;
    const newRounds = roundStats.totalRounds || 1;

    if (existingStats) {
      // Merge with existing
      existingStats.stats.totalAttempts += newAttempts;
      existingStats.stats.totalCorrect += newCorrect;
      existingStats.stats.totalTime += newTotalTime;
      existingStats.stats.totalRounds = (existingStats.stats.totalRounds || 0) + newRounds;
      existingStats.stats.bestStreak = Math.max(existingStats.stats.bestStreak || 0, roundStats.bestStreak);
      existingStats.stats.lastUpdated = Date.now();

      const updatedValue = JSON.stringify(existingStats);
      await env.LEADERBOARD_KV.put(key, updatedValue);
    } else {
      // Create new player stats
      const newStats: PlayerStats = {
        playerId: player.id,
        name: player.name,
        number: player.number,
        stats: {
          totalAttempts: newAttempts,
          totalCorrect: newCorrect,
          bestStreak: roundStats.bestStreak,
          totalTime: newTotalTime,
          totalRounds: newRounds,
          lastUpdated: Date.now(),
        },
      };
      await env.LEADERBOARD_KV.put(key, JSON.stringify(newStats));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error syncing stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to sync stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Handle OPTIONS for CORS
export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
