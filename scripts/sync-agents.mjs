import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BEGIN = '<!-- MAC-ENABLER:BEGIN -->';
const END = '<!-- MAC-ENABLER:END -->';

async function readText(filePath, fallback = '') {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function mergeManagedBlock(existing, block) {
  const normalizedBlock = block.trim();
  const start = existing.indexOf(BEGIN);
  const markerEnd = existing.indexOf(END, start + BEGIN.length);

  if (start >= 0 && markerEnd >= 0) {
    return existing.slice(0, start)
      + normalizedBlock
      + existing.slice(markerEnd + END.length);
  }

  const suffix = existing.trimEnd();
  return suffix
    ? suffix + '\n\n' + normalizedBlock + '\n'
    : normalizedBlock + '\n';
}

async function buildManagedBlock() {
  return readText(path.join(ROOT, 'templates', 'shared-agents-block.md'));
}

export async function syncTarget(targetArg, options = {}) {
  if (!targetArg) throw new Error('A target repository path is required.');
  const target = path.resolve(targetArg);
  const targetStat = await stat(target);
  if (!targetStat.isDirectory()) throw new Error('Target must be a directory: ' + target);

  const block = await buildManagedBlock();
  const currentAgents = await readText(path.join(target, 'AGENTS.md'));
  const expected = {
    'AGENTS.md': mergeManagedBlock(currentAgents, block)
  };

  const changes = [];
  for (const [relativePath, content] of Object.entries(expected)) {
    const destination = path.join(target, relativePath);
    const current = await readText(destination, null);
    if (current !== content) changes.push(relativePath);
  }

  if (!options.check) {
    for (const [relativePath, content] of Object.entries(expected)) {
      const destination = path.join(target, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      if (changes.includes(relativePath)) {
        await writeFile(destination, content, 'utf8');
      }
    }
  }

  return {
    target,
    check: Boolean(options.check),
    changed: changes.length > 0,
    changed_paths: changes
  };
}

function parseArgs(args) {
  let target = null;
  let check = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--target') {
      target = args[index + 1];
      index += 1;
    } else if (arg === '--check') {
      check = true;
    } else if (arg === '--help') {
      return { help: true };
    }
  }
  return { target, check };
}

function usage() {
  console.log('Usage: node scripts/sync-agents.mjs --target ../target-repository [--check]');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.target) {
    usage();
    if (!options.help) process.exitCode = 1;
    return;
  }

  const result = await syncTarget(options.target, options);
  console.log(JSON.stringify(result, null, 2));
  if (options.check && result.changed) process.exitCode = 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
