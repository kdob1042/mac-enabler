import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'runtime', 'profiles');

function resolveCodexHome(value = '') {
  return path.resolve(value || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
}

function parseArgs(args) {
  const options = {
    codexHome: resolveCodexHome(),
    force: false,
    install: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--codex-home') {
      options.codexHome = resolveCodexHome(args[index + 1] || '');
      index += 1;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--install') {
      options.install = true;
    } else if (arg === '--help') {
      options.help = true;
    } else {
      throw new Error('Unknown argument: ' + arg);
    }
  }

  return options;
}

async function sourceProfiles() {
  const names = (await readdir(SOURCE_DIR))
    .filter((name) => name.endsWith('.config.toml'))
    .sort();

  return Promise.all(names.map(async (name) => ({
    name,
    content: await readFile(path.join(SOURCE_DIR, name), 'utf8')
  })));
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function planProfiles(codexHome) {
  const destination = resolveCodexHome(codexHome);
  const profiles = await sourceProfiles();
  const plan = [];

  for (const profile of profiles) {
    const destinationPath = path.join(destination, profile.name);
    const present = await exists(destinationPath);
    const current = present ? await readFile(destinationPath, 'utf8') : null;
    plan.push({
      name: profile.name,
      destination: destinationPath,
      action: current === profile.content ? 'unchanged' : present ? 'exists' : 'create'
    });
  }

  return plan;
}

function backupName(destinationPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return destinationPath + '.bak-' + timestamp;
}

export async function installProfiles({ codexHome, force = false, dryRun = false } = {}) {
  const destination = resolveCodexHome(codexHome);
  const profiles = await sourceProfiles();
  const results = [];

  if (!dryRun) await mkdir(destination, { recursive: true });

  for (const profile of profiles) {
    const destinationPath = path.join(destination, profile.name);
    const present = await exists(destinationPath);
    const current = present ? await readFile(destinationPath, 'utf8') : null;

    if (current === profile.content) {
      results.push({ name: profile.name, action: 'unchanged', destination: destinationPath });
      continue;
    }

    if (present && !force) {
      results.push({
        name: profile.name,
        action: 'skipped-existing',
        destination: destinationPath,
        reason: 'Use --force to replace it.'
      });
      continue;
    }

    const backup = present ? backupName(destinationPath) : null;
    if (!dryRun) {
      if (backup) await copyFile(destinationPath, backup);
      await copyFile(path.join(SOURCE_DIR, profile.name), destinationPath);
    }

    results.push({
      name: profile.name,
      action: dryRun ? 'would-install' : 'installed',
      destination: destinationPath,
      backup
    });
  }

  return { codex_home: destination, results };
}

function usage() {
  console.log('Usage: node scripts/install-codex-profiles.mjs --install [--force] [--codex-home PATH]');
  console.log('       node scripts/install-codex-profiles.mjs --install --codex-home PATH');
  console.log('');
  console.log('Only profile-name.config.toml files are installed. config.toml, auth, history, logs, and caches are not touched.');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.install) {
    usage();
    if (!options.help) process.exitCode = 1;
    return;
  }

  const result = await installProfiles(options);
  console.log(JSON.stringify(result, null, 2));
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
