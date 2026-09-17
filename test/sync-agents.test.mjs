import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { syncTarget } from '../scripts/sync-agents.mjs';

test('sync preserves existing AGENTS content and is idempotent', async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-'));
  try {
    await writeFile(
      path.join(target, 'AGENTS.md'),
      '# Project rules\\n\\nKeep project-specific facts here.\\n',
      'utf8'
    );

    const first = await syncTarget(target);
    assert.equal(first.changed, true);

    const content = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(content, /Keep project-specific facts here/);
    assert.equal((content.match(/MAC-ENABLER:BEGIN/g) ?? []).length, 1);

    const check = await syncTarget(target, { check: true });
    assert.equal(check.changed, false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
