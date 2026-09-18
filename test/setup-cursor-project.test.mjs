import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  checkCursorProject,
  installCursorProject,
  parseArgs
} from '../scripts/setup-cursor-project.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-cursor-project-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

function installOptions(target, extra = {}) {
  return {
    check: false,
    force: false,
    install: true,
    installCommand: 'npm ci',
    startCommand: 'npm run dev',
    target,
    terminals: [{ name: 'web', command: 'npm run dev' }],
    testCommand: 'npm test',
    ...extra
  };
}

test('Cursor project setup parses explicit commands and repeatable terminals', () => {
  const options = parseArgs([
    '--install',
    '--target', '/tmp/project',
    '--install-command', 'npm ci',
    '--test-command', 'npm test',
    '--start-command', 'npm run dev',
    '--terminal', 'web=npm run dev'
  ]);
  assert.equal(options.install, true);
  assert.equal(options.check, false);
  assert.deepEqual(options.terminals, [{ name: 'web', command: 'npm run dev' }]);
});

test('Cursor project setup requires install and test commands', () => {
  assert.throws(
    () => parseArgs(['--install', '--target', '/tmp/project', '--install-command', 'npm ci']),
    /--test-command is required/
  );
  assert.throws(
    () => parseArgs(['--install', '--target', '/tmp/project', '--test-command', 'npm test']),
    /--install-command is required/
  );
});

test('Cursor project setup creates only the explicit environment and marked AGENTS block', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'AGENTS.md'), '# Existing project rules\n');

  const result = await installCursorProject(installOptions(root));
  assert.equal(result.results.every((entry) => entry.action === 'installed'), true);

  const environment = JSON.parse(await readFile(path.join(root, '.cursor/environment.json'), 'utf8'));
  assert.deepEqual(environment, {
    install: 'npm ci',
    start: 'npm run dev',
    terminals: [{ name: 'web', command: 'npm run dev' }]
  });
  const agents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /^# Existing project rules/m);
  assert.match(agents, /MAC-ENABLER:CURSOR-CLOUD:BEGIN/);
  assert.match(agents, /npm test/);
  assert.deepEqual(await readdir(path.join(root, '.cursor')), ['environment.json']);

  const check = await checkCursorProject({ ...installOptions(root), check: true, install: false });
  assert.equal(check.ready, true);
});

test('Cursor project setup refuses to replace an existing managed environment without force', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, '.cursor'), { recursive: true });
  await writeFile(path.join(root, '.cursor/environment.json'), '{"install":"pnpm install"}\n');
  await writeFile(path.join(root, 'AGENTS.md'), '# Existing\n');

  const result = await installCursorProject(installOptions(root));
  assert.ok(result.results.every((entry) => entry.action === 'skipped-existing'));
  assert.equal(await readFile(path.join(root, '.cursor/environment.json'), 'utf8'), '{"install":"pnpm install"}\n');
  assert.equal(await readFile(path.join(root, 'AGENTS.md'), 'utf8'), '# Existing\n');

  const forced = await installCursorProject(installOptions(root, { force: true }));
  assert.ok(forced.results.some((entry) => entry.action === 'installed'));
  const backups = (await readdir(path.join(root, '.cursor'))).filter((name) => name.includes('.bak-'));
  assert.equal(backups.length, 1);
});

test('Cursor project check is read-only and detects missing project setup', async (t) => {
  const root = await fixture(t);
  const before = await readdir(root);
  const result = await checkCursorProject({ check: true, install: false, target: root });
  assert.equal(result.ready, false);
  assert.deepEqual(result.files.map((file) => file.status), ['missing', 'missing']);
  assert.deepEqual(await readdir(root), before);
});

test('Cursor project setup rejects secret-looking command values', async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    installCursorProject(installOptions(root, { installCommand: 'npm ci TOKEN=do-not-write' })),
    /must reference Cursor Secrets/
  );
});
