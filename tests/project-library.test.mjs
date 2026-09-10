import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

function runPowerShell(expression) {
  return execFileSync(
    'pwsh',
    ['-NoProfile', '-Command', `. './hooks/project-library.ps1'; ${expression}`],
    { cwd: process.cwd(), encoding: 'utf8' },
  ).trim();
}

test('keeps a leading dot in repository paths', () => {
  assert.equal(runPowerShell("Normalize-ProjectRepositoryPath './.github/'"), '.github');
  assert.equal(
    runPowerShell("Test-ProjectPathOverlap '.github/workflows/branch-flow.yml' 'github'"),
    'False',
  );
});

test('includes .github in the v2 owned-scope digest', () => {
  const githubDigest = runPowerShell(
    "Get-GitScopeDigest (Get-Location).Path 'HEAD' @('.github') -Version 2",
  );

  assert.match(githubDigest, /^[A-F0-9]{64}$/);
  assert.notEqual(githubDigest, 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855');
});
