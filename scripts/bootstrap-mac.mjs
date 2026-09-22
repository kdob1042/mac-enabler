import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installProfiles, planProfiles, resolveCodexHome } from './install-codex-profiles.mjs';
import { installUserAgents, planUserAgents } from './install-user-agents.mjs';

function parseArgs(args) {
  const options = {
    check: false,
    codexHome: resolveCodexHome(),
    force: false,
    help: false,
    install: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--check') options.check = true;
    else if (arg === '--install') options.install = true;
    else if (arg === '--force') options.force = true;
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

function usage() {
  console.log('Usage: npm run mac:bootstrap -- --install [--force] [--codex-home PATH]');
  console.log('       npm run mac:bootstrap -- --check [--codex-home PATH]');
  console.log('');
  console.log('Installs Codex profiles and the managed user-level AGENTS block.');
}

export { parseArgs };

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || (!options.check && !options.install)) {
    usage();
    if (!options.help) process.exitCode = 1;
    return;
  }

  if (options.check) {
    const profiles = await planProfiles(options.codexHome);
    const userAgents = await planUserAgents(options.codexHome);
    const result = { codex_home: options.codexHome, profiles, user_agents: userAgents };
    console.log(JSON.stringify(result, null, 2));
    if (profiles.some((entry) => entry.action !== 'unchanged') || userAgents.action !== 'unchanged') {
      process.exitCode = 1;
    }
    return;
  }

  const profiles = await installProfiles(options);
  const userAgents = await installUserAgents(options);
  console.log(JSON.stringify({ codex_home: options.codexHome, profiles, user_agents: userAgents }, null, 2));
  console.log('');
  console.log('Next:');
  console.log('  1. Run: npm run doctor');
  console.log('  2. Start Codex with: codex --profile luna_max');
  console.log('  3. In the Codex app, enable Remote and pair the ChatGPT mobile app with the displayed QR code.');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
