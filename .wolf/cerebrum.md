# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-08-07

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

- Tek tek hata duzeltmesi yetmiyor: "boyle hatalarin onlemini almak gerekiyor" — bir hata bulununca
  duzeltmenin yaninda o SINIF hatayi yakalayacak otomatik kontrol de isteniyor (test, CI adimi, gate).
- Silme yerine duzenleme tercih ediliyor. Ornek: import dongusu, barrel'dan export SILEREK degil,
  tuketicileri dogrudan import'a cevirerek kirildi.
- Urun kararlarinda kullanici tarafindan bakilmasi bekleniyor (garsonun ekranda ne gordugu).
  Denetim izi tutarliligi onemseniyor: hesap silme de tek satir iptaliyle ayni gerekce listesini soruyor.

## Key Learnings

- **Test altyapisi:** Ekran testleri `src/test-support/renderScreen.tsx` uzerinden yazilir.
  `renderWithProviders` SAGLAYICI SIRASI App.tsx ile ayni (SafeArea > Localization > Theme > Snackbar > QRMenu).
  `mockOrderiaData` + `InMemoryLocalDatabase` bulut modunu (`mode: 'cloud'`) taklit eder.
  Tohum veri: `src/test-support/seedTableWorkspace.ts`.
- **RNTL/React 19 tuzaklari (bu repoda):** `render()` beklenebilir donuyor, `await` sart.
  `waitFor(() => getBy*)` yerine `findBy*` kullanilmali (efektler turlar arasi bosalmiyor).
  `fireEvent.changeText` sonrasi state'in islenmesini beklemeden bir sonraki etkilesim yapilirsa
  komut eski degerle calisir. `waitFor`'a async callback verilmez. Mid-test `cleanup()` bekleyen
  sorgulari iptal eder ("waitFor was aborted by cleanup").
- **jest.mock fabrikalari hoist edilir:** disaridan yalnizca `mock` onekli degiskenlere erisebilirler.
  Ekran importlari mock'lardan SONRA gelmeli (`eslint-disable import/first` ile).
- **Metro `.svg`'yi bilesene ceviriyor, jest cevirmiyor** — `jest.config.js` moduleNameMapper ile
  `src/test-support/svgMock.tsx`'e yonlendiriliyor.
- **Zustand depolari modul singleton'i:** testler arasi `setState` ile sifirlanmali (`useWorkspaceDraftStore`).
- **Project:** orderia
- **Description:** **Orderia** is a comprehensive mobile management system developed for modern restaurants. Built with React Native, Expo, and TypeScript, this app allows restaurant managers to easily handle daily oper

- [2026-08-08] **`AuthContext.tsx` hata mesajlari once tamamen sabit Ingilizce metinlerdi** — `useLocalization`
  hic import edilmemisti, digger ekranlarin aksine. Simdi `t.auth*` anahtarlariyla lokalize + Supabase hata
  siniflandirmasi (network/rate-limit/invalid-credentials/email-in-use/weak-password/device-revoked) eklendi.
  `AuthProvider` artik `LocalizationProvider` icinde render edilmeli — `AuthContext.test.tsx` bunu sarmiyordu,
  eklendi (`useLocalization must be used within a LocalizationProvider` hatasi verirdi).
- [2026-08-08] **`src/i18n/languages.ts`'te bazi anahtarlar (tableAdded/hallAdded/categoryAdded/categoryUpdated/
  categoryDeleted) tanimliydi ama HICBIR ekran kullanmiyordu** — Add/Edit Table, Add/Edit Hall, Add/Edit
  Category ekranlari basarili kayittan sonra sessizce `navigation.goBack()` yapiyordu, sadece hata durumunda
  snackbar gosteriyordu. Yeni bir "eklendi/silindi" bildirimi istenirse once mevcut cevirilerin zaten var olup
  olmadigini kontrol et — cogu zaman anahtar hazir, sadece ekranda cagrilmamis. Kategori silme snackbar'i da
  yanlislikla `t.deleteCategory` (buton etiketi "Kategori Sil") kullaniyordu, gercek "silindi" anahtari
  (`categoryDeleted`) zaten dosyada TANIMLIYDI ama kullanilmiyordu — interface'e ayni adla ikinci kez eklerken
  bunu fark ettim (TS2300 duplicate identifier hatasi verdi, cozum: benim eklediğimi silip mevcut olani kullanmak).

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

