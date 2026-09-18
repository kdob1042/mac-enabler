import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  installProfiles,
  planProfiles,
  resolveCodexHome
} from './install-codex-profiles.mjs';

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
    if (arg === '--check') {
      options.check = true;
    } else if (arg === '--codex-home') {
      options.codexHome = resolveCodexHome(args[index + 1] || '');
      index += 1;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--help') {
      options.help = true;
    } else if (arg === '--install') {
      options.install = true;
    } else {
      throw new Error('Unknown argument: ' + arg);
    }
  }

  if (options.check && options.install) {
    throw new Error('Use either --check or --install, not both.');
  }

  return options;
}

function usage() {
  console.log('Usage: npm run codex:setup -- --install [--force] [--codex-home PATH]');
  console.log('       npm run codex:setup -- --check [--codex-home PATH]');
  console.log('');
  console.log('Install or check only the two mac-enabler Codex profiles: astra_light and luna_max.');
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
    const plan = await planProfiles(options.codexHome);
    console.log(JSON.stringify({ codex_home: options.codexHome, plan }, null, 2));
    if (plan.some((entry) => entry.action !== 'unchanged')) process.exitCode = 1;
    return;
  }

  const result = await installProfiles(options);
  console.log(JSON.stringify(result, null, 2));
  console.log('Next: use `codex --profile astra_light` or `codex --profile luna_max`.');
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
