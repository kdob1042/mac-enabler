import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'model-routing.json');

export async function loadRoutingConfig() {
  return JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
}

function normalize(value) {
  return String(value).toLocaleLowerCase('ja-JP').replace(/\s+/g, ' ').trim();
}

function matches(task, terms) {
  const normalizedTask = normalize(task);
  return terms.filter((term) => normalizedTask.includes(normalize(term)));
}

function rank(config, profile) {
  const value = config.profile_order.indexOf(profile);
  return value === -1 ? 0 : value;
}

export function routeTask(task, config) {
  const text = String(task ?? '').trim();
  if (!text) {
    throw new Error('A task description is required.');
  }

  const scored = config.routes.map((route, index) => {
    const matched = matches(text, route.keywords);
    return {
      route,
      index,
      matched,
      score: matched.length
    };
  }).filter((entry) => entry.score > 0);

  const fallback = config.routes.find((route) => route.id === config.fallback.route) ?? {
    id: config.fallback.route,
    profile: config.fallback.profile,
    keywords: []
  };

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = scored[0] ?? {
    route: fallback,
    index: Number.MAX_SAFE_INTEGER,
    matched: [],
    score: 0
  };

  const guardrailMatches = config.guardrails.flatMap((guardrail) => {
    const matched = matches(text, guardrail.keywords);
    return matched.length > 0
      ? [{ id: guardrail.id, minimum_profile: guardrail.minimum_profile, matched }]
      : [];
  });

  let profile = selected.route.profile;
  const elevatedBy = [];
  for (const guardrail of guardrailMatches) {
    if (rank(config, profile) < rank(config, guardrail.minimum_profile)) {
      profile = guardrail.minimum_profile;
      elevatedBy.push(guardrail.id);
    }
  }

  const binding = config.bindings[profile] ?? {};
  return {
    version: config.version,
    task: text,
    route: selected.route.id,
    profile,
    route_matches: selected.matched,
    guardrail_matches: guardrailMatches,
    elevated_by: elevatedBy,
    binding_profile: binding.cli_profile ?? null,
    binding_model: binding.model ?? null,
    binding_reasoning_effort: binding.reasoning_effort ?? null,
    binding_env: binding.env ?? null,
    enforcement: config.enforcement
  };
}

function usage() {
  console.log('Usage: node scripts/route-task.mjs [--json] --task "task description"');
  console.log('       node scripts/route-task.mjs --list');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    usage();
    return;
  }

  const config = await loadRoutingConfig();
  if (args.includes('--list')) {
    for (const route of config.routes) {
      console.log(route.id + '\t' + route.profile);
    }
    return;
  }

  const taskIndex = args.indexOf('--task');
  const task = taskIndex >= 0
    ? args.slice(taskIndex + 1).filter((arg) => arg !== '--json').join(' ')
    : args.filter((arg) => arg !== '--json').join(' ');

  const result = routeTask(task, config);
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('route: ' + result.route);
  console.log('profile: ' + result.profile);
  console.log('codex_profile: ' + result.binding_profile);
  console.log('model: ' + result.binding_model);
  console.log('reasoning_effort: ' + result.binding_reasoning_effort);
  if (result.elevated_by.length > 0) {
    console.log('guardrails: ' + result.elevated_by.join(', '));
  }
  console.log('モデル切り替えは呼び出し側／ホスト側で確認する。');
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
