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

// GET /api/leaderboard - Fetch all player stats by mode
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all_positions';
  const practiceMode = url.searchParams.get('practiceMode') || 'competition'; // Default to competition for backwards compatibility
  
  try {
    const allStats: PlayerStats[] = [];
    
    // Fetch all player keys for the specified mode and practice mode
    // New format: player:{id}:{gameMode}:{practiceMode}
    // Also check old format for backwards compatibility: player:{id}:{gameMode} (implicitly competition)
    for (let i = 1; i <= 11; i++) {
      // Try new format first
      const newKey = `player:${i}:${mode}:${practiceMode}`;
      let value = await env.LEADERBOARD_KV.get(newKey);
      
      // If not found and looking for competition, try old format for backwards compatibility
      if (!value && practiceMode === 'competition') {
        const oldKey = `player:${i}:${mode}`;
        value = await env.LEADERBOARD_KV.get(oldKey);
      }
      
      if (value) {
        try {
          allStats.push(JSON.parse(value));
        } catch (e) {
          console.error(`Failed to parse player ${i} stats for mode ${mode}, practiceMode ${practiceMode}:`, e);
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
              totalRounds: 0,
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
