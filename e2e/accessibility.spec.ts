import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

test('has no serious or critical accessibility violations in the rapid service flow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: /^(?:Masalar|Маси|Tables)$/i,
    }),
  ).toBeVisible();

  await assertAccessible(page);

  await page.getByRole('tab', { name: /Sipariş|Поръчки|Orders/i }).click();
  await expect(page.getByRole('heading', { name: /Sipariş|Поръчки|Orders/i })).toBeVisible();
  await assertAccessible(page);
});

test('keeps keyboard focus visible and reaches primary navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: /^(?:Masalar|Маси|Tables)$/i,
    }),
  ).toBeVisible();

  await page.keyboard.press('Tab');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) return false;
        const style = getComputedStyle(active);
        return (
          active !== document.body && (style.outlineStyle !== 'none' || style.boxShadow !== 'none')
        );
      }),
    )
    .toBe(true);
});

async function assertAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = result.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact ?? ''),
  );
  expect(
    blocking,
    blocking
      .map(
        (violation) =>
          `${violation.id}: ${violation.help}\n${violation.nodes
            .map((node) => `  ${node.target.join(' ')}: ${node.failureSummary}`)
            .join('\n')}`,
      )
      .join('\n\n'),
  ).toEqual([]);
}
