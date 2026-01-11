/**
 * Seed script to populate Cloudflare KV with players from players.ts
 * 
 * Usage:
 *   node scripts/seed-players.mjs
 *   npx wrangler kv bulk put --namespace-id=98dff05d785946d0a388c2b7f0a670c2 --remote scripts/players-bulk.json
 * 
 * Or for production:
 *   npx wrangler kv bulk put --namespace-id=98dff05d785946d0a388c2b7f0a670c2 scripts/players-bulk.json
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Players from src/config/players.ts
const players = [
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

// Convert players to KV bulk upload format
// KV bulk format: [ { "key": "...", "value": "..." }, ... ]
const kvEntries = [];
const playerIds = [];

players.forEach((player) => {
  const key = `player:${player.id}`;
  kvEntries.push({
    key: key,
    value: JSON.stringify(player)
  });
  playerIds.push(player.id);
});

// Add the players list key
kvEntries.push({
  key: 'players:list',
  value: JSON.stringify(playerIds)
});

// Write to file
const outputPath = join(__dirname, 'players-bulk.json');
writeFileSync(outputPath, JSON.stringify(kvEntries, null, 2), 'utf-8');

console.log(`✅ Generated ${players.length} player entries`);
console.log(`✅ Output written to: ${outputPath}`);
console.log(`\nNext steps:`);
console.log(`1. Review players-bulk.json`);
console.log(`2. Run: npx wrangler kv bulk put --namespace-id=98dff05d785946d0a388c2b7f0a670c2 --remote scripts/players-bulk.json`);
console.log(`   Or for production: npx wrangler kv bulk put --namespace-id=98dff05d785946d0a388c2b7f0a670c2 scripts/players-bulk.json`);
