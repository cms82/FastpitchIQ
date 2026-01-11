interface Env {
  PLAYERS_KV: KVNamespace;
}

interface Player {
  id: number;
  name: string;
  number: number;
}

// Default players (fallback if KV is empty)
const DEFAULT_PLAYERS: Player[] = [
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

// GET /api/players - List all players
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  try {
    const listKey = 'players:list';
    const playerIdsString = await env.PLAYERS_KV.get(listKey);
    const playerIds: number[] = playerIdsString ? JSON.parse(playerIdsString) : [];

    // If no players in KV, return default players
    if (playerIds.length === 0) {
      return new Response(JSON.stringify(DEFAULT_PLAYERS), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const players: Player[] = [];
    for (const id of playerIds) {
      const playerJson = await env.PLAYERS_KV.get(`player:${id}`);
      if (playerJson) {
        players.push(JSON.parse(playerJson));
      }
    }

    // Merge with defaults (defaults take precedence for missing IDs)
    const playersMap = new Map<number, Player>();
    DEFAULT_PLAYERS.forEach(p => playersMap.set(p.id, p));
    players.forEach(p => playersMap.set(p.id, p));

    return new Response(JSON.stringify(Array.from(playersMap.values()).sort((a, b) => a.id - b.id)), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error listing players:', error);
    return new Response(JSON.stringify({ error: 'Failed to list players' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/players - Create a new player
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  try {
    const player: Player = await request.json();

    if (!player.id || !player.name || typeof player.number !== 'number') {
      return new Response(JSON.stringify({ error: 'Player ID, name, and number are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if player already exists
    const key = `player:${player.id}`;
    const existing = await env.PLAYERS_KV.get(key);
    if (existing) {
      return new Response(JSON.stringify({ error: `Player with ID ${player.id} already exists` }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate jersey number
    const listKey = 'players:list';
    const playerIdsString = await env.PLAYERS_KV.get(listKey);
    const playerIds: number[] = playerIdsString ? JSON.parse(playerIdsString) : [];
    
    for (const id of playerIds) {
      const existingPlayerJson = await env.PLAYERS_KV.get(`player:${id}`);
      if (existingPlayerJson) {
        const existingPlayer: Player = JSON.parse(existingPlayerJson);
        if (existingPlayer.number === player.number && existingPlayer.id !== player.id) {
          return new Response(JSON.stringify({ error: `Jersey number ${player.number} is already taken by ${existingPlayer.name}` }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    await env.PLAYERS_KV.put(key, JSON.stringify(player));

    // Update the list of all player IDs
    if (!playerIds.includes(player.id)) {
      playerIds.push(player.id);
      await env.PLAYERS_KV.put(listKey, JSON.stringify(playerIds));
    }

    return new Response(JSON.stringify(player), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error creating player:', error);
    return new Response(JSON.stringify({ error: 'Failed to create player' }), {
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
