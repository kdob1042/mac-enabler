import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, parseArgs } from '../scripts/sync-repositories.mjs';

test('sync repository arguments parse target and dry run', () => {
  assert.deepEqual(
    parseArgs(['--target', 'kdob1042/dev-template', '--dry-run']),
    { target: 'kdob1042/dev-template', dryRun: true }
  );
});

test('sync target configuration is valid and includes the template', async () => {
  const targets = await loadConfig();
  assert.ok(targets.some((target) => target.repository === 'kdob1042/dev-template'));
  assert.ok(targets.some((target) => target.repository === 'kdob1042/manga-mac'));
});
