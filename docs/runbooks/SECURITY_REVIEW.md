# Orderia 2.0 Security Review

## Korunan varlıklar ve sınırlar

- Tenant/branch siparişleri, ödeme ledger’ı, receipt snapshot ve audit zinciri
- Kullanıcı session/refresh token ve cihaz yetkisi
- Supabase publishable key (public), service role ve Sentry token (private)
- Local SQLite/IndexedDB outbox
- AI menü girdisi ve manager onay durumu

Client güvenilir değildir. Organization, branch, rol, cihaz, para, version ve idempotency kuralları
security-definer RPC ve forced RLS ile server’da tekrar doğrulanır. Realtime yetki veya doğruluk
kaynağı değildir.

## Uygulanan kontroller

- Her tenant tablosunda organization/branch scope ve cross-scope foreign key
- Forced RLS; manager/waiter ve çapraz tenant pgTAP testleri
- İptal edilmiş cihazların server-side reddi
- Ödeme, masa taşıma/birleştirme ve receipt için transaction + audit
- Mutation ID/fingerprint ile idempotency; farklı içerikle reuse reddi
- Local-first outbox ve conflict kaydı; sessiz veri silme yok
- Sentry PII kapalı, telemetry redaction ve anonim scope hash’leri
- CSP, HSTS, frame denial, MIME sniffing ve browser permission policy
- CI secret scan, production dependency baseline ve release env doğrulaması
- AI önerisi manager onayı olmadan publish edilemez; alerjen doğrulanmadı olarak kalır

## Kabul edilen bağımlılık riski

`npm audit --omit=dev` 2026-07-26 tarihinde 0 critical, 58 high, 4 moderate package path raporladı.
Bunlar altı transitive advisory’den gelir: AJV, UUID, PostCSS (üç advisory) ve brace-expansion.
Etkilenen zincir Expo SDK 53 / React Native 0.79 build ve framework bağımlılıklarına uzanır.

Üretim misafir/sipariş girdisi Metro/PostCSS/build CLI’a ulaşmaz; uygulama AJV `$data`, UUID buffer
ve brace expansion API’lerini kullanıcı girdisiyle çağırmaz. Yine de risk kalıcı kabul edilmemiştir.
[Issue #33](https://github.com/melihzafer/Orderia/issues/33) kontrollü Expo 57 / React Native 0.86
yükseltmesini izler.

`security-audit-baseline.json`:

- yeni advisory’yi,
- critical bulguyu,
- severity/package count artışını,
- 2026-09-30 sonrası yeniden değerlendirilmemiş kabulü

CI’da bloklar. `npm audit fix --force` kullanılmaz.

## Açık dış kapılar

- Hosted Supabase network restriction, backup/PITR ve Log Drain plan ayarı
- Sentry org/project/token ve alert routing
- EAS production environment secret doğrulaması
- Fiziksel cihazda secure storage, logout/revocation ve APK tamper smoke testi
- İşletmenin receipt/mali mevzuat incelemesi

Bu dış kapılar tamamlanmadan public launch güvenlik onayı verilmez.
