import {
  copyFile,
  mkdir,
  readFile,
  stat,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BEGIN = '<!-- MAC-ENABLER:CURSOR-CLOUD:BEGIN -->';
const END = '<!-- MAC-ENABLER:CURSOR-CLOUD:END -->';

function parseArgs(args) {
  const options = {
    check: false,
    force: false,
    help: false,
    install: false,
    installCommand: null,
    startCommand: null,
    target: null,
    terminals: [],
    testCommand: null
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--check') options.check = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--help') options.help = true;
    else if (arg === '--install') options.install = true;
    else if (arg === '--install-command') {
      options.installCommand = requiredValue(args, ++index, '--install-command');
    } else if (arg === '--start-command') {
      options.startCommand = requiredValue(args, ++index, '--start-command');
    } else if (arg === '--target') {
      options.target = requiredValue(args, ++index, '--target');
    } else if (arg === '--terminal') {
      options.terminals.push(parseTerminal(requiredValue(args, ++index, '--terminal')));
    } else if (arg === '--test-command') {
      options.testCommand = requiredValue(args, ++index, '--test-command');
    } else {
      throw new Error('Unknown argument: ' + arg);
    }
  }

  if (options.check && options.install) {
    throw new Error('Use either --check or --install, not both.');
  }
  if (!options.check && !options.install && !options.help) {
    throw new Error('Choose --check or --install.');
  }
  if (options.install && !options.target) {
    throw new Error('--target is required for --install.');
  }
  if (options.install && !options.installCommand) {
    throw new Error('--install-command is required for --install.');
  }
  if (options.install && !options.testCommand) {
    throw new Error('--test-command is required for --install.');
  }
  return options;
}

function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new Error(flag + ' requires a value.');
  return value;
}

function parseTerminal(value) {
  const separator = value.indexOf('=');
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error('--terminal must use NAME=COMMAND.');
  }
  return {
    name: validateInline(value.slice(0, separator), '--terminal name'),
    command: validateCommand(value.slice(separator + 1), '--terminal command')
  };
}

