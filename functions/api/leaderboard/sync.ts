interface Env {
  LEADERBOARD_KV: KVNamespace;
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

// Player configuration (hardcoded for simplicity in Worker)
const PLAYERS: Array<{ id: number; name: string; number: number }> = [
  { id: 1, name: 'Grace', number: 0 },      // Jersey 00
  { id: 2, name: 'Madelyn', number: 0 },    // Jersey 0
  { id: 3, name: 'Kennedy', number: 1 },
  { id: 4, name: 'Carly', number: 4 },
  { id: 5, name: 'Presley', number: 8 },
  { id: 6, name: 'Brielle', number: 10 },
  { id: 7, name: 'Kate', number: 15 },
  { id: 8, name: 'Mikayla', number: 21 },
  { id: 9, name: 'Jamie', number: 29 },
  { id: 10, name: 'Macie', number: 43 },
  { id: 11, name: 'Zoë', number: 44 },
];

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
    
    // Get player info from config
    const player = PLAYERS.find(p => p.id === playerId);
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
