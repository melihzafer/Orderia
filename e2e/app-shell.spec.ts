import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const nav = {
  tables: /^(?:Masalar|Маси|Tables)$/i,
  orders: /^(?:Sipariş|Поръчки|Orders)$/i,
  menu: /^(?:Menü|Меню|Menu)$/i,
  receipts: /^(?:Fişler|Разписки|Receipts)$/i,
  home: /^(?:Ana ekran|Начало|Home)$/i,
};

/** Sipariş akışı önce salon sordurur; masalar ikinci adımda görünür. */
const selectHall = /^(?:Salon seçin|Изберете зала|Select hall)$/i;
const mainHall = /^Ana Salon/i;

test('renders the five-tab mobile shell without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page).toHaveTitle(/Orderia/i);
  await expect(page.getByRole('heading', { name: nav.tables })).toBeVisible();
  for (const label of Object.values(nav)) {
    await expect(page.getByRole('tab', { name: label })).toBeVisible();
  }

  const tab = page.getByRole('tab', { name: nav.orders });
  const box = await tab.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('tables-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  const rail = page.getByTestId('manager-navigation-rail');
  await expect(rail).toBeVisible();
  const railBox = await rail.boundingBox();
  expect(railBox?.width).toBe(240);
  expect(railBox?.height).toBe(900);
  await page.screenshot({ path: testInfo.outputPath('tables-desktop.png'), fullPage: true });
});

test('quick actions navigate to real destinations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const actions = [
    {
      name: /Yeni sipariş|Нова поръчка|New order/i,
      verify: async () => {
        // "Yeni sipariş" artık salon/masa seçtiren kendi modalını açıyor.
        await expect(page.getByRole('heading', { name: selectHall })).toBeVisible();
        await page.getByRole('button', { name: /Kapat|Затвори|Close/i }).click();
      },
    },
    {
      name: /Son sipariş|Последна поръчка|Last order/i,
      verify: async () => {
        const detailTab = page.getByRole('tab', { name: /Siparişler|Поръчки|Orders/i });
        const ordersHeading = page.getByRole('heading', { name: nav.orders });
        await expect(detailTab.or(ordersHeading)).toBeVisible();
      },
    },
    {
      name: /İsimle ara|Търси по име|Find by name/i,
      verify: async () => {
        await expect(page.getByRole('heading', { name: nav.orders })).toBeVisible();
        await expect(
          page.getByPlaceholder(
            /Masa veya garson ara|Търси маса или сервитьор|Search table or waiter/i,
          ),
        ).toBeVisible();
      },
    },
    {
      name: /Açık hesaplar|Отворени сметки|Open checks/i,
      verify: async () => {
        await expect(page.getByRole('heading', { name: nav.orders })).toBeVisible();
      },
    },
    {
      name: /Ödeme al|Приеми плащане|Take payment/i,
      verify: async () => {
        await expect(page.getByRole('heading', { name: nav.orders })).toBeVisible();
      },
    },
    {
      name: /Gün özeti|Обобщение за деня|Day summary/i,
      verify: async () => {
        await expect(
          page.getByRole('heading', { name: /Analitik|Аналитика|Analytics/i }),
        ).toBeVisible();
      },
    },
  ] as const;

  for (const action of actions) {
    await page.goto('/');
    await page.getByRole('tab', { name: nav.home }).click();
    const button = page.getByRole('button', { name: action.name });
    await expect(button).toBeVisible();
    await button.click();
    await action.verify();
  }
});

