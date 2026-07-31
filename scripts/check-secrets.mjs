import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('..', import.meta.url));
const git = spawnSync('git', ['ls-files', '-z'], {
  cwd: repository,
  encoding: 'utf8',
});
if (git.status !== 0) {
  console.error('Could not enumerate tracked files for secret scanning.');
  process.exit(1);
}

const ignoredExtensions = new Set([
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.ogg',
  '.png',
  '.ttf',
  '.wav',
  '.woff',
  '.woff2',
]);
const signatures = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{30,}\b/],
  ['OpenAI key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['Sentry auth token', /\bsntrys_[A-Za-z0-9_-]{20,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
];

const findings = [];
for (const relativePath of git.stdout.split('\0').filter(Boolean)) {
  if (ignoredExtensions.has(extname(relativePath).toLowerCase())) continue;
  const absolutePath = resolve(repository, relativePath);
  if (statSync(absolutePath).size > 2 * 1024 * 1024) continue;
  const content = readFileSync(absolutePath, 'utf8');
  for (const [name, pattern] of signatures) {
    const match = content.match(pattern);
    if (!match || match.index === undefined) continue;
    const line = content.slice(0, match.index).split(/\r?\n/).length;
    findings.push(`${relativePath}:${line} (${name})`);
  }
}

if (findings.length) {
  console.error('Potential committed secrets detected:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log('Tracked-file secret scan passed.');
