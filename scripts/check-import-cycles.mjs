#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Dairesel import denetimi.
 *
 * Bir zamanlar bu depoda 20 döngü vardı; on sekizi tek bir desenden geliyordu
 * (her ekran rota tiplerini navigatörden alıyor, navigatör de her ekranı içeri
 * alıyordu). Temizlendiler, ama onları geri getirmemenin tek güvencesi bir
 * yorum satırıydı — `verify` zinciri bir döngünün geri geldiğini göremiyordu.
 * Bu betik o boşluğu kapatır ve yeni bağımlılık gerektirmez.
 */

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry))
      out.push(full.replace(/\\/g, '/'));
  }
  return out;
}

/** Göreli bir import belirtecini gerçek dosyaya çözer. */
function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec).replace(/\\/g, '/');
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}.native.ts`,
    `${base}.web.ts`,
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Yorumları ve metin sabitlerini ayıklar. Bunu atlarsak bir yorumun içindeki
 * import yolu gerçek bir kenar sanılır — bu betiği yazarken tam olarak bu oldu.
 */
function stripNonCode(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``');
}

const files = walk(SRC);
for (const extra of ['App.tsx', 'index.js'].map((f) => join(ROOT, f).replace(/\\/g, '/'))) {
  if (existsSync(extra)) files.push(extra);
}

const imports = new Map();
for (const file of files) {
  const source = stripNonCode(readFileSync(file, 'utf8'));
  const specs = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  imports.set(file, [...new Set(specs.map((s) => resolveImport(file, s)).filter(Boolean))]);
}

const cycles = [];
const state = new Map();
const stack = [];

function visit(node) {
  state.set(node, 'open');
  stack.push(node);
  for (const dep of imports.get(node) ?? []) {
    if (state.get(dep) === 'open') {
      cycles.push([...stack.slice(stack.indexOf(dep)), dep].map((p) => relative(ROOT, p)));
    } else if (!state.has(dep)) {
      visit(dep);
    }
  }
  stack.pop();
  state.set(node, 'done');
}

for (const file of files) if (!state.has(file)) visit(file);

const seen = new Set();
const unique = cycles.filter((cycle) => {
  const key = [...cycle].sort().join('|');
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

if (unique.length === 0) {
  console.log(`No circular imports across ${files.length} modules.`);
  process.exit(0);
}

console.error(`Found ${unique.length} circular import chain(s):\n`);
for (const cycle of unique) console.error('  ' + cycle.join('\n    -> ') + '\n');
console.error(
  'A cycle usually means a barrel is re-exporting a component that consumes the module importing it.\n' +
    'Prefer removing the component from the barrel over importing around it.',
);
process.exit(1);
