import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  configPlan,
  installCursor,
  parseArgs,
  resolveCursorConfigDir
} from '../scripts/setup-cursor.mjs';

test('Cursor setup resolves the global config directory and install mode', () => {
  assert.equal(resolveCursorConfigDir('/tmp/cursor-test'), path.resolve('/tmp/cursor-test'));
  const options = parseArgs(['--install', '--cursor-config-dir', '/tmp/cursor-test']);
  assert.equal(options.install, true);
  assert.equal(options.check, false);
  assert.equal(options.force, false);
});

test('Cursor setup rejects combining check and install', () => {
  assert.throws(() => parseArgs(['--check', '--install']), /either --check or --install/);
});

test('Cursor setup preserves unrelated config and does not overwrite without force', async () => {
  const cursorConfigDir = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-cursor-'));
  try {
    const configPath = path.join(cursorConfigDir, 'cli-config.json');
    await writeFile(configPath, JSON.stringify({
      version: 1,
      channel: 'stable',
      model: { id: 'user-selected' },
      permissions: { allow: ['Shell(custom)'], deny: [] }
    }) + '\n');

    const first = await installCursor({ cursorConfigDir });
    assert.ok(first.results.some((entry) => entry.action === 'skipped-existing'));
    assert.deepEqual(await configPlan(cursorConfigDir), [{ action: 'exists', destination: configPath }]);

    const forced = await installCursor({ cursorConfigDir, force: true });
    assert.ok(forced.results.some((entry) => entry.action === 'installed'));
    const merged = JSON.parse(await readFile(configPath, 'utf8'));
    assert.equal(merged.channel, 'stable');
    assert.equal(merged.model.id, 'user-selected');
    assert.ok(merged.permissions.allow.includes('Shell(custom)'));
    assert.ok(merged.permissions.allow.includes('Shell(git)'));
    assert.ok(merged.permissions.deny.includes('Shell(rm)'));
    assert.equal(merged.approvalMode, 'auto-review');
    assert.ok(forced.results[0].backup);
    assert.equal(await readFile(forced.results[0].backup, 'utf8').then((text) => text.includes('user-selected')), true);
  } finally {
    await rm(cursorConfigDir, { recursive: true, force: true });
  }
});

test('Cursor setup creates a config and check is read-only', async () => {
  const cursorConfigDir = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-cursor-'));
  try {
    const before = await configPlan(cursorConfigDir);
    assert.equal(before[0].action, 'create');
    const checkPath = path.join(cursorConfigDir, 'cli-config.json');
    assert.deepEqual((await configPlan(cursorConfigDir))[0], { action: 'create', destination: checkPath });
    assert.deepEqual(await import('node:fs/promises').then(({ readdir }) => readdir(cursorConfigDir)), []);
    const installed = await installCursor({ cursorConfigDir });
    assert.equal(installed.results[0].action, 'installed');
    assert.equal((await configPlan(cursorConfigDir))[0].action, 'unchanged');
  } finally {
    await rm(cursorConfigDir, { recursive: true, force: true });
  }
});