- [2026-08-07] `@gorhom/bottom-sheet` `BottomSheetModal` web/PWA'da cokuyor. Bu projede alt sayfa
  gerektiginde `WorkspaceModal` (duz RN `Modal`) + `ServiceListRow` kullan. `src` icinde
  BottomSheetModal kullanimi kalmadi; geri getirme.
- [2026-08-07] Bir bayragi state'ten CIKARIMLA turetme. "Yeni hesap" niyeti `selectedCheckId === undefined`
  ile temsil edilince otomatik secim efekti aninda geri aliyordu. Niyet icin ayri bir bayrak tut
  (`startingNewCheck`).
- [2026-08-07] `Alert.alert` / `window.confirm` KULLANMA — react-native-web'de sessizce yutuluyor.
  Yerine `ServiceConfirmSheet` veya ekranin kendi notice seridi.
- [2026-08-07] Yeni bir CI adimi (`check:cycles`) eklemeden once yerelde calistir: mevcut bir ihlal
  varsa CI'yi kirar. Bu sefer AuthGate/LoginScreen/components barrel dongusu vardi.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

- [2026-08-07] **Ekran testleri jest+RNTL ile, Playwright ile degil.** Playwright paketi
  `playwright.config.ts` icinde Supabase env'ini bilerek bosaltiyor (cihaz-yerel modu sinamak icin),
  bu yuzden bulut ekranlari (`mode: 'cloud'`) e2e'de HIC render edilmiyor ve "..." cokmesi oradan kacti.
  Bulut yolunu kapsamak icin jest render testleri secildi; e2e device-local kapsami olarak birakildi.
- [2026-08-07] **Jenerik smoke testi + hedefli derin testler.** `screens.smoke.test.tsx` barrel'daki
  HER ekrani render edip yalnizca "cokuyor mu" sorar (yeni ekran otomatik kapsama girer); davranis
  testleri ekranin kendi dosyasinda durur. 28 ekrana elle detayli test yazmak bakim yuku olurdu.
- [2026-08-07] **Sentry gate'i uyari, engel degil.** `prebuild:web` -> `verify-release-env.mjs --warn-only`.
  Sert gate (`release:env`) Vercel'de env tanimlanana kadar butun deploy'lari kirardi; kullanici
  "uyar ama engelleme"yi secti. Sert gate hala bayraksiz calistirilabiliyor.
- [2026-08-07] **Ekran bazli hata siniri (`ScreenErrorBoundary`).** Kok `AppErrorBoundary` korunuyor
  ama tek basina yetmiyordu: bir ekranin hatasi tum kabugu dusuruyor ve "Tekrar dene" ayni coken agaci
  yeniden cizip aninda tekrar cokuyordu. Ekran sinirinin kurtarmasi "Geri don" (navigation.goBack).
- [2026-08-07] **Projede IKI ayri, birlesmeyen veri mimarisi var — kok neden analizinde bunu bil.**
  (1) Eski zustand magazalari (`orderStore`, `historyStore` -> localStorage `history-storage`), bulut
  oturumu olmadan calisan "onboarding kum havuzu" (sample data). (2) Yeni domain katmani
  (`useOrderiaData()`, `mode: 'local_only' | 'cloud'`, IndexedDB `domain_records`) — `local_only` burada
  "eslesmis ama gecici cevrimdisi cihaz" anlamina gelir, kum havuzu degil. HistoryScreen/AnalyticsScreen
  SADECE (2)'yi sorgular; TableDetailScreen'in cihaz-yerel calismasi (2)'ye hic dokunmuyor, (1)'i kullaniyor.
  Ikisi arasindaki tek kopru `src/features/legacy-migration/` — kullanicinin elle sectigi bir JSON dosyasini
  BULUTA tek seferlik aktaran bir arac, canli/otomatik bir okuma yolu degil. Bu yuzden "cihaz-yerel modda
  fis/rapor gorunmuyor" turu bulgularda dogru duzeltme genelde (1)'i (2)'nin icine okutmak DEGIL — bu iki
  farkli veri modelini kaynastirir, riskli. Once mesajlarin dogru sinifi ayirt edip etmedigine bak
  (`mode !== 'cloud'` vs gercek `sync.online === false`); cogu zaman asil kirik olan budur.
