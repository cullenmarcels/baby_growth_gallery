import { pathToFileURL } from 'node:url';

const governedFlows = new Map([
  ['develop', /^feature\/[a-z0-9]+(?:-[a-z0-9]+)*$/],
  ['release', /^develop$/],
  ['master', /^release$/],
  ['main', /^master$/],
]);

export function validateBranchFlow(baseRef, headRef) {
  const base = baseRef?.trim();
  const head = headRef?.trim();

  if (!base || !head) {
    return { ok: false, message: 'PR_BASE_REF and PR_HEAD_REF are required.' };
  }

  const allowedHead = governedFlows.get(base);
  if (!allowedHead) {
    return { ok: false, message: `Unsupported governed base branch: ${base}.` };
  }

  if (!allowedHead.test(head)) {
    return {
      ok: false,
      message: `Invalid branch promotion: ${head} -> ${base}.`,
    };
  }

  return { ok: true, message: `Valid branch promotion: ${head} -> ${base}.` };
}

function runCli() {
  const baseRef = process.env.PR_BASE_REF ?? process.argv[2];
  const headRef = process.env.PR_HEAD_REF ?? process.argv[3];
  const result = validateBranchFlow(baseRef, headRef);

  console.log(result.message);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
