import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('..', import.meta.url));
const baseline = JSON.parse(
  readFileSync(new URL('../security-audit-baseline.json', import.meta.url), 'utf8'),
);
const auditInvocation = process.env.npm_execpath
  ? {
      command: process.execPath,
      args: [process.env.npm_execpath, 'audit', '--omit=dev', '--json'],
    }
  : process.platform === 'win32'
    ? {
        command: process.env.ComSpec ?? 'cmd.exe',
        args: ['/d', '/s', '/c', 'npm audit --omit=dev --json'],
      }
    : { command: 'npm', args: ['audit', '--omit=dev', '--json'] };
const audit = spawnSync(auditInvocation.command, auditInvocation.args, {
  cwd: repository,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (!audit.stdout?.trim()) {
  console.error('Security audit produced no JSON. Failing closed.');
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error('Security audit returned invalid JSON. Failing closed.');
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities;
if (!counts) {
  console.error('Security audit metadata is missing. Failing closed.');
  process.exit(1);
}

const failures = [];
const today = new Date().toISOString().slice(0, 10);
if (today > baseline.expiresOn) {
  failures.push(
    `Accepted-risk review expired on ${baseline.expiresOn}; update the dependency decision.`,
  );
}

for (const [severity, maximum] of Object.entries(baseline.maximumVulnerablePackages)) {
  const actual = counts[severity] ?? 0;
  if (actual > maximum) {
    failures.push(`${severity} vulnerable package count grew from ${maximum} to ${actual}.`);
  }
}

const advisorySources = new Set();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via ?? []) {
    if (typeof via === 'object' && via && Number.isSafeInteger(via.source)) {
      advisorySources.add(via.source);
    }
  }
}
const accepted = new Set(baseline.acceptedAdvisorySources);
for (const source of advisorySources) {
  if (!accepted.has(source)) failures.push(`Unreviewed npm advisory source ${source} detected.`);
}
if ((counts.critical ?? 0) > 0) {
  failures.push('Critical production dependency findings are never accepted.');
}

if (failures.length) {
  console.error('Production dependency security gate failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(`Tracking: ${baseline.trackingIssue}`);
  process.exit(1);
}

console.log(
  `Security baseline accepted: ${counts.total} affected package paths, ` +
    `${advisorySources.size} reviewed advisories, 0 critical. Review expires ${baseline.expiresOn}.`,
);
