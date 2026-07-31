# Orderia 2.0 Pilot ve Rollout

## Sahiplik ve karar

- Release owner: atanacak
- Restaurant pilot owner: atanacak
- Incident commander yedeği: atanacak
- Pilot şube ve tarih: atanacak

Release owner her aşamanın kanıt bağlantısını bu belgeye ekler. P0/P1 hata, finansal fark, tenant
izolasyon hatası veya kurtarılamayan outbox kaydı varsa ilerleme durur.

## Aşama 0 — Teknik hazırlık

- `npm ci && npm run verify:full && npm run security:audit` yeşil.
- Database workflow migration, lint ve bütün pgTAP dosyalarında yeşil.
- `npm run release:env` EAS production ortamında yeşil.
- Sentry release, source map ve test olayı doğrulandı.
- Supabase günlük backup etkin; PITR kararı ve Storage dışa aktarımı belgelendi.
- Preview APK ve production AAB aynı commit SHA’dan terminal `FINISHED`.
- [REAL_DEVICE_MATRIX.md](./REAL_DEVICE_MATRIX.md) zorunlu satırları geçti.
- Gerçek garson doğrulamasında severity 3/4 açık bulgu yok.

## Aşama 1 — İç test

Seed edilmiş iki şubede 10 test kullanıcısı ile şu akışlar tamamlanır:

1. İki farklı kullanıcı ve aynı kullanıcının iki cihazı aynı masaya eşzamanlı sipariş gönderir.
2. Bağlantı kesilir, uygulama kapatılıp açılır, sipariş kaybolmadan outbox’tan gönderilir.
3. Aynı mutation tekrar gönderilir; ikinci sipariş veya ödeme oluşmaz.
4. Hesap bölme, kısmi nakit/kart ödeme, masa taşıma ve birleştirme denenir.
5. Bir hafta önceki fiş tarih, saat ve masa ile bulunup tekrar PDF üretilir.
6. Cihaz manager tarafından iptal edilir; bir sonraki doğrulamada oturum kapanır.

## Aşama 2 — Düşük riskli tek şube

- Mevcut v1 export alınır ve iki ayrı şifreli konumda tutulur.
- Yeni, boş pilot şubede migration dry-run finansal olarak `reconciled=true` döner.
- Geçiş [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md) ile uygulanır.
- İlk vardiya 2–3 garson ve sahada bir destek sorumlusu ile yapılır.
- Eski uygulama yazmaya kapalı recovery görüntüleyici olarak hazır tutulur.
- Vardiya sonunda receipt toplamı, confirmed payment ledger ve eski gross toplamı birebir eşleşir.

## Aşama 3 — Yoğun vardiya

- Bütün garson cihazları eklenir; cihaz sahibi isimleri doğrulanır.
- Yoğun servis boyunca crash, sync failure, queue depth ve payment failure dashboard’u izlenir.
- Gün sonunda finansal fark sıfır olmalı; bütün açık outbox kayıtları açıklanmalıdır.
- En az bir kontrollü 5 dakikalık bağlantı kesintisi yapılır.

## Aşama 4 — Genişleme

Bir sonraki şubeye geçmek için önceki şube en az yedi gün boyunca:

- crash-free session `>= 99.8%`,
- sync success `>= 99.9%`,
- açıklanamayan çift sipariş/ödeme `0`,
- finansal reconciliation farkı `0`,
- açık P0/P1 `0`

değerlerini korumalıdır.

## Geri dönüş

- Deployment kaynaklı UI/PWA hatasında önceki kaydedilmiş web sürümüne dönülür.
- APK geri alınamaz; sorunlu build dağıtımı durdurulur ve son iyi APK tekrar paylaşılır.
- Şema migrasyonu sonrası veri silen down migration çalıştırılmaz. Etkilenen şube `suspended` yapılır,
  son iyi PITR kopyası yeni projeye alınır ve fark audit kayıtlarıyla mutabık edilir.
- Geçiş sonrası veri şüpheliyse eski v1 uygulamasına yazmaya dönülmez; yeni şube karantinaya alınır ve
  kaynak export üzerinden yeni boş şubede tekrar dry-run yapılır.

## Kanıt kaydı

| Kapı | Durum | Kanıt | Onaylayan |
|---|---|---|---|
| CI ve pgTAP | Bekliyor | — | — |
| Preview APK | Bekliyor | — | — |
| Production AAB | Bekliyor | — | — |
| Android fiziksel cihaz | Bekliyor | — | — |
| iPhone Safari/PWA | Bekliyor | — | — |
| Garson usability | Bekliyor | — | — |
| Backup restore drill | Bekliyor | — | — |
| Pilot reconciliation | Bekliyor | — | — |
