/**
 * Seed script to populate Cloudflare KV with scenarios from scenarios.json
 * 
 * Usage:
 *   npx wrangler kv:bulk put --binding=LEADERBOARD_KV scenarios-bulk.json
 * 
 * Or use this script with wrangler:
 *   npx tsx scripts/seed-scenarios.ts
 */

import scenariosData from '../src/content/scenarios.json';
import { Scenario } from '../src/types';

// Convert scenarios to KV bulk upload format
// KV bulk format: { "key": "value" } where value is a string
const kvEntries: Record<string, string> = {};
const scenarioIds: string[] = [];

(scenariosData as Scenario[]).forEach((scenario) => {
  const key = `scenario:${scenario.id}`;
  kvEntries[key] = JSON.stringify(scenario);
  scenarioIds.push(scenario.id);
});

// Add the scenarios list key
kvEntries['scenarios:list'] = JSON.stringify(scenarioIds);

// Output as JSON for wrangler kv:bulk put
console.log(JSON.stringify(kvEntries, null, 2));
