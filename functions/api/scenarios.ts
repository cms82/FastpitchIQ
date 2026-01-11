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

// GET /api/scenarios - Fetch all scenarios
export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { env } = context;

  try {
    // Get all scenario keys from KV (they're stored as scenario:{id})
    // Since we can't list all keys easily in KV, we'll need a different approach
    // For now, store a list of scenario IDs in a separate key
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

    // Fetch all scenarios
    const scenarios: Scenario[] = [];
    for (const id of scenarioIds) {
      const key = `scenario:${id}`;
      const value = await env.LEADERBOARD_KV.get(key);
      if (value) {
        try {
          scenarios.push(JSON.parse(value));
        } catch (e) {
          console.error(`Failed to parse scenario ${id}:`, e);
        }
      }
    }

    return new Response(JSON.stringify(scenarios), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch scenarios' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

// POST /api/scenarios - Create a new scenario
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    const scenario: Scenario = await request.json();

    // Validate required fields
    if (!scenario.id || !scenario.title || !scenario.category) {
      return new Response(JSON.stringify({ error: 'Missing required fields: id, title, category' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check if scenario already exists
    const key = `scenario:${scenario.id}`;
    const existing = await env.LEADERBOARD_KV.get(key);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Scenario with this ID already exists' }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Save scenario
    await env.LEADERBOARD_KV.put(key, JSON.stringify(scenario));

    // Update scenarios list
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
    if (!scenarioIds.includes(scenario.id)) {
      scenarioIds.push(scenario.id);
      await env.LEADERBOARD_KV.put(scenariosListKey, JSON.stringify(scenarioIds));
    }

    return new Response(JSON.stringify({ success: true, scenario }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return new Response(JSON.stringify({ error: 'Failed to create scenario' }), {
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
