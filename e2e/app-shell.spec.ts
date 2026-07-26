import { expect, test } from '@playwright/test';

test('loads the Orderia application shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Masalar|Tables/i);
  await expect(page.getByText(/Bugünkü Toplam|Today's Total/i)).toBeVisible();
  await expect(page.getByText('Orderia').first()).toBeVisible();
});
