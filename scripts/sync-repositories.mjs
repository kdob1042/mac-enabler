import { mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncTarget } from './sync-agents.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_CONFIG = path.join(ROOT, '.github', 'sync-targets.json');

function run(command, args, options = {}) {
  const { cwd = ROOT, allowFailure = false } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on('error', (error) => {
      if (allowFailure) {
        resolve({ code: -1, stdout, stderr, error });
      } else {
        reject(error);
      }
    });
    child.on('close', (code) => {
      if (code !== 0 && !allowFailure) {
        reject(new Error(
          command + ' ' + args.join(' ') + ' failed with exit code ' + code +
          (stderr.trim() ? ': ' + stderr.trim() : '')
        ));
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

function parseArgs(args) {
  let target = '';
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--target') {
      target = args[index + 1] || '';
      index += 1;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help') {
      return { help: true, target, dryRun };
    }
  }
  return { target, dryRun };
}

async function loadConfig() {
  const config = JSON.parse(await readFile(TARGET_CONFIG, 'utf8'));
  if (config.version !== 1 || !Array.isArray(config.targets) || config.targets.length === 0) {
    throw new Error('Invalid .github/sync-targets.json.');
  }
  const seen = new Set();
  for (const target of config.targets) {
    if (!target.repository || !target.base_branch || !target.sync_branch) {
      throw new Error('Every sync target needs repository, base_branch, and sync_branch.');
    }
    if (seen.has(target.repository)) throw new Error('Duplicate sync target: ' + target.repository);
    seen.add(target.repository);
  }
  return config.targets;
}

function usage() {
  console.log('Usage: node scripts/sync-repositories.mjs [--target owner/repo] [--dry-run]');
}

async function syncRepository(target, { dryRun }) {
  const slug = target.repository.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const workdir = path.join(os.tmpdir(), 'mac-enabler-sync', slug);
  await rm(workdir, { recursive: true, force: true });
  await mkdir(path.dirname(workdir), { recursive: true });

  console.log('\\n=== ' + target.repository + ' (' + target.role + ') ===');
  await run('gh', [
    'repo', 'clone', target.repository, workdir,
    '--', '--branch', target.base_branch, '--depth', '1'
  ]);

  await run('git', [
    'fetch', 'origin',
    'refs/heads/' + target.sync_branch + ':refs/remotes/origin/' + target.sync_branch
  ], { cwd: workdir, allowFailure: true });

  const branchRef = 'origin/' + target.base_branch;
  await run('git', ['switch', '--create', target.sync_branch, branchRef], { cwd: workdir });

  const result = await syncTarget(workdir);
  if (!result.changed) {
    console.log('No mac-enabler changes for ' + target.repository + '.');
    return { repository: target.repository, changed: false, pull_request: null };
  }

  if (dryRun) {
    console.log('Dry run: would update ' + result.changed_paths.join(', ') + '.');
    return { repository: target.repository, changed: true, dry_run: true, pull_request: null };
  }

  await run('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: workdir });
  await run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { cwd: workdir });
  await run('git', ['add', 'AGENTS.md', '.codex/mac-enabler'], { cwd: workdir });
  await run('git', [
    'commit', '-m', 'chore(mac-enabler): sync shared Codex layer'
  ], { cwd: workdir });
  await run('git', [
    'push', '--force-with-lease', 'origin',
    'HEAD:refs/heads/' + target.sync_branch
  ], { cwd: workdir });

  const existing = await run('gh', [
    'pr', 'list',
    '--repo', target.repository,
    '--head', target.sync_branch,
    '--base', target.base_branch,
    '--state', 'open',
    '--json', 'number,url',
    '--limit', '1',
    '--jq', '.[0].url // empty'
  ]);
  const pullRequestUrl = existing.stdout.trim();
  if (pullRequestUrl) {
    console.log('Updated existing PR: ' + pullRequestUrl);
    return { repository: target.repository, changed: true, pull_request: pullRequestUrl };
  }

  const body = [
    '## 目的',
    '',
    'mac-enablerの共通Codex運用レイヤーを同期する。',
    '',
    '- Source: https://github.com/kdob1042/mac-enabler',
    '- Role: ' + target.role,
    '- Changed paths: ' + result.changed_paths.join(', '),
    '',
    'このPRは自動同期で作成されました。プロジェクト固有のファイルとルールは変更していません。'
  ].join('\\n');
  const created = await run('gh', [
    'pr', 'create',
    '--repo', target.repository,
    '--base', target.base_branch,
    '--head', target.sync_branch,
    '--title', 'chore: sync mac-enabler shared Codex layer',
    '--body', body
  ]);
  return {
    repository: target.repository,
    changed: true,
    pull_request: created.stdout.trim()
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const targets = await loadConfig();
  const selected = options.target
    ? targets.filter((target) => target.repository === options.target)
    : targets;
  if (selected.length === 0) {
    throw new Error('Unknown sync target: ' + options.target);
  }

  if (!options.dryRun && !process.env.GH_TOKEN) {
    throw new Error('GH_TOKEN is required for repository clone, push, and PR creation.');
  }

  const results = [];
  for (const target of selected) {
    results.push(await syncRepository(target, options));
  }
  console.log(JSON.stringify({ results }, null, 2));
}

export { loadConfig, parseArgs, syncRepository };

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
