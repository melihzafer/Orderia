import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'offline.html',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

await Promise.all(requiredFiles.map((file) => access(path.join(root, file))));

const manifest = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || manifest.start_url !== '/?source=pwa') {
  throw new Error('PWA manifest must use the reviewed standalone entry point');
}
if (!manifest.icons.some((icon) => icon.sizes === '192x192')) {
  throw new Error('PWA manifest is missing its 192px install icon');
}
if (!manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable')) {
  throw new Error('PWA manifest is missing its 512px maskable icon');
}

const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8');
for (const requiredMarkup of [
  'viewport-fit=cover',
  'rel="manifest"',
  'apple-touch-icon',
  'safe-area-inset-top',
]) {
  if (!indexHtml.includes(requiredMarkup)) {
    throw new Error(`Built index.html is missing ${requiredMarkup}`);
  }
}

const files = await walk(root);
const javascript = await Promise.all(
  files
    .filter((file) => file.endsWith('.js') && !file.endsWith('sw.js'))
    .map(async (file) => ({ file, bytes: (await stat(file)).size })),
);
const largestJavaScript = javascript.sort((left, right) => right.bytes - left.bytes)[0];
if (!largestJavaScript || largestJavaScript.bytes > 6.5 * 1024 * 1024) {
  throw new Error(
    `Initial JavaScript budget exceeded: ${largestJavaScript?.bytes ?? 0} bytes (max 6.5 MiB)`,
  );
}

const shellBytes = (
  await Promise.all(
    files.filter((file) => !file.endsWith('.map')).map(async (file) => (await stat(file)).size),
  )
).reduce((sum, size) => sum + size, 0);
if (shellBytes > 16 * 1024 * 1024) {
  throw new Error(`Offline shell budget exceeded: ${shellBytes} bytes (max 16 MiB)`);
}

console.log(
  `PWA verified: largest JS ${(largestJavaScript.bytes / 1024 / 1024).toFixed(2)} MiB; shell ${(
    shellBytes /
    1024 /
    1024
  ).toFixed(2)} MiB`,
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}
