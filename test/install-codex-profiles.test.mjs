import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  installProfiles,
  planProfiles,
  resolveCodexHome
} from '../scripts/install-codex-profiles.mjs';

test('resolveCodexHome prefers an explicit directory', () => {
  assert.equal(resolveCodexHome('/tmp/codex-test'), path.resolve('/tmp/codex-test'));
});

test('profile installation does not touch user config.toml', async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-codex-'));
  try {
    const configPath = path.join(codexHome, 'config.toml');
    await writeFile(configPath, 'model = "custom-model"\n', 'utf8');

    const plan = await planProfiles(codexHome);
    assert.ok(plan.some((entry) => entry.action === 'create'));

    const result = await installProfiles({ codexHome });
    assert.ok(result.results.some((entry) => entry.action === 'installed'));
    assert.equal(await readFile(configPath, 'utf8'), 'model = "custom-model"\n');
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});

test('existing profiles are preserved unless force is requested', async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), 'mac-enabler-codex-'));
  try {
    const first = await installProfiles({ codexHome });
    const profilePath = path.join(codexHome, 'astra_light.config.toml');
    await writeFile(profilePath, 'model = "local-customization"\n', 'utf8');

    const skipped = await installProfiles({ codexHome });
    assert.ok(skipped.results.some((entry) => entry.action === 'skipped-existing'));

    const forced = await installProfiles({ codexHome, force: true });
    assert.ok(forced.results.some((entry) => entry.action === 'installed'));
    assert.match(await readFile(profilePath, 'utf8'), /gpt-6-astra/);
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});
