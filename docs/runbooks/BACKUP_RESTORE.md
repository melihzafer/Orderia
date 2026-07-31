# Backup, PITR ve Restore Runbook

## Kapsam

Supabase planında günlük PostgreSQL backup etkinleştirilir. Yoğun pilot ve genel kullanım için PITR
tercih edilir. Supabase database backup’ları Storage object içeriğini kapsamaz; yalnız metadata
satırlarını kapsar.

Orderia receipt’in değişmez ticari snapshot’ını PostgreSQL’de tutar. PDF kaybolursa snapshot’tan
yeniden üretilebilir. Yine de imzalı/harici saklanan PDF gerekiyorsa receipt bucket ayrıca
versioning/lifecycle ve düzenli object export ile korunmalıdır.

## RPO/RTO

- PostgreSQL hedef RPO: PITR varsa `<=15 dk`, yalnız günlük backup varsa `<=24 saat`
- Pilot hedef RTO: `<=4 saat`
- Receipt PDF object hedef RPO: `<=24 saat`
- Auth ve EAS environment değerleri: şifre yöneticisinde sürüm kontrollü operasyon kaydı

## Aylık restore tatbikatı

1. Son backup production’a değil izole bir recovery projesine alınır.
2. Migration sürümü, tablo/constraint/RLS sayısı ve pgTAP suite doğrulanır.
3. Seçilen branch için:
   - issued receipt toplamı,
   - confirmed payment allocation toplamı,
   - open session/check/order sayısı,
   - audit event sayısı
   production kontrol toplamıyla karşılaştırılır.
4. Üç eski receipt snapshot’tan PDF olarak yeniden üretilir.
5. Storage export’tan seçili PDF object restore edilir.
6. Recovery kullanıcılarının production token’ı kullanamadığı doğrulanır.
7. Süre, fark ve kanıt pilot rollout belgesine yazılır.

## Gerçek recovery

Production üzerinde deneme restore yapılmaz. Yazmalar durdurulur, hedef zaman seçilir, recovery
projesi oluşturulur ve kontrol toplamları alınır. DNS/client endpoint ancak RLS, auth ve finansal
mutabakat sonrası değiştirilir. Kayıp zaman aralığındaki local outbox kayıtları aynı mutation ID’lerle
yeniden gönderilir; önce snapshot alınmadan cihaz verisi temizlenmez.
