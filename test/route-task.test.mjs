import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRoutingConfig, routeTask } from '../scripts/route-task.mjs';

const config = await loadRoutingConfig();

test('architecture work routes to max', () => {
  const result = routeTask('全体設計を見直す', config);
  assert.equal(result.route, 'architecture');
  assert.equal(result.profile, 'max');
  assert.equal(result.binding_profile, 'deep');
});

test('simple status work routes to cheap', () => {
  const result = routeTask('Issueの状態を一覧化する', config);
  assert.equal(result.route, 'triage');
  assert.equal(result.profile, 'cheap');
  assert.equal(result.binding_profile, 'cheap');
});

test('dangerous terms elevate the profile', () => {
  const result = routeTask('本番データを削除する', config);
  assert.ok(['strong', 'max'].includes(result.profile));
  assert.ok(result.elevated_by.includes('data-loss-or-production'));
});
