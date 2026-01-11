interface Env {
  LEADERBOARD_KV: KVNamespace;
}

interface Scenario {
  id: string;
  title: string;
  category: string;
  situation: {
    runners: { on1: boolean; on2: boolean; on3: boolean };
    ballZone: string;
    goal?: string;
  };
  roles: Record<string, any>;
  roleGroups: {
    ballSide: string[];
    infieldCore: string[];
    coverage: string[];
    backups: string[];
  };
  promptPlan?: {
    recommendedRoles: string[];
    difficulty: number;
  };
}

// GET /api/scenarios/:id - Fetch a single scenario
export const onRequestGet = async (context: { request: Request; env: Env; params: { id: string } }) => {
  const { env, params } = context;

  try {
    const id = params.id;
    const key = `scenario:${id}`;
    const value = await env.LEADERBOARD_KV.get(key);

    if (!value) {
      return new Response(JSON.stringify({ error: 'Scenario not found' }), {
        status: 404,
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
    console.error('Error fetching scenario:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch scenario' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

// PUT /api/scenarios/:id - Update a scenario
export const onRequestPut = async (context: { request: Request; env: Env; params: { id: string } }) => {
  const { env, params, request } = context;

  try {
    const id = params.id;
    const scenario: Scenario = await request.json();

    // Ensure the ID in the body matches the URL parameter
    if (scenario.id !== id) {
      return new Response(JSON.stringify({ error: 'Scenario ID mismatch' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Validate required fields
    if (!scenario.title || !scenario.category) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title, category' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Upsert scenario (update if exists, create if not)
    const key = `scenario:${id}`;
    const existing = await env.LEADERBOARD_KV.get(key);
    const isNew = !existing;
    
    console.log(`PUT /api/scenarios/${id}: isNew=${isNew}, existing=${!!existing}`);

    // Save scenario
    await env.LEADERBOARD_KV.put(key, JSON.stringify(scenario));
    console.log(`PUT /api/scenarios/${id}: Successfully saved to KV`);

    // If this is a new scenario, add it to the scenarios list
    if (isNew) {
      const scenariosListKey = 'scenarios:list';
      const scenariosListJson = await env.LEADERBOARD_KV.get(scenariosListKey);
      let scenarioIds: string[] = [];
      if (scenariosListJson) {
        try {
          scenarioIds = JSON.parse(scenariosListJson);
        } catch (e) {
          console.error('Failed to parse scenarios list:', e);
        }
      }
      if (!scenarioIds.includes(id)) {
        scenarioIds.push(id);
        await env.LEADERBOARD_KV.put(scenariosListKey, JSON.stringify(scenarioIds));
      }
    }

    return new Response(JSON.stringify({ success: true, scenario }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error updating scenario:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, id: params.id });
    return new Response(JSON.stringify({ 
      error: 'Failed to update scenario',
      details: errorMessage,
      id: params.id,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

// DELETE /api/scenarios/:id - Delete a scenario
export const onRequestDelete = async (context: { request: Request; env: Env; params: { id: string } }) => {
  const { env, params } = context;

  try {
    const id = params.id;
    const key = `scenario:${id}`;

    // Check if scenario exists
    const existing = await env.LEADERBOARD_KV.get(key);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Scenario not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Delete scenario
    await env.LEADERBOARD_KV.delete(key);

    // Update scenarios list
    const scenariosListKey = 'scenarios:list';
    const scenariosListJson = await env.LEADERBOARD_KV.get(scenariosListKey);
    if (scenariosListJson) {
      try {
        const scenarioIds: string[] = JSON.parse(scenariosListJson);
        const updatedIds = scenarioIds.filter((sid) => sid !== id);
        await env.LEADERBOARD_KV.put(scenariosListKey, JSON.stringify(updatedIds));
      } catch (e) {
        console.error('Failed to update scenarios list:', e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete scenario' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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
