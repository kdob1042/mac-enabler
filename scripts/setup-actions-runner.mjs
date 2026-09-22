import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = 'kdob1042/mac-enabler';
const LABEL = 'mac-enabler-ci';
const VARIABLE = 'MAC_ENABLER_CI_RUNNER';
const DEFAULT_DIR = path.join(os.homedir(), '.local', 'share', 'mac-enabler', 'actions-runner');

function existsSyncLike(filePath) {
  return stat(filePath).then(() => true, (error) => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: process.env,
    stdio: options.capture === false ? 'inherit' : 'pipe'
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(command + ' failed' + (detail ? ': ' + detail : ''));
  }
  return (result.stdout || '').trim();
}

function parseArgs(args) {
  const options = {
    check: false,
    force: false,
    help: false,
    install: false,
    runnerDir: DEFAULT_DIR
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--install') options.install = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--runner-dir') {
      options.runnerDir = path.resolve(args[i + 1] || '');
      i += 1;
    } else if (arg === '--help') options.help = true;
    else throw new Error('Unknown argument: ' + arg);
  }

  if (options.check && options.install) {
    throw new Error('Use either --check or --install, not both.');
  }
  return options;
}

function assertMac() {
  if (process.platform !== 'darwin') {
    throw new Error('The mac-enabler self-hosted runner setup is intended for macOS.');
  }
  if (!['arm64', 'x64'].includes(process.arch)) {
    throw new Error('Unsupported macOS architecture: ' + process.arch);
  }
}

function getRelease() {
  const raw = run('gh', ['api', 'repos/actions/runner/releases/latest']);
  const release = JSON.parse(raw);
  const suffix = process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
  const asset = release.assets?.find((entry) =>
    entry.name?.startsWith('actions-runner-' + suffix + '-') && entry.name?.endsWith('.tar.gz')
  );
  if (!asset) throw new Error('Could not locate the current GitHub Actions runner asset for ' + suffix + '.');
  return {
    tag: release.tag_name,
    name: asset.name,
    url: asset.browser_download_url,
    digest: asset.digest || null
  };
}

async function verifyDigest(filePath, digest) {
  if (!digest || !digest.startsWith('sha256:')) return { verified: false, reason: 'release digest unavailable' };
  const expected = digest.slice('sha256:'.length);
  const actual = run('shasum', ['-a', '256', filePath]).split(/\s+/)[0];
  if (actual !== expected) throw new Error('Actions runner archive checksum mismatch.');
  return { verified: true, algorithm: 'sha256' };
}

async function inspect(runnerDir = DEFAULT_DIR) {
  const configured = await existsSyncLike(path.join(runnerDir, '.runner'));
  const service = await existsSyncLike(path.join(runnerDir, '.service'));
  let variable = null;

  try {
    variable = run('gh', ['variable', 'get', VARIABLE, '--repo', REPO]).trim() || null;
  } catch {
    variable = null;
  }

  return {
    repository: REPO,
    runner_dir: runnerDir,
    configured,
    service_installed: service,
    ci_runner_variable: variable,
    expected_label: LABEL,
    ready: configured && service && variable === LABEL
  };
}

async function install(options) {
  assertMac();
  run('gh', ['auth', 'status']);

  await mkdir(options.runnerDir, { recursive: true });
  const configured = await existsSyncLike(path.join(options.runnerDir, '.runner'));

  if (!configured || options.force) {
    const release = getRelease();
    const archive = path.join(options.runnerDir, release.name);

    run('curl', ['--fail', '--location', '--output', archive, release.url], { capture: false });
    const verification = await verifyDigest(archive, release.digest);
    run('tar', ['xzf', archive, '-C', options.runnerDir]);

    const tokenRaw = run('gh', [
      'api',
      '--method', 'POST',
      'repos/' + REPO + '/actions/runners/registration-token'
    ]);
    const token = JSON.parse(tokenRaw).token;
    if (!token) throw new Error('GitHub did not return a runner registration token.');

    const runnerName = os.hostname().replace(/[^A-Za-z0-9._-]/g, '-') + '-mac-enabler';
    run('./config.sh', [
      '--unattended',
      '--url', 'https://github.com/' + REPO,
      '--token', token,
      '--name', runnerName,
      '--labels', LABEL,
      '--work', '_work',
      '--replace'
    ], { cwd: options.runnerDir, capture: false });

    if (verification.verified) {
      await writeFile(path.join(options.runnerDir, '.mac-enabler-checksum'), release.digest + '\n', 'utf8');
    }
  }

  const serviceFile = path.join(options.runnerDir, '.service');
  if (!(await existsSyncLike(serviceFile))) {
    run('./svc.sh', ['install'], { cwd: options.runnerDir, capture: false });
  }
  run('./svc.sh', ['start'], { cwd: options.runnerDir, capture: false });

  // This flips CI to the self-hosted runner without editing the workflow again.
  run('gh', ['variable', 'set', VARIABLE, '--repo', REPO, '--body', LABEL], { capture: false });

  return inspect(options.runnerDir);
}

function usage() {
  console.log('Usage: npm run actions:runner -- --install [--force] [--runner-dir PATH]');
  console.log('       npm run actions:runner -- --check [--runner-dir PATH]');
  console.log('');
  console.log('Registers this Mac as the private mac-enabler GitHub Actions runner and switches CI to it.');
}

export { DEFAULT_DIR, LABEL, REPO, VARIABLE, inspect, parseArgs };

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || (!options.install && !options.check)) {
    usage();
    if (!options.help) process.exitCode = 1;
    return;
  }

  if (options.check) {
    const state = await inspect(options.runnerDir);
    console.log(JSON.stringify(state, null, 2));
    if (!state.ready) process.exitCode = 1;
    return;
  }

  const state = await install(options);
  console.log(JSON.stringify(state, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
