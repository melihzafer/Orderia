import { expect, test } from '@playwright/test';

test('ships install metadata and iPhone safe-area markup', async ({ page, request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/?source=pwa');
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  );

  await page.goto('/');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/icons/apple-touch-icon.png',
  );
  const style = await page.locator('#expo-reset').textContent();
  expect(style).toContain('safe-area-inset-top');
  expect(style).toContain('100dvh');
});

test('keeps the app shell and IndexedDB data after an offline reload', async ({
  browserName,
  context,
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/Servis|Обслужване|Service/i).last()).toBeVisible();

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('orderia-v2');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('metadata', 'readwrite');
          transaction.objectStore('metadata').put({
            key: 'pwa-e2e-persistence',
            value: 'retained',
          });
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
  );

  // Playwright WebKit does not provide stable offline emulation on Windows/Linux.
  // Chromium proves the service-worker offline reload; WebKit proves Safari persistence.
  if (browserName === 'chromium') await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Servis|Обслужване|Service/i).last()).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string | undefined>((resolve, reject) => {
            const request = indexedDB.open('orderia-v2');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction('metadata', 'readonly');
              const read = transaction.objectStore('metadata').get('pwa-e2e-persistence');
              read.onsuccess = () => {
                database.close();
                resolve(read.result?.value);
              };
              read.onerror = () => reject(read.error);
            };
          }),
      ),
    )
    .toBe('retained');
});

test('never stores Supabase API or mutation responses in service-worker caches', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const requests = await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        return cache.keys();
      }),
    );
    return requests.flat().map((request) => request.url);
  });
  expect(
    cachedUrls.some(
      (url) =>
        url.includes('.supabase.co') ||
        /\/(?:auth|functions|rest|realtime|storage)\//.test(new URL(url).pathname),
    ),
  ).toBe(false);
});
