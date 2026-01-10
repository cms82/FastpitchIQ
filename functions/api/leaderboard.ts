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

// GET /api/leaderboard - Fetch all player stats
export const onRequestGet = async (context: { env: Env }) => {
  const { env } = context;
  
  try {
    const allStats: PlayerStats[] = [];
    
    // Fetch all player keys (player:1, player:2, etc.)
    for (let i = 1; i <= 11; i++) {
      const key = `player:${i}`;
      const value = await env.LEADERBOARD_KV.get(key);
      if (value) {
        try {
          allStats.push(JSON.parse(value));
        } catch (e) {
          console.error(`Failed to parse player ${i} stats:`, e);
        }
      } else {
        // If no stats exist, create entry with player info and zero stats
        const player = PLAYERS.find(p => p.id === i);
        if (player) {
          allStats.push({
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
          });
        }
      }
    }
    
    return new Response(JSON.stringify(allStats), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
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
