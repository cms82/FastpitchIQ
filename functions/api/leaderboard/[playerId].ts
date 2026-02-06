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
    lastUpdated: number;
  };
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

// GET /api/leaderboard/:playerId - Fetch single player stats
export const onRequestGet = async (context: { request: Request; env: Env; params: { playerId: string } }) => {
  const { env, params } = context;

  try {
    const playerId = parseInt(params.playerId, 10);

    if (isNaN(playerId) || playerId < 1) {
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
      const player = await fetchPlayerById(env, playerId);
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

// DELETE /api/leaderboard/:playerId - Clear player stats
export const onRequestDelete = async (context: { request: Request; env: Env; params: { playerId: string } }) => {
  const { env, params } = context;

  try {
    const playerId = parseInt(params.playerId, 10);

    if (isNaN(playerId) || playerId < 1) {
      return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Delete all known key variants for this player.
    const keysToDelete = [
      `player:${playerId}`,
      `player:${playerId}:one_position`,
      `player:${playerId}:all_positions`,
      `player:${playerId}:one_position:practice`,
      `player:${playerId}:one_position:competition`,
      `player:${playerId}:all_positions:practice`,
      `player:${playerId}:all_positions:competition`,
    ];

    await Promise.all(keysToDelete.map((key) => env.LEADERBOARD_KV.delete(key)));

    return new Response(JSON.stringify({ success: true, message: 'Player stats cleared' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error clearing player stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to clear player stats' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
};

// Handle OPTIONS for CORS
export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
