import assert from 'node:assert/strict';
import test from 'node:test';
import { validateBranchFlow } from '../hooks/validate-branch-flow.mjs';

const allowed = [
  ['develop', 'feature/auth-session'],
  ['develop', 'feature/photo-upload'],
  ['release', 'develop'],
  ['master', 'release'],
  ['main', 'master'],
];

const denied = [
  ['main', 'feature/auth-session'],
  ['main', 'develop'],
  ['main', 'release'],
  ['master', 'develop'],
  ['release', 'feature/photo-upload'],
  ['develop', 'bugfix/no-feature-prefix'],
  ['develop', 'feature/Invalid_Name'],
  ['unknown', 'feature/auth-session'],
  ['', 'feature/auth-session'],
  ['develop', ''],
];

test('accepts every configured promotion path', () => {
  for (const [base, head] of allowed) {
    assert.equal(validateBranchFlow(base, head).ok, true, `${head} -> ${base}`);
  }
});

test('rejects bypasses and invalid feature names', () => {
  for (const [base, head] of denied) {
    assert.equal(validateBranchFlow(base, head).ok, false, `${head} -> ${base}`);
  }
});
