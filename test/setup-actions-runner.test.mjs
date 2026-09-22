import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {
  DEFAULT_DIR,
  LABEL,
  REPO,
  VARIABLE,
  parseArgs
} from '../scripts/setup-actions-runner.mjs';

test('self-hosted runner constants target mac-enabler only', () => {
  assert.equal(REPO, 'kdob1042/mac-enabler');
  assert.equal(LABEL, 'mac-enabler-ci');
  assert.equal(VARIABLE, 'MAC_ENABLER_CI_RUNNER');
  assert.equal(DEFAULT_DIR, path.join(os.homedir(), '.local', 'share', 'mac-enabler', 'actions-runner'));
});

test('runner setup parses install and custom directory', () => {
  const options = parseArgs(['--install', '--runner-dir', '/tmp/mac-enabler-runner']);
  assert.equal(options.install, true);
  assert.equal(options.check, false);
  assert.equal(options.force, false);
  assert.equal(options.runnerDir, path.resolve('/tmp/mac-enabler-runner'));
});

test('runner setup rejects install and check together', () => {
  assert.throws(
    () => parseArgs(['--install', '--check']),
    /either --check or --install/
  );
});