test('supports adding an order, long-press actions, splitting and editing cash payment', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: nav.orders }).click();

  // Sipariş sekmesi kasıtlı olarak iki adımlı: önce salon, sonra masa.
  await page.getByRole('button', { name: mainHall }).click();

  const table = page.getByRole('button', { name: /Pencere Kenarı/i }).first();
  await expect(table).toBeVisible();
  await table.click();
  await expect(page.getByRole('tab', { name: /Siparişler|Поръчки|Orders/i })).toBeVisible();

  const firstOrderTab = page.getByRole('tab', { name: /Sipariş Adı 1/i });
  if (await firstOrderTab.count()) {
    await firstOrderTab.hover();
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await page
      .getByLabel(/Sipariş adı|Име на поръчката|Order name/i)
      .last()
      .fill('Dört kişi');
    await page.getByRole('button', { name: /Kaydet|Запази|Save/i }).click();
    await expect(page.getByRole('tab', { name: /Dört kişi/i })).toBeVisible();
  }

  const tea = page.getByRole('button', { name: /^Çay/i }).first();
  await expect(tea).toBeVisible();
  await tea.click();
  await page
    .getByRole('button', { name: /Sipariş Ekle|Добави Поръчка|Add Order/i })
    .last()
    .click();
  await expect(page.getByText(/1× Çay/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('order-mobile.png'), fullPage: true });

  const teaLine = page.getByRole('button', { name: /1× Çay/i }).first();
  await teaLine.hover();
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(
    page.getByRole('button', {
      name: /Başka hesaba aktar|Премести в друга сметка|Move to another check/i,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: /Başka hesaba aktar|Премести в друга сметка|Move to another check/i,
    })
    .click();
  await page
    .getByLabel(/Sipariş adı|Име на поръчката|Order name/i)
    .last()
    .fill('Ali');
  await page
    .getByRole('button', { name: /Yeni hesap|Нова сметка|New check/i })
    .last()
    .click();

  await page.getByRole('tab', { name: /Ali/i }).click();
  await page.getByRole('button', { name: /Ödeme Al|Вземи Плащане|Take Payment/i }).click();
  await expect(page.getByText(/Para Üstü|Ресто|Change/i)).toBeVisible();
  const received = page.getByLabel(/Alınan Miktar|Получена Сума|Amount Received/i);
  await received.fill('10');
  await expect(page.getByText(/Para Üstü:|Ресто:|Change:/i)).toBeVisible();
  await page
    .getByRole('button', { name: /Ödeme Al|Вземи Плащане|Take Payment/i })
    .last()
    .click();

  await expect(page.getByText(/Ödenen hesaplar|Платени сметки|Paid checks/i)).toBeVisible();
  await page.getByRole('button', { name: /Ali ·/i }).click();
  await expect(page.getByText(/Ödemeyi düzenle|Редактирай плащането|Edit payment/i)).toBeVisible();
  await received.fill('12');
  await page.getByRole('button', { name: /Kaydet|Запази|Save/i }).click();
});

test('opens the searchable receipt archive with explicit offline recovery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: nav.receipts }).click();

  await expect(page.getByLabel(/Hızlı arama|Бързо търсене|Quick search/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^(Filtreler|Филтри|Filters) \(\d+\)$/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/Arşiv şu anda kullanılamıyor|Архивът не е достъпен|Archive unavailable/i),
  ).toBeVisible();
});

test('keeps manual menu editing available while AI add is hidden', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: nav.menu }).click();

  await expect(page.getByRole('heading', { name: nav.menu })).toBeVisible();
  // AI ile ürün ekleme şu an tamamen gizli (devre dışı-ama-görünür değil) —
  // bkz. MenuScreen.tsx'teki yorum satırına alınmış blok. Bu testin asıl
  // amacı manuel ekleme akışının bundan etkilenmediğini doğrulamak.
  await expect(
    page.getByRole('button', { name: /AI ile ürün ekle|Добави с AI|Add with AI/i }),
  ).toHaveCount(0);

  await page
    .getByRole('button', { name: /Elle ürün ekle|Добави ръчно|Add manually/i })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: /^(Ürün Ekle|Добави Артикул|Add Item)$/i }).last(),
  ).toBeVisible();
  await expect(page.getByLabel(/Ürün adı|Име|Item name/i)).toBeVisible();
  await expect(page.getByLabel(/Fiyat|Цена|Price/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('manual-add-mobile.png'), fullPage: true });
});

test('exports a parseable JSON backup from Settings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: nav.home }).click();
  await page.getByRole('button', { name: /Ayarlar|Настройки|Settings/i }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Yedek al|Резервно копие|Export backup/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/orderia-backup-.*\.json/i);
  const path = await download.path();
  expect(path).toBeTruthy();
  const parsed = JSON.parse((await readFile(path!)).toString('utf8')) as {
    format?: string;
    version?: number;
    data?: unknown;
  };
  expect(parsed.format).toBe('orderia-backup');
  expect(parsed.version).toBe(1);
  expect(parsed.data).toBeTruthy();
});
