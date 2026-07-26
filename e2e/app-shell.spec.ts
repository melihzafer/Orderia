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
    page.getByText(/Yalnız bu cihaz|Само на това устройство|This device only/i),
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
