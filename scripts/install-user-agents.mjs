import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'templates', 'user-agents-block.md');
const START = '<!-- MAC-ENABLER-USER:BEGIN -->';
const END = '<!-- MAC-ENABLER-USER:END -->';

export function resolveCodexHome(value = '') {
  return path.resolve(value || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
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

function backupName(destinationPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return destinationPath + '.bak-' + timestamp;
}

export function mergeManagedBlock(current, block) {
  const start = current.indexOf(START);
  const end = current.indexOf(END);

  if ((start === -1) !== (end === -1)) {
    throw new Error('Existing AGENTS.md has only one mac-enabler user marker; repair it before continuing.');
  }

  const cleanBlock = block.trim() + '\n';
  if (start === -1) {
    if (!current.trim()) return cleanBlock;
    return current.trimEnd() + '\n\n' + cleanBlock;
  }

  if (end < start) {
    throw new Error('Existing mac-enabler user markers are in the wrong order.');
  }

  const after = end + END.length;
  return current.slice(0, start) + cleanBlock.trimEnd() + current.slice(after);
}

export async function planUserAgents(codexHome) {
  const destinationDir = resolveCodexHome(codexHome);
  const destination = path.join(destinationDir, 'AGENTS.md');
  const block = await readFile(SOURCE, 'utf8');
  const present = await exists(destination);
  const current = present ? await readFile(destination, 'utf8') : '';
  const merged = mergeManagedBlock(current, block);

  return {
    destination,
    action: !present ? 'create' : current === merged ? 'unchanged' : 'update'
  };
}

export async function installUserAgents({ codexHome, dryRun = false } = {}) {
  const destinationDir = resolveCodexHome(codexHome);
  const destination = path.join(destinationDir, 'AGENTS.md');
  const block = await readFile(SOURCE, 'utf8');
  const present = await exists(destination);
  const current = present ? await readFile(destination, 'utf8') : '';
  const merged = mergeManagedBlock(current, block);

  if (current === merged) {
    return { destination, action: 'unchanged', backup: null };
  }

  const backup = present ? backupName(destination) : null;
  if (!dryRun) {
    await mkdir(destinationDir, { recursive: true });
    if (backup) await copyFile(destination, backup);
    await writeFile(destination, merged, 'utf8');
  }

  return {
    destination,
    action: dryRun ? (!present ? 'would-create' : 'would-update') : (!present ? 'created' : 'updated'),
    backup
  };
}

function parseArgs(args) {
  const options = {
    check: false,
    codexHome: resolveCodexHome(),
    install: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--check') options.check = true;
    else if (arg === '--install') options.install = true;
    else if (arg === '--codex-home') {
      options.codexHome = resolveCodexHome(args[index + 1] || '');
      index += 1;
    } else if (arg === '--help') options.help = true;
    else throw new Error('Unknown argument: ' + arg);
  }

  if (options.check && options.install) {
    throw new Error('Use either --check or --install, not both.');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || (!options.check && !options.install)) {
    console.log('Usage: node scripts/install-user-agents.mjs --install [--codex-home PATH]');
    console.log('       node scripts/install-user-agents.mjs --check [--codex-home PATH]');
    if (!options.help) process.exitCode = 1;
    return;
  }

  if (options.check) {
    const plan = await planUserAgents(options.codexHome);
    console.log(JSON.stringify(plan, null, 2));
    if (plan.action !== 'unchanged') process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(await installUserAgents(options), null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
