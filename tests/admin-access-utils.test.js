const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAdminCode, isAllowedAdminOrigin, nextRateLimitState } = require('../js/admin-access-utils');

test('normalizes admin codes deterministically', () => {
  assert.equal(normalizeAdminCode('  gowaily-admin-2026 '), 'GOWAILY-ADMIN-2026');
});

test('allows only Center El Gowaily web origins for the admin gateway', () => {
  assert.equal(isAllowedAdminOrigin('https://elgewaliy-center-4egnh40xd-yousry.vercel.app'), true);
  assert.equal(isAllowedAdminOrigin('https://elgewaliy-center.vercel.app'), true);
  assert.equal(isAllowedAdminOrigin('https://evil.example.com'), false);
  assert.equal(isAllowedAdminOrigin('http://elgewaliy-center.vercel.app'), false);
});

test('rate limiter locks after five failed attempts in one window', () => {
  const first = { failedAttempts: 0, windowStartedAt: 0, lockedUntil: null };
  let state = first;
  for (let i = 1; i <= 5; i++) state = nextRateLimitState(state, false, 1_000);
  assert.equal(state.failedAttempts, 5);
  assert.equal(state.lockedUntil, 901_000);
});

test('successful authentication resets the limiter', () => {
  const state = nextRateLimitState({ failedAttempts: 4, windowStartedAt: 1_000, lockedUntil: null }, true, 5_000);
  assert.deepEqual(state, { failedAttempts: 0, windowStartedAt: 5_000, lockedUntil: null });
});
