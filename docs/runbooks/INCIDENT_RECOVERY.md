# Incident ve Recovery Runbook

## Seviyeler

- P0: tenant veri sızıntısı, veri kaybı, çift ödeme, yanlış finansal kapanış, yaygın servis kesintisi
- P1: sipariş gönderememe, branch genelinde sync kuyruğunun ilerlememesi, login kesintisi
- P2: receipt PDF, rapor veya tek cihaz/kullanıcı hatası; güvenli workaround var
- P3: görsel veya düşük etkili kullanılabilirlik sorunu

## İlk 15 dakika

1. Incident commander atanır; saat, branch, build ve ilk belirti kaydedilir.
2. P0/P1’de rollout ve yeni migration durdurulur.
3. Kullanıcıdan export, token, ödeme kartı veya misafir bilgisi istenmez.
4. Sentry event ID, anonim branch/device tag’i ve Supabase correlation/audit ID toplanır.
5. Veri bütünlüğü şüphesinde branch yazma operasyonu kontrollü olarak durdurulur; DB üzerinde manuel
   update/delete yapılmaz.

## Senaryo kararları

### Uygulama çökmesi

Son iyi web deployment’a dönün veya sorunlu APK dağıtımını durdurun. Local database dosyası
silinmez; cache/data temizleme önerilmez. Crash recovery ekranındaki event ID ile Sentry olayı
eşleştirilir.

### Sync kuyruğu ilerlemiyor

Bağlantı, auth ve device revocation kontrol edilir. Cursor pull çalışıyorsa Realtime kesintisi P1
değildir. Outbox kaydı tekrar denenmeden mutation ID değiştirilmez. Rejected/conflict satırı audit ve
server canonical state ile çözülür.

### Çift veya tartışmalı sipariş

Order item, batch, client mutation, actor, device, original table ve audit event zinciri çıkarılır.
Satır silinmez. Yanlış ürün cancellation reason ile iptal edilir; finansal kapanış sonrası adjustment
receipt kullanılır.

### Ödeme farkı

Yeni ödeme kapatmaları durdurulur. Payment, allocation, check ve immutable receipt değerleri
karşılaştırılır. Confirmed payment hiçbir zaman client-only düzeltmeyle değiştirilmez. Gerekirse
audited adjustment/void akışı uygulanır.

### Tenant izolasyon şüphesi

P0 ilan edilir; ilgili release ve anahtarlar durdurulur. RLS test suite’i ve şüpheli JWT scope yeniden
üretilir. Etkilenen tenant belirlenmeden geniş bildirim yapılmaz; yasal bildirim sorumlusu devreye
alınır.

## Kapanış

- Timeline, kök neden, etki, recovery ve veri mutabakatı yazılır.
- Regression testi kodla birlikte eklenir.
- P0/P1 için 48 saat içinde postmortem ve kalıcı owner/date çıkarılır.
- Sentry/support verisi içinde kişisel veri olup olmadığı denetlenir.
