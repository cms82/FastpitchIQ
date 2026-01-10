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

// GET /api/leaderboard/:playerId - Fetch single player stats
export const onRequestGet = async (context: { env: Env; params: { playerId: string } }) => {
  const { env, params } = context;
  
  try {
    const playerId = parseInt(params.playerId, 10);
    
    if (isNaN(playerId) || playerId < 1 || playerId > 11) {
      return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const key = `player:${playerId}`;
    const value = await env.LEADERBOARD_KV.get(key);
    
    if (!value) {
      // Return player info with zero stats if not found
      const player = PLAYERS.find(p => p.id === playerId);
      if (!player) {
        return new Response(JSON.stringify({ error: 'Player not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      const defaultStats: PlayerStats = {
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
      
      return new Response(JSON.stringify(defaultStats), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    return new Response(value, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch player stats' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