- [2026-08-07] **RTQ-002 fix'i mimariyi degistirmedi, sadece yanlis mesaji duzeltti.** Receipts/Analytics
  "internet gerekli" diyordu ama `mode !== 'cloud'` durumunda cihazin gercekten interneti olabiliyordu —
  asil sorun bulut isletmesine hic baglanmamis olmasiydi. `copy.cloudRequired` eklendi, iki durum ayrildi
  (bkz yukaridaki iki-mimari notu). Bilerek yapilmayan: legacy store verisini bu ekranlara okutmak.
- [2026-08-08] **`TableDetailScreen` local_only modda TAMAMEN `LegacyTableDetailScreen`'e devrediyor.**
  `data.client || data.scope` yoksa (satir ~99-104) `return <LegacyTableDetailScreen />` — yeni
  `WorkspaceHeader`/`TableOperationSheet`/"Действия" menusu render agacina HIC girmiyor. Bir buton
  "calismiyor" gibi gorunuyorsa once bunu kontrol et: React Fiber agacinda hangi ekran gercekten monte,
  DOM `aria-label` sorgusuyla dogrulanabilir (`document.querySelector('[aria-label="X"]')` + fiber
  `__reactFiber$` key'i ile yukari yurume). Cloud-only ekranlarda "moved/broken" sanilan seyler genelde
  local modda hic monte olmuyor — bu normal, mimarinin bir parcasi.
- [2026-08-08] **QR Menu ozelligi tamamen sahte — Ayarlar'dan gizlendi, kod silinmedi.**
  `QRMenuContext.tsx`'teki `getMenuUrl()` sabit kodlu `https://orderia-menu.app/menu/{tableId}`
  URL'i uretiyor; bu domain'in bu depoyla HICBIR ilgisi yok (AppNavigator.tsx'te `linking` config bile
  yok), QR gorseli yerel paket yerine ucuncu taraf `api.qrserver.com`'a gonderiliyor, `validateQRAccess`/
  `getQRMenuData` hicbir yerden cagrilmiyor, `addTicketLine` misafir siparisi almak icin import edilmis
  ama hic kullanilmiyor. Kullanici acikca "ozelligi devre disi birak/gizle" dedi (gercek ozelligi
  insa etmeyi degil). Tek giris noktasi (`SettingsScreen.tsx`'teki "QR Menu" satiri) kaldirildi;
  `QRMenuScreenModern`/`QRMenuContext`/route kaydi SILINMEDI, sadece erisilemez hale getirildi.
  Bu domain/QR akisini "duzeltmek" isteyen bir istekle karsilasirsan bu once bir urun karari.
- [2026-08-08] **KRITIK: `CI=1` ile baslatilan Metro dev server, dosya degisikliklerini bir daha ASLA
  yakalamiyor — tek seferlik `--clear` restart bile yetmiyor, HER kod degisikliginden sonra server'i
  YENIDEN BASLATMAK gerekiyor.** "Metro is running in CI mode, reloads are disabled" uyarisi sadece
  HMR/websocket push'u degil, dosya izleyiciyi (watcher) de kapatiyor gibi gorunuyor: sayfa hard-reload
  edilse bile bundle icerigi degismiyor (canli test edilerek dogrulandi — `fetch(bundleUrl)` ile yeni
  eklenen bir string aranip bulunamadi, server restart sonrasi bulundu). Bu oturumda bir ozellik
  ekleyip TARAYICIDA test etmeden once: 1) dev server'i durdur, 2) yeniden baslat, 3) sayfayi yeniden
  yukle, 4) GEREKIRSE `fetch(document.scripts bulun, 500KB+ olani)` ile yeni bir string/fonksiyon adi
  arayarak bundle'in gercekten guncellendigini dogrula — DOM/ekran goruntusune guvenme, stale bundle
  ayni eski ekrani sorunsuzca gosterir.
