import { Player } from '../config/players';
import { PLAYERS as DEFAULT_PLAYERS } from '../config/players';

const API_BASE_URL = ''; // Use relative URLs for Cloudflare Pages Functions

// Helper to check if running in Vite dev mode (no API available)
const isViteDevMode = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  // Vite dev server typically runs on port 5173
  // Wrangler pages dev runs on different ports (e.g., 5174, 8788)
  return (hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173';
};

// Fetch all players from KV, merging with default ones
export async function fetchPlayers(): Promise<Player[]> {
  if (isViteDevMode()) {
    // In Vite dev mode, return default players for now
    console.warn('Running in Vite dev mode, returning default players. KV functions are not available. Use wrangler pages dev to test with KV.');
    return DEFAULT_PLAYERS;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/players`);
    if (!response.ok) {
      console.error(`Failed to fetch players from KV: ${response.status}`);
      // Fallback to default players on API error
      return DEFAULT_PLAYERS;
    }
    const kvPlayers: Player[] = await response.json();

    // Merge KV players with default players. KV players take precedence.
    const mergedPlayersMap = new Map<number, Player>();

    // Add default players first
    DEFAULT_PLAYERS.forEach(p => mergedPlayersMap.set(p.id, p));

    // Add KV players, overwriting default ones if IDs match
    kvPlayers.forEach(p => mergedPlayersMap.set(p.id, p));

    return Array.from(mergedPlayersMap.values()).sort((a, b) => a.id - b.id);
  } catch (error) {
    console.warn('Error fetching players from KV, falling back to default:', error);
    return DEFAULT_PLAYERS;
  }
}

// Create a new player
export async function createPlayer(player: Player): Promise<Player> {
  if (isViteDevMode()) {
    throw new Error('Player creation is not supported in Vite dev mode. Use "wrangler pages dev dist --port 5174" to test with KV.');
  }
  const response = await fetch(`${API_BASE_URL}/api/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(player),
  });
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || 'Failed to create player.');
  }
  return response.json();
}

// Update an existing player
export async function updatePlayer(id: number, updates: { name: string; number: number }): Promise<Player> {
  if (isViteDevMode()) {
    throw new Error('Player updates are not supported in Vite dev mode. Use "wrangler pages dev dist --port 5174" to test with KV.');
  }
  const response = await fetch(`${API_BASE_URL}/api/players/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || 'Failed to update player.');
  }
  return response.json();
}

// Delete a player
export async function deletePlayer(id: number): Promise<void> {
  if (isViteDevMode()) {
    throw new Error('Player deletion is not supported in Vite dev mode. Use "wrangler pages dev dist --port 5174" to test with KV.');
  }
  const response = await fetch(`${API_BASE_URL}/api/players/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || 'Failed to delete player.');
  }
}
