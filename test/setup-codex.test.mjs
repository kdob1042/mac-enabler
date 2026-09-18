import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../scripts/setup-codex.mjs';

test('setup defaults to the user Codex home and supports install', () => {
  const options = parseArgs(['--install']);
  assert.equal(options.install, true);
  assert.equal(options.check, false);
  assert.equal(options.force, false);
});

test('setup rejects combining check and install', () => {
  assert.throws(() => parseArgs(['--check', '--install']), /either --check or --install/);
});
