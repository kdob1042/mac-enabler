import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncTarget } from '../scripts/sync-agents.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-minimal-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function put(root, relative, content) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

async function snapshot(root, relative = '') {
  const files = {};
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  for (const entry of entries) {
    const name = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) Object.assign(files, await snapshot(root, name));
    else files[name] = await readFile(path.join(root, name), 'utf8');
  }
  return files;
}

test('Cursor/Codex preparation adds only AGENTS.md to a fresh consumer', async (t) => {
  const root = await fixture(t);
  const result = await syncTarget(root);
  assert.deepEqual(result.changed_paths, ['AGENTS.md']);
  assert.deepEqual(await readdir(root), ['AGENTS.md']);
  const agents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Cursor \/ Codex/);
  assert.match(agents, /head SHA/);
  assert.match(agents, /検証済みSHA/);
});

test('sync preserves all consumer configuration, skills, CI and legacy files', async (t) => {
  const root = await fixture(t);
  const files = {
    'AGENTS.md': '# Project rules\nKeep these facts.\n',
    'src/AGENTS.md': '# Nested rules\n',
    '.cursor/settings.json': '{"owned":"cursor"}\n',
    '.codex/config.toml': '# Project-owned config\n',
    '.codex/mac-enabler/manifest.json': '{"version":1}\n',
    '.codex/mac-enabler/workflow.json': '{"legacy":true}\n',
    '.agents/skills/custom/SKILL.md': 'Existing skill\n',
    '.github/workflows/project.yml': '# Existing CI\n'
  };
  for (const [name, text] of Object.entries(files)) await put(root, name, text);
  const result = await syncTarget(root);
  assert.deepEqual(result.changed_paths, ['AGENTS.md']);
  const after = await snapshot(root);
  assert.deepEqual(Object.keys(after).sort(), Object.keys(files).sort());
  for (const [name, text] of Object.entries(files)) {
    if (name === 'AGENTS.md') assert.ok(after[name].startsWith(text));
    else assert.equal(after[name], text, name);
  }
});

test('check mode is read-only and minimal sync remains idempotent', async (t) => {
  const root = await fixture(t);
  const check = await syncTarget(root, { check: true });
  assert.deepEqual(check.changed_paths, ['AGENTS.md']);
  assert.deepEqual(await readdir(root), []);
  await syncTarget(root);
  const before = await snapshot(root);
  assert.equal((await syncTarget(root, { check: true })).changed, false);
  assert.equal((await syncTarget(root)).changed, false);
  assert.deepEqual(await snapshot(root), before);
});

test('shared block is self-contained without retired snapshot/Skill/checker prerequisites', async () => {
  const text = await readFile(path.join(ROOT, 'templates/shared-agents-block.md'), 'utf8');
  assert.equal((text.match(/MAC-ENABLER:BEGIN/g) || []).length, 1);
  assert.equal((text.match(/MAC-ENABLER:END/g) || []).length, 1);
  for (const retired of ['.codex/mac-enabler/', '.agents/skills/', 'check.mjs', 'model-routing.json', 'workflow.json']) {
    assert.ok(!text.includes(retired), 'Do not restore prerequisite: ' + retired);
  }
});
