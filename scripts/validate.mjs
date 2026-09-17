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
const template = await readFile(path.join(ROOT, 'templates', 'shared-agents-block.md'), 'utf8');

assert(routing.version === 1, 'Unexpected routing version.');
assert(workflow.version === 1, 'Unexpected workflow version.');
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
