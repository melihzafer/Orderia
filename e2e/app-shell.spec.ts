import { expect, test } from '@playwright/test';

test('loads the responsive Orderia service console', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page).toHaveTitle(/Orderia/i);
  await expect(
    page.getByRole('heading', {
      name: /Canlı Servis|Обслужване на живо|Live service/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Yalnız bu cihaz|Само на това устройство|This device only/i).last(),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: /Tümü|Всички|All/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Benim|Моите|Mine/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Uyarılar|Сигнали|Alerts/i })).toBeVisible();

  const allFilter = page.getByRole('tab', {
    name: /Tümü|Всички|All/i,
  });
  const box = await allFilter.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);

  await expect(page.getByText(/Servis|Обслужване|Service/i).last()).toBeVisible();
  await expect(page.getByText(/Menü|Меню|Menu/i).last()).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const rail = page.getByTestId('manager-navigation-rail');
  await expect(rail).toBeVisible();
  const railBox = await rail.boundingBox();
  expect(railBox?.width).toBe(240);
  expect(railBox?.height).toBe(900);
});

test('uses the rapid table workspace at phone speed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const table = page.getByText(/Pencere Kenarı/i);
  await expect(table).toBeVisible();
  await table.click();

  await expect(
    page.getByText(/Yalnız bu cihaz|Само на това устройство|This device only/i).last(),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: /Siparişler|Поръчки|Orders/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Menü|Меню|Menu/i })).toBeVisible();

  const tea = page.getByRole('button', { name: /Çay/i }).first();
  await expect(tea).toBeVisible();
  const teaBox = await tea.boundingBox();
  expect(teaBox?.height).toBeGreaterThanOrEqual(72);
  await tea.click();

  const send = page.getByRole('button', {
    name: /Sipariş Ekle|Добави Поръчка|Add Order/i,
  });
  await expect(send).toBeEnabled();
  const sendBox = await send.boundingBox();
  expect(sendBox?.height).toBeGreaterThanOrEqual(56);
  await send.click();

  await expect(page.getByText(/1× Çay/i)).toBeVisible();
});
