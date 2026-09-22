import { spawnSync } from 'node:child_process';
import { planProfiles, resolveCodexHome } from './install-codex-profiles.mjs';
import { planUserAgents } from './install-user-agents.mjs';

function probe(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) {
    return { ok: false, detail: result.error.code === 'ENOENT' ? 'not found' : result.error.message };
  }
  return {
    ok: result.status === 0,
    detail: (result.stdout || result.stderr || '').trim().split('\n')[0] || 'available'
  };
}

const codexHome = resolveCodexHome();
const profiles = await planProfiles(codexHome);
const userAgents = await planUserAgents(codexHome);

const result = {
  platform: process.platform,
  codex_home: codexHome,
  commands: {
    node: probe('node'),
    git: probe('git'),
    gh: probe('gh'),
    codex: probe('codex')
  },
  profiles,
  user_agents: userAgents,
  remote: {
    automated_check: false,
    note: 'Remote pairing is completed in the Codex app and ChatGPT mobile app; this script does not enable or inspect account-level Remote state.'
  }
};

console.log(JSON.stringify(result, null, 2));

const requiredMissing = !result.commands.node.ok || !result.commands.git.ok || !result.commands.codex.ok;
const configMissing = profiles.some((entry) => entry.action !== 'unchanged') || userAgents.action !== 'unchanged';
if (requiredMissing || configMissing) process.exitCode = 1;
