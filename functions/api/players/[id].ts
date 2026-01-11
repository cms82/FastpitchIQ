interface Env {
  PLAYERS_KV: KVNamespace;
}

interface Player {
  id: number;
  name: string;
  number: number;
}

// GET /api/players/:id - Get a single player
export const onRequestGet = async (context: { request: Request; env: Env; params: { id: string } }) => {
  const { env, params } = context;
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `player:${id}`;
    const value = await env.PLAYERS_KV.get(key);

    if (!value) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    return new Response(value, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error(`Error fetching player ${params.id}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to fetch player' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT /api/players/:id - Update an existing player
export const onRequestPut = async (context: { request: Request; env: Env; params: { id: string } }) => {
  const { env, params, request } = context;
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: { name?: string; number?: number } = await request.json();

    if (!updates.name && typeof updates.number !== 'number') {
      return new Response(JSON.stringify({ error: 'Name or number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if player exists
    const key = `player:${id}`;
    const existingValue = await env.PLAYERS_KV.get(key);
    if (!existingValue) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingPlayer: Player = JSON.parse(existingValue);

    // Check for duplicate jersey number (if number is being updated)
    if (typeof updates.number === 'number' && updates.number !== existingPlayer.number) {
      const listKey = 'players:list';
      const playerIdsString = await env.PLAYERS_KV.get(listKey);
      const playerIds: number[] = playerIdsString ? JSON.parse(playerIdsString) : [];

      for (const playerId of playerIds) {
        if (playerId === id) continue; // Skip current player
        const otherPlayerJson = await env.PLAYERS_KV.get(`player:${playerId}`);
        if (otherPlayerJson) {
          const otherPlayer: Player = JSON.parse(otherPlayerJson);
          if (otherPlayer.number === updates.number) {
            return new Response(JSON.stringify({ error: `Jersey number ${updates.number} is already taken by ${otherPlayer.name}` }), {
              status: 409,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // Update player
    const updatedPlayer: Player = {
      ...existingPlayer,
      ...updates,
    };

    await env.PLAYERS_KV.put(key, JSON.stringify(updatedPlayer));

    return new Response(JSON.stringify(updatedPlayer), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error(`Error updating player ${params.id}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to update player' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/players/:id - Delete a player
export const onRequestDelete = async (context: { request: Request; env: Env; params: { id: string } }) => {
  const { env, params } = context;
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid player ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `player:${id}`;
    const existing = await env.PLAYERS_KV.get(key);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.PLAYERS_KV.delete(key);

    // Remove from the list of all player IDs
    const listKey = 'players:list';
    const playerIdsString = await env.PLAYERS_KV.get(listKey);
    if (playerIdsString) {
      let playerIds: number[] = JSON.parse(playerIdsString);
      playerIds = playerIds.filter(playerId => playerId !== id);
      await env.PLAYERS_KV.put(listKey, JSON.stringify(playerIds));
    }

    return new Response(JSON.stringify({ success: true, playerId: id }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error(`Error deleting player ${params.id}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to delete player' }), {
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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
