import { defineConfig, devices } from '@playwright/test';

// Geliştirme sunucusunun varsayılan portu (8081) değil, teste ayrılmış bir port.
// Aynı portu paylaşmak iki soruna yol açıyordu: ya Playwright çalışan dev
// sunucusunu sessizce yeniden kullanıp saatler önceki paketi sınıyordu, ya da
// `reuseExistingServer: false` ile port dolu diye hiç çalışmıyordu. Ayrı port
// ikisini birden çözer — geliştirici dev sunucusunu açık bırakabilir.
const port = 8127;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run web -- --port ${port}`,
    env: {
      CI: '1',
      // Bu paket cihaz-yerel (device-only) modu sınar: örnek veriyle açılan, giriş
      // istemeyen uygulama kabuğu. Geliştiricinin `.env` dosyasında gerçek bir
      // Supabase projesi varsa uygulama haklı olarak giriş ekranında duruyor ve
      // bütün testler karşılama ekranına çarpıyordu. Boş değerler dotenv
      // tarafından ezilmez (anahtar zaten tanımlı sayılır), bu yüzden paket artık
      // kimin makinesinde çalıştığından bağımsız.
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      EXPO_PUBLIC_SUPABASE_URL: '',
    },
    // Hep taze sunucu. `reuseExistingServer` açıkken arka planda kalmış eski bir
    // dev sunucusu sessizce yeniden kullanılıyor ve paket, o anki kodu değil
    // saatler önceki paketi sınıyordu — sekiz testin birden düşmesi buna benziyor
    // ama sebebi tamamen başka. Port meşgulse Playwright bunu açıkça söyler;
    // yanlış bir başarısızlık raporundan çok daha iyi.
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}`,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
