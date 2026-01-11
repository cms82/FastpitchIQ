import { Player } from '../config/players';

const API_BASE_URL = ''; // Use relative URLs for Cloudflare Pages Functions

// Helper to check if running in Vite dev mode (no API available)
const isViteDevMode = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  // Vite dev server typically runs on port 5173
  // Wrangler pages dev runs on different ports (e.g., 5174, 8788)
  return (hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173';
};

// Fetch all players from KV only (no default players)
export async function fetchPlayers(): Promise<Player[]> {
  if (isViteDevMode()) {
    // In Vite dev mode, return empty array (players should be managed via KV)
    console.warn('Running in Vite dev mode, returning empty players list. KV functions are not available. Use wrangler pages dev to test with KV.');
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/players`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch players from KV: ${response.status}`);
      return [];
    }
    
    const kvPlayers: Player[] = await response.json();
    return kvPlayers.sort((a, b) => a.id - b.id);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch players timed out');
    } else {
      console.warn('Error fetching players from KV:', error);
    }
    return [];
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
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Failed to update player: ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMessage = errorJson.error;
          if (errorJson.details) {
            errorMessage += ` - ${errorJson.details}`;
          }
        } else if (typeof errorJson === 'string') {
          errorMessage = errorJson;
        }
      } catch (e) {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    console.error('Error updating player:', error);
    throw error;
  }
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
