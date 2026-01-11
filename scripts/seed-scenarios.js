/**
 * Seed script to populate Cloudflare KV with scenarios from scenarios.json
 * 
 * Usage:
 *   node scripts/seed-scenarios.js > scenarios-bulk.json
 *   npx wrangler kv:bulk put --binding=LEADERBOARD_KV scenarios-bulk.json
 * 
 * Or for production:
 *   npx wrangler kv:bulk put --binding=LEADERBOARD_KV --env=production scenarios-bulk.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read scenarios.json
const scenariosPath = join(__dirname, '../src/content/scenarios.json');
const scenariosData = JSON.parse(readFileSync(scenariosPath, 'utf-8'));

// Convert scenarios to KV bulk upload format
// KV bulk format: { "key": "value" } where value is a string
const kvEntries = {};
const scenarioIds = [];

scenariosData.forEach((scenario) => {
  const key = `scenario:${scenario.id}`;
  kvEntries[key] = JSON.stringify(scenario);
  scenarioIds.push(scenario.id);
});

// Add the scenarios list key
kvEntries['scenarios:list'] = JSON.stringify(scenarioIds);

// Write to file
const outputPath = join(__dirname, 'scenarios-bulk.json');
writeFileSync(outputPath, JSON.stringify(kvEntries, null, 2), 'utf-8');

console.log(`✅ Generated ${scenariosData.length} scenario entries`);
console.log(`✅ Output written to: ${outputPath}`);
console.log(`\nNext steps:`);
console.log(`1. Review scenarios-bulk.json`);
console.log(`2. Run: npx wrangler kv:bulk put --binding=LEADERBOARD_KV scenarios-bulk.json`);
console.log(`   Or for production: npx wrangler kv:bulk put --binding=LEADERBOARD_KV --env=production scenarios-bulk.json`);
