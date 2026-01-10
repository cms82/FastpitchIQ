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
    lastUpdated: number;
  };
}

interface RoundStats {
  correct: number;
  incorrect: number;
  totalTime: number;
  bestStreak: number;
}

interface SyncRequest {
  playerId: number;
  roundStats: RoundStats;
}

// Player configuration (hardcoded for simplicity in Worker)
const PLAYERS: Array<{ id: number; name: string; number: number }> = [
  { id: 1, name: 'Player 1', number: 1 },
  { id: 2, name: 'Player 2', number: 2 },
  { id: 3, name: 'Player 3', number: 3 },
  { id: 4, name: 'Player 4', number: 4 },
  { id: 5, name: 'Player 5', number: 5 },
  { id: 6, name: 'Player 6', number: 6 },
  { id: 7, name: 'Player 7', number: 7 },
  { id: 8, name: 'Player 8', number: 8 },
  { id: 9, name: 'Player 9', number: 9 },
  { id: 10, name: 'Player 10', number: 10 },
  { id: 11, name: 'Player 11', number: 11 },
];

// POST /api/leaderboard/sync - Update player stats with incremental merge
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  
  try {
    const body: SyncRequest = await request.json();
    const { playerId, roundStats } = body;
    
    if (!playerId || !roundStats) {
      return new Response(JSON.stringify({ error: 'Missing playerId or roundStats' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const key = `player:${playerId}`;
    
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
    
    if (existingStats) {
      // Merge with existing
      existingStats.stats.totalAttempts += newAttempts;
      existingStats.stats.totalCorrect += newCorrect;
      existingStats.stats.totalTime += newTotalTime;
      existingStats.stats.bestStreak = Math.max(existingStats.stats.bestStreak, roundStats.bestStreak);
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
