interface Env {
  LEADERBOARD_KV: KVNamespace;
  PLAYERS_KV: KVNamespace;
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

interface Player {
  id: number;
  name: string;
  number: number;
}

async function fetchPlayersFromKv(env: Env): Promise<Player[]> {
  const playerIdsString = await env.PLAYERS_KV.get('players:list');
  const playerIds: number[] = playerIdsString ? JSON.parse(playerIdsString) : [];
  const players: Player[] = [];

  for (const id of playerIds) {
    const playerJson = await env.PLAYERS_KV.get(`player:${id}`);
    if (!playerJson) continue;

    try {
      const player: Player = JSON.parse(playerJson);
      players.push(player);
    } catch (e) {
      console.error(`Failed to parse player:${id} from PLAYERS_KV`, e);
    }
  }

  return players.sort((a, b) => a.id - b.id);
}

// GET /api/leaderboard - Fetch all player stats by mode
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all_positions';
  const practiceMode = url.searchParams.get('practiceMode') || 'competition'; // Default to competition for backwards compatibility

  try {
    const players = await fetchPlayersFromKv(env);
    const allStats: PlayerStats[] = [];

    // Fetch all player keys for the specified mode and practice mode
    // New format: player:{id}:{gameMode}:{practiceMode}
    // Also check old format for backwards compatibility: player:{id}:{gameMode} (implicitly competition)
    for (const player of players) {
      // Try new format first
      const newKey = `player:${player.id}:${mode}:${practiceMode}`;
      let value = await env.LEADERBOARD_KV.get(newKey);

      // If not found and looking for competition, try old format for backwards compatibility
      if (!value && practiceMode === 'competition') {
        const oldKey = `player:${player.id}:${mode}`;
        value = await env.LEADERBOARD_KV.get(oldKey);
      }

      if (value) {
        try {
          allStats.push(JSON.parse(value));
        } catch (e) {
          console.error(`Failed to parse player ${player.id} stats for mode ${mode}, practiceMode ${practiceMode}:`, e);
        }
      } else {
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
