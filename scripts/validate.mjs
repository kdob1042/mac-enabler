import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRoutingConfig, routeTask } from './route-task.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routing = await loadRoutingConfig();
const workflow = await readJson('config/workflow.json');
const syncTargets = await readJson('.github/sync-targets.json');
const template = await readFile(path.join(ROOT, 'templates', 'shared-agents-block.md'), 'utf8');

assert(routing.version === 1, 'Unexpected routing version.');
assert(workflow.version === 1, 'Unexpected workflow version.');
assert(syncTargets.version === 1, 'Unexpected sync target version.');
assert(Array.isArray(syncTargets.targets) && syncTargets.targets.length > 0, 'No sync targets configured.');

const repositories = new Set();
for (const target of syncTargets.targets) {
  assert(
    target.repository && target.base_branch && target.sync_branch,
    'Every sync target needs repository, base_branch, and sync_branch.'
  );
  assert(!repositories.has(target.repository), 'Duplicate sync target: ' + target.repository);
  repositories.add(target.repository);
}

assert(new Set(routing.profile_order).size === routing.profile_order.length, 'Duplicate profiles.');
for (const route of routing.routes) {
  assert(routing.profiles[route.profile], 'Unknown route profile: ' + route.id);
}
assert(template.includes('<!-- MAC-ENABLER:BEGIN -->'), 'Missing managed block start.');
assert(template.includes('<!-- MAC-ENABLER:END -->'), 'Missing managed block end.');
assert(workflow.compact_protocol.required_packet_fields.includes('next_action'), 'Missing next_action field.');

const architecture = routeTask('全体設計を見直して実装方針を決める', routing);
assert(architecture.route === 'architecture' && architecture.profile === 'max', 'Architecture route failed.');

const dangerous = routeTask('本番データを削除する移行を実装する', routing);
assert(dangerous.profile === 'strong' || dangerous.profile === 'max', 'Guardrail elevation failed.');

console.log('mac-enabler validation passed.');
