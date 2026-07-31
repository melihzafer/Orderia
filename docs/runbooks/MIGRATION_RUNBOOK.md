# Orderia v1 → v2 Migration Runbook

## Değişmez kurallar

- Yalnız manager uygular.
- Hedef şube yeni ve boş olmalıdır.
- Export dosyası hiçbir destek kanalına veya Sentry olayına eklenmez.
- Dry-run temiz değilse apply butonu açılmaz.
- Aynı snapshot SHA-256 ile tekrar uygulanırsa yeni kayıt oluşmaz.
- Raw snapshot sunucuda tutulmaz; hash, mutabakat raporu ve ID mapping tutulur.

## Hazırlık

1. Servis kapandıktan sonra v1 export alın.
2. Dosya boyutunu ve SHA-256 değerini kaydedin.
3. Export’u iki şifreli konuma kopyalayın; erişimi release owner ve restaurant owner ile sınırlayın.
4. Supabase’de doğru organization altında boş branch oluşturun.
5. Currency, timezone, business-day cutoff ve receipt prefix değerlerini doğrulayın.
6. Import yapan manager cihazını bu branch’e kaydedin.

## Dry-run

Settings → Eski veri geçişi ekranında export seçilir. İki doğrulama yapılır:

- cihazda yapısal kontrol, duplicate/orphan/timestamp/money/quantity kontrolü;
- server tarafında boş branch, manager, finansal toplam ve tenant scope kontrolü.

`blockingIssueCount=0` ve `reconciled=true` değilse uygulanmaz. Warning’ler tek tek açıklanır:

- `missing_menu_snapshot`: satır adı ve fiyat snapshot’ı korunur;
- `missing_waiter_attribution`: satır importer hesabına yazılır, orijinal isim receipt snapshot’ında
  varsa korunur;
- diğer uyarılar release owner tarafından imzalanır.

## Apply ve doğrulama

1. Uygulama apply öncesi export’un ikinci recovery kopyasını cihaz document alanına yazar.
2. Server bütün insertleri tek transaction içinde yapar.
3. Şunları kaydedin:
   - run ID ve snapshot hash,
   - hall/table/menu/open/closed/item sayıları,
   - source ve computed closed gross,
   - receipt/payment/allocation toplamı.
4. Aynı dosyayı ikinci kez uygulayın; `idempotentReplay=true` olmalı ve sayılar değişmemelidir.
5. Rasgele üç kapanmış hesabı tarih/saat/masa ile arayın; PDF’leri export ile karşılaştırın.
6. Manager report gross değeri receipt ve confirmed payment ledger ile eşleşmelidir.

## Hata ve kurtarma

- Apply sırasında hata: PostgreSQL transaction geri alınır. Hedef branch boş kalmalıdır; bunu dry-run
  ile tekrar kanıtlayın.
- Apply tamamlandıktan sonra şüphe: kayıtları elle silmeyin. Branch’i suspend edin, olay açın ve kaynak
  export’u yeni boş branch üzerinde tekrar doğrulayın.
- Kaynak export bozuk: v1 read-only kopyadan yeniden export alın; bozuk dosyayı dönüştürerek
  “düzeltmeyin”.
- Importer’a atanan eski garson satırları: kimlik kanıtı yoksa auth kullanıcısı uydurmayın. Receipt
  snapshot isminden açıklama yapılır ve performans raporunda “legacy importer” sınırlaması belirtilir.

Export dosyası pilot sign-off ve backup restore tatbikatı tamamlanmadan imha edilmez. Saklama ve imha
süresi işletmenin veri politikasına göre ayrıca onaylanır.
