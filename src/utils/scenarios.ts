import { Scenario } from '../types';

const API_BASE_URL = '';

// Helper to check if running in Vite dev mode (no API available)
const isViteDevMode = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  // Vite dev server typically runs on port 5173
  // Wrangler pages dev runs on different ports (e.g., 5174, 8788)
  return (hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173';
};

// Fetch all scenarios from KV
export async function fetchScenarios(): Promise<Scenario[]> {
  if (isViteDevMode()) {
    // In Vite dev mode, return empty array (scenarios are loaded from static JSON)
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/scenarios`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store', // Don't cache - always fetch fresh scenarios
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch scenarios: ${response.status}`);
      return [];
    }

    const scenarios: Scenario[] = await response.json();
    return scenarios;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Fetch scenarios timed out');
    } else {
      console.warn('Failed to fetch scenarios from KV:', error);
    }
    return []; // Return empty array, will fallback to static JSON
  }
}

// Fetch a single scenario by ID
export async function fetchScenarioById(id: string): Promise<Scenario | null> {
  if (isViteDevMode()) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/scenarios/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch scenario: ${response.status}`);
      return null;
    }

    const scenario: Scenario = await response.json();
    return scenario;
  } catch (error) {
    console.warn(`Failed to fetch scenario ${id}:`, error);
    return null;
  }
}

// Create a new scenario
export async function createScenario(scenario: Scenario): Promise<boolean> {
  if (isViteDevMode()) {
    throw new Error('Cannot create scenarios in Vite dev mode. Use "wrangler pages dev dist --port 5174" to test with KV.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/scenarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenario),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to create scenario: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating scenario:', error);
    throw error;
  }
}

// Update an existing scenario
export async function updateScenario(scenario: Scenario): Promise<boolean> {
  if (isViteDevMode()) {
    throw new Error('Cannot update scenarios in Vite dev mode. Use "wrangler pages dev dist --port 5174" to test with KV.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/scenarios/${scenario.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenario),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Failed to update scenario: ${response.status}`;
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

    return true;
  } catch (error) {
    console.error('Error updating scenario:', error);
    throw error;
  }
}

// Delete a scenario
export async function deleteScenario(id: string): Promise<boolean> {
  if (isViteDevMode()) {
    throw new Error('Cannot delete scenarios in Vite dev mode. Use "wrangler pages dev dist --port 5174" to test with KV.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/scenarios/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to delete scenario: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting scenario:', error);
    throw error;
  }
}
