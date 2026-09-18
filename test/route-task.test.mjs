import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRoutingConfig, routeTask } from '../scripts/route-task.mjs';

const config = await loadRoutingConfig();

test('architecture work routes to astra light', () => {
  const result = routeTask('全体設計を見直す', config);
  assert.equal(result.route, 'architecture');
  assert.equal(result.profile, 'astra_light');
  assert.equal(result.binding_profile, 'astra_light');
});

test('simple status work routes to luna max', () => {
  const result = routeTask('Issueの状態を一覧化する', config);
  assert.equal(result.route, 'triage');
  assert.equal(result.profile, 'luna_max');
  assert.equal(result.binding_profile, 'luna_max');
});

test('dangerous terms elevate the profile', () => {
  const result = routeTask('本番データを削除する', config);
  assert.equal(result.profile, 'astra_light');
  assert.ok(result.elevated_by.includes('data-loss-or-production'));
});

test('source analysis stays on luna max', () => {
  const result = routeTask('既存ソースとの関係と変更箇所を解析する', config, 'source_analysis');
  assert.equal(result.route, 'source-analysis');
  assert.equal(result.profile, 'luna_max');
});

test('implementation difficulty can elevate to astra light after compaction', () => {
  const result = routeTask('難しい実装を行う', config, 'implementation');
  assert.equal(result.route, 'complex-implementation');
  assert.equal(result.profile, 'astra_light');
});
