# Orderia PWA ve Android Release

Bu belge `IMPLEMENTATION_PLAN.md` içindeki PWA, iPhone Home Screen ve Android EAS
teslimatının operasyonel karşılığıdır.

## Web / PWA

Üretim paketi:

```bash
npm ci
npm run build:web
npm run test:pwa:only
```

`dist/` şu güvenlik sınırlarıyla üretilir:

- versioned Workbox app-shell cache;
- Supabase Auth, REST, Realtime, Functions ve Storage yollarında `NetworkOnly`;
- bekleyen outbox kaydı veya açık ödeme adımı varken uygulanmayan kullanıcı kontrollü update;
- `viewport-fit=cover`, iPhone safe-area CSS ve Apple Home Screen ikonu;
- IndexedDB kalıcılığı ve Chromium offline reload testi;
- 6.5 MiB en büyük JavaScript dosyası ve 16 MiB offline shell bütçesi.

Production host HTTPS sunmalı ve SPA isteklerini `index.html` dosyasına yönlendirmelidir.
`index.html`, manifest ve service worker kısa cache; hash içeren `_expo/static` dosyaları immutable
cache almalıdır. Supabase cevaplarına CDN cache eklenmemelidir.

## Android EAS

Profiller:

- `development`: Expo development client, internal APK;
- `preview`: saha/pilot kurulumu için internal APK;
- `production`: Google Play için otomatik versionCode artıran AAB;
- `submit.production`: Play internal track üzerinde `draft`.

Yapılandırmayı build oluşturmadan doğrulama:

```bash
npx eas-cli config --platform android --profile preview
npx eas-cli config --platform android --profile production
npx expo-doctor
```

Build:

```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

EAS remote credentials kullanılmalıdır. Release keystore repoya yazılmaz; EAS build sırasında
`eas-build.gradle` ile enjekte eder. `android/app/build.gradle` yerel release buildini bilerek
imzasız bırakır ve debug anahtarının production artifact üretmesini engeller.

## Release öncesi zorunlu kontroller

1. EAS `preview` ortamında `EXPO_PUBLIC_SUPABASE_URL` ve
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` tanımlanır.
2. Android APK iki fiziksel telefonda kurulur; login, çevrimdışı sipariş, yeniden açılış,
   senkron ve PDF receipt test edilir.
3. iPhone Safari’de ilk online açılış yapılır, Ana Ekrana Ekle uygulanır, uçak modunda
   app-shell ve IndexedDB verisi kontrol edilir.
4. Açık ödeme ve bekleyen outbox varken yeni service worker’ın reload yapmadığı doğrulanır.
5. Production AAB iç test kanalına taslak olarak yüklenir; pilot onayı olmadan genel yayına
   alınmaz.
