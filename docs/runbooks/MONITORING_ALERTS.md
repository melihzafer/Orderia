# Monitoring, SLO ve Alarm Runbook

## Kaynaklar

- Sentry: crash, auth, local database, sync, payment, receipt ve migration hataları
- Sentry performance: production trace sample oranı `%5`
- Supabase Logs / Log Drains: Auth, PostgREST, Realtime, Edge Function ve PostgreSQL hataları
- PostgreSQL: outbox, conflict, receipt, payment ve audit sorguları
- EAS: build ve dağıtım durumu

Telemetry organization, branch, device ve user değerlerini SHA-256 ile anonimleştirir. E-posta,
telefon, bearer token, UUID, sipariş notu ve URL secret query değerleri gönderilmez.

## SLO ve alarm eşikleri

| Sinyal | Hedef | Warning | Page |
|---|---:|---:|---:|
| Crash-free sessions | `>=99.8%` / 7 gün | `<99.9%` | `<99.8%` |
| Sync success | `>=99.9%` / 1 saat | `<99.95%` | `<99.9%` |
| Online mutation p95 | `<2 s` | `>=1.5 s` | `>=2 s` 10 dk |
| Payment failure | `0` beklenmeyen | 2 / 15 dk | 5 / 15 dk |
| Receipt render failure | `<0.5%` | 2 / 30 dk | `>=1%` |
| Outbox queue depth | normal `<5` | cihazda `>=20` | branch’te `>=100` |
| En yaşlı outbox | `<2 dk` online | `>=5 dk` | `>=15 dk` |
| Unresolved conflict | `0` | 1 | `>=5` veya ödeme |
| Realtime disconnect | pull ile tolere | 5 / 10 dk | sync de bozulursa |
| Financial difference | `0` | yok | herhangi bir fark |

## Sentry ayarı

EAS production ortamında sensitive `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` ve public DSN
tanımlanır. Release adı `orderia@<version>`, dist Android versionCode/build number olmalıdır. Build
sonrası source-map upload log’u ve minified test hatasının okunabilir stack’i doğrulanır.

Alarm filtreleri `operational_event` ve `operation` tag’lerini kullanır. Guest veya sipariş metni
aranmaz. P0/P1 alarmları restaurant pilot owner ve incident commander’a gider.

## Vardiya kontrolü

Vardiya başı:

- son 60 dakikada yeni crash regression yok;
- Supabase Auth/PostgREST/Realtime sağlıklı;
- pending queue ve unresolved conflict normal;
- son backup başarılı.

Vardiya sonu:

- confirmed payments = issued receipt total;
- açıklanamayan pending/rejected mutation yok;
- cancellation ve adjustment audit örneklemi kontrol edildi;
- alarm ve müdahale notları pilot kaydına eklendi.

Supabase Log Drain üretim planında etkin değilse dashboard eksik kabul edilir ve release owner manuel
log kontrolü için vardiya takvimi oluşturur.
