import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'runtime', 'cursor', 'cli-config.json');

function resolveCursorConfigDir(value = '') {
  const configured = value || process.env.CURSOR_CONFIG_DIR
    || (process.platform === 'linux' && process.env.XDG_CONFIG_HOME
      ? path.join(process.env.XDG_CONFIG_HOME, 'cursor')
      : path.join(os.homedir(), '.cursor'));
  return path.resolve(configured);
}

function parseArgs(args) {
  const options = {
    check: false,
    cursorConfigDir: resolveCursorConfigDir(),
    force: false,
    help: false,
    install: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--check') options.check = true;
    else if (arg === '--cursor-config-dir') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--cursor-config-dir requires a path.');
      options.cursorConfigDir = resolveCursorConfigDir(value);
      index += 1;
    } else if (arg === '--force') options.force = true;
    else if (arg === '--help') options.help = true;
    else if (arg === '--install') options.install = true;
    else throw new Error('Unknown argument: ' + arg);
  }

  if (options.check && options.install) {
    throw new Error('Use either --check or --install, not both.');
  }
  return options;
}

function usage() {
  console.log('Usage: npm run cursor:setup -- --install [--force] [--cursor-config-dir PATH]');
  console.log('       npm run cursor:setup -- --check [--cursor-config-dir PATH]');
  console.log('');
  console.log('Install or check the managed Cursor CLI settings without replacing unrelated user settings.');
}

async function readSourceConfig() {
  const source = JSON.parse(await readFile(SOURCE_PATH, 'utf8'));
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Cursor source configuration must be a JSON object.');
  }
  return source;
}

async function readExisting(configPath) {
  try {
    const text = await readFile(configPath, 'utf8');
    let config;
    try {
      config = JSON.parse(text);
    } catch {
      throw new Error('Existing Cursor config is not valid JSON: ' + configPath);
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Existing Cursor config must be a JSON object: ' + configPath);
    }
    return { config, present: true, text };
  } catch (error) {
    if (error.code === 'ENOENT') return { config: null, present: false, text: null };
    throw error;
  }
}

function list(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('Cursor config field must be a string array: ' + field);
  }
  return value;
}

function unique(values) {
  return [...new Set(values)];
}

function mergeConfig(current, managed) {
  const currentEditor = current.editor && typeof current.editor === 'object' ? current.editor : {};
  const currentPermissions = current.permissions && typeof current.permissions === 'object'
    ? current.permissions
    : {};
  const managedPermissions = managed.permissions && typeof managed.permissions === 'object'
    ? managed.permissions
    : {};

  const next = { ...current };
  for (const key of ['version', 'approvalMode', 'notifications', 'hints', 'rewind', 'suggestNextPrompt']) {
    if (managed[key] !== undefined) next[key] = managed[key];
  }
  if (managed.editor) next.editor = { ...currentEditor, ...managed.editor };
  if (managed.permissions) {
    next.permissions = {
      ...currentPermissions,
      allow: unique([...list(currentPermissions.allow, 'permissions.allow'), ...list(managedPermissions.allow, 'permissions.allow')]),
      deny: unique([...list(currentPermissions.deny, 'permissions.deny'), ...list(managedPermissions.deny, 'permissions.deny')])
    };
  }
  return next;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function equal(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

async function configPlan(cursorConfigDir) {
  const destination = resolveCursorConfigDir(cursorConfigDir);
  const configPath = path.join(destination, 'cli-config.json');
  const managed = await readSourceConfig();
  const existing = await readExisting(configPath);
  if (!existing.present) return [{ action: 'create', destination: configPath }];
  const desired = mergeConfig(existing.config, managed);
  return [{
    action: equal(existing.config, desired) ? 'unchanged' : 'exists',
    destination: configPath
  }];
}

function backupName(configPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return configPath + '.bak-' + timestamp;
}

export async function installCursor({ cursorConfigDir, force = false } = {}) {
  const destination = resolveCursorConfigDir(cursorConfigDir);
  const configPath = path.join(destination, 'cli-config.json');
  const managed = await readSourceConfig();
  const existing = await readExisting(configPath);
  const desired = mergeConfig(existing.config || {}, managed);

  if (existing.present && equal(existing.config, desired)) {
    return { cursor_config_dir: destination, results: [{ action: 'unchanged', destination: configPath }] };
  }
  if (existing.present && !force) {
    return {
      cursor_config_dir: destination,
      results: [{
        action: 'skipped-existing',
        destination: configPath,
        reason: 'Use --force to merge the managed settings. Existing unrelated fields are preserved.'
      }]
    };
  }

  const backup = existing.present ? backupName(configPath) : null;
  await mkdir(destination, { recursive: true });
  if (backup) await copyFile(configPath, backup);
  await writeFile(configPath, JSON.stringify(desired, null, 2) + '\n', 'utf8');

  return {
    cursor_config_dir: destination,
    results: [{ action: 'installed', destination: configPath, backup }]
  };
}

export { configPlan, parseArgs, resolveCursorConfigDir };

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || (!options.check && !options.install)) {
    usage();
    if (!options.help) process.exitCode = 1;
    return;
  }

  if (options.check) {
    const plan = await configPlan(options.cursorConfigDir);
    console.log(JSON.stringify({ cursor_config_dir: options.cursorConfigDir, plan }, null, 2));
    if (plan.some((entry) => entry.action !== 'unchanged')) process.exitCode = 1;
    return;
  }

  const result = await installCursor(options);
  console.log(JSON.stringify(result, null, 2));
  console.log('Next: authenticate Cursor CLI if needed, then use /model to choose the model.');
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
