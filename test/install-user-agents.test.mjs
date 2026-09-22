import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  installUserAgents,
  mergeManagedBlock,
  planUserAgents
} from '../scripts/install-user-agents.mjs';

test('mergeManagedBlock appends without removing existing user instructions', () => {
  const current = '# Personal rule\nKeep this line.\n';
  const block = '<!-- MAC-ENABLER-USER:BEGIN -->\nmanaged\n<!-- MAC-ENABLER-USER:END -->\n';
  const merged = mergeManagedBlock(current, block);
  assert.match(merged, /Keep this line\./);
  assert.match(merged, /managed/);
});

test('mergeManagedBlock replaces only the managed block', () => {
  const current = '# Personal\n\n<!-- MAC-ENABLER-USER:BEGIN -->\nold\n<!-- MAC-ENABLER-USER:END -->\n\nTail\n';
  const block = '<!-- MAC-ENABLER-USER:BEGIN -->\nnew\n<!-- MAC-ENABLER-USER:END -->\n';
  const merged = mergeManagedBlock(current, block);
  assert.match(merged, /# Personal/);
  assert.match(merged, /new/);
  assert.doesNotMatch(merged, /\nold\n/);
  assert.match(merged, /Tail/);
});

test('installUserAgents preserves existing text, backs up, and becomes idempotent', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-agents-'));
  try {
    await mkdir(temp, { recursive: true });
    const destination = path.join(temp, 'AGENTS.md');
    await writeFile(destination, '# Existing\nKeep me.\n', 'utf8');

    const first = await installUserAgents({ codexHome: temp });
    assert.equal(first.action, 'updated');
    assert.ok(first.backup);

    const content = await readFile(destination, 'utf8');
    assert.match(content, /Keep me\./);
    assert.match(content, /MAC-ENABLER-USER:BEGIN/);

    const plan = await planUserAgents(temp);
    assert.equal(plan.action, 'unchanged');

    const second = await installUserAgents({ codexHome: temp });
    assert.equal(second.action, 'unchanged');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