function validateInline(value, field) {
  if (!value || /[\r\n`]/.test(value)) throw new Error(field + ' contains an unsupported character.');
  return value;
}

function validateCommand(value, field) {
  return validateInline(value.trim(), field);
}

function usage() {
  console.log('Usage: npm run cursor:project -- --install --target PATH --install-command CMD --test-command CMD [options]');
  console.log('       npm run cursor:project -- --check --target PATH');
  console.log('');
  console.log('Options:');
  console.log('  --start-command CMD       Start a long-running service after a Cloud build.');
  console.log('  --terminal NAME=CMD       Start a persistent terminal (repeatable).');
  console.log('  --force                   Replace managed files after creating backups.');
  console.log('');
  console.log('This command writes only .cursor/environment.json and a marked Cursor Cloud block in AGENTS.md.');
}

function resolveTarget(targetArg) {
  if (!targetArg) throw new Error('A target repository path is required.');
  return path.resolve(targetArg);
}

async function assertDirectory(target) {
  const targetStat = await stat(target);
  if (!targetStat.isDirectory()) throw new Error('Target must be a directory: ' + target);
}

function assertNoSecrets(value, field) {
  if (/\b(api[_-]?key|secret|token|password|private[_-]?key)\s*=/i.test(value)) {
    throw new Error(field + ' must reference Cursor Secrets or an environment variable, not a credential value.');
  }
}

function buildEnvironment(options) {
  const environment = {
    install: validateCommand(options.installCommand, '--install-command')
  };
  assertNoSecrets(environment.install, '--install-command');

  if (options.startCommand) {
    environment.start = validateCommand(options.startCommand, '--start-command');
    assertNoSecrets(environment.start, '--start-command');
  }
  if (options.terminals.length > 0) {
    environment.terminals = options.terminals.map((terminal) => {
      assertNoSecrets(terminal.command, '--terminal command');
      return { ...terminal };
    });
  }
  return environment;
}

function buildAgentsBlock(options, environment) {
  const lines = [
    BEGIN,
    '## Cursor Cloud specific instructions',
    '',
    '- `.cursor/environment.json` is the project-owned Cloud Agent environment.',
    '- The install command is idempotent and runs before each Cloud build: `' + environment.install + '`.'
  ];
  if (environment.start) lines.push('- The startup command is: `' + environment.start + '`.');
  if (environment.terminals) {
    for (const terminal of environment.terminals) {
      lines.push('- Persistent terminal `' + terminal.name + '`: `' + terminal.command + '`.');
    }
  }
  lines.push(
    '- The required project verification command is: `' + options.testCommand + '`.',
    '- Store credentials in Cursor Cloud Secrets or the project environment; never commit secret values.',
    '- Keep the project branch → PR → main workflow and record unrun checks in the PR.',
    END
  );
  return lines.join('\n');
}

function mergeAgentsBlock(existing, block) {
  const start = existing.indexOf(BEGIN);
  const markerEnd = existing.indexOf(END, start + BEGIN.length);
  if (start >= 0 && markerEnd >= 0) {
    return existing.slice(0, start) + block + existing.slice(markerEnd + END.length);
  }
  const suffix = existing.trimEnd();
  return suffix ? suffix + '\n\n' + block + '\n' : block + '\n';
}

async function readOptional(filePath) {
  try {
    return { present: true, text: await readFile(filePath, 'utf8') };
  } catch (error) {
    if (error.code === 'ENOENT') return { present: false, text: '' };
    throw error;
  }
}

function parseJson(text, filePath) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON: ' + filePath);
  }
}

function validateEnvironment(value, filePath) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Cursor environment must be a JSON object: ' + filePath);
  }
  if (value.install !== undefined && typeof value.install !== 'string') {
    throw new Error('Cursor environment install must be a string: ' + filePath);
  }
  if (value.start !== undefined && typeof value.start !== 'string') {
    throw new Error('Cursor environment start must be a string: ' + filePath);
  }
  if (value.terminals !== undefined && (!Array.isArray(value.terminals)
    || value.terminals.some((terminal) => !terminal || typeof terminal !== 'object'
      || typeof terminal.command !== 'string'))) {
    throw new Error('Cursor environment terminals must contain command objects: ' + filePath);
  }
}

function validateHooks(value, filePath) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Cursor hooks must be a JSON object: ' + filePath);
  }
  if (value.version !== 1 || !value.hooks || typeof value.hooks !== 'object' || Array.isArray(value.hooks)) {
    throw new Error('Cursor hooks must contain version 1 and a hooks object: ' + filePath);
  }
  for (const [name, entries] of Object.entries(value.hooks)) {
    if (!Array.isArray(entries) || entries.some((entry) => !entry || typeof entry !== 'object'
      || (typeof entry.command !== 'string' && entry.type !== 'prompt'))) {
      throw new Error('Cursor hook entries are invalid for ' + name + ': ' + filePath);
    }
  }
}

function hasManagedBlock(text) {
  const start = text.indexOf(BEGIN);
  const markerEnd = text.indexOf(END, start + BEGIN.length);
  return start >= 0 && markerEnd >= 0 && markerEnd > start;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function backupName(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return filePath + '.bak-' + timestamp;
}

async function inspectTarget(target, expectedEnvironment = null, expectedAgents = null) {
  const environmentPath = path.join(target, '.cursor', 'environment.json');
  const hooksPath = path.join(target, '.cursor', 'hooks.json');
  const agentsPath = path.join(target, 'AGENTS.md');
  const environment = await readOptional(environmentPath);
  const hooks = await readOptional(hooksPath);
  const agents = await readOptional(agentsPath);
  const files = [];

  if (!environment.present) files.push({ path: '.cursor/environment.json', status: 'missing' });
  else {
    const parsed = parseJson(environment.text, environmentPath);
    validateEnvironment(parsed, environmentPath);
    files.push({
      path: '.cursor/environment.json',
      status: expectedEnvironment && !sameJson(parsed, expectedEnvironment) ? 'different' : 'ok'
    });
  }

  if (hooks.present) {
    validateHooks(parseJson(hooks.text, hooksPath), hooksPath);
    files.push({ path: '.cursor/hooks.json', status: 'ok' });
  }

  if (!agents.present) files.push({ path: 'AGENTS.md', status: 'missing' });
  else {
    const status = expectedAgents
      ? hasManagedBlock(agents.text)
        ? agents.text === expectedAgents ? 'ok' : 'different'
        : 'missing'
      : hasManagedBlock(agents.text) ? 'ok' : 'missing';
    files.push({ path: 'AGENTS.md', status });
  }

  return { target, files };
}

function needsChange(report) {
  return report.files.some((file) => file.status !== 'ok');
}

async function writeFileSafely(filePath, content, force, { appendable = false } = {}) {
  const current = await readOptional(filePath);
  if (current.present && current.text === content) return { action: 'unchanged', path: filePath };
  if (current.present && !force && !(appendable && !hasManagedBlock(current.text))) {
    return {
      action: 'skipped-existing',
      path: filePath,
      reason: 'Use --force to replace the managed content after reviewing the existing file.'
    };
  }
  const backup = current.present ? backupName(filePath) : null;
  await mkdir(path.dirname(filePath), { recursive: true });
  if (backup) await copyFile(filePath, backup);
  await writeFile(filePath, content, 'utf8');
  return { action: 'installed', path: filePath, backup };
}

export async function installCursorProject(options) {
  const target = resolveTarget(options.target);
  await assertDirectory(target);
  const environment = buildEnvironment(options);
  const agentsPath = path.join(target, 'AGENTS.md');
  const currentAgents = await readOptional(agentsPath);
  const expectedAgents = mergeAgentsBlock(
    currentAgents.text,
    buildAgentsBlock(options, environment)
  );
  const environmentPath = path.join(target, '.cursor', 'environment.json');
  const report = await inspectTarget(target, environment, expectedAgents);
  const conflicting = report.files.filter((file) => file.status === 'different');
  if (conflicting.length > 0 && !options.force) {
    return {
      target,
      results: conflicting.map((file) => ({
        action: 'skipped-existing',
        path: path.join(target, file.path),
        reason: 'Use --force to replace the managed content after reviewing the existing file.'
      }))
    };
  }

  const results = [];
  results.push(await writeFileSafely(
    environmentPath,
    JSON.stringify(environment, null, 2) + '\n',
    options.force
  ));
  results.push(await writeFileSafely(agentsPath, expectedAgents, options.force, { appendable: true }));
  return { target, results };
}

export async function checkCursorProject(options) {
  const target = resolveTarget(options.target);
  await assertDirectory(target);
  let expectedEnvironment = null;
  let expectedAgents = null;
  if (options.installCommand && options.testCommand) {
    expectedEnvironment = buildEnvironment(options);
    const currentAgents = await readOptional(path.join(target, 'AGENTS.md'));
    expectedAgents = mergeAgentsBlock(
      currentAgents.text,
      buildAgentsBlock(options, expectedEnvironment)
    );
  }
  const report = await inspectTarget(target, expectedEnvironment, expectedAgents);
  return { ...report, ready: !needsChange(report) };
}

export { BEGIN, END, buildEnvironment, mergeAgentsBlock, parseArgs, validateEnvironment, validateHooks };

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (options.help) {
    usage();
    return;
  }

  const result = options.check
    ? await checkCursorProject(options)
    : await installCursorProject(options);
  console.log(JSON.stringify(result, null, 2));
  if (options.check && !result.ready) process.exitCode = 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
