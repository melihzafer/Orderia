# Orderia Festival Operasyon Planı

> **Belge türü:** Ürün ve geliştirme planı  
> **Hedef sürüm:** Festival Pilot Sürümü  
> **Ana kullanım:** Yoğun, açık hava ve bağlantının zayıf olabileceği festival ortamında hızlı sipariş kaydı, hesap takibi ve eksiksiz işlem geçmişi  
> **Öncelik:** Satılabilir SaaS özelliklerinden önce gerçek saha kullanımında hız, güvenilirlik ve veri kaybının önlenmesi

---

## 1. Yönetici Özeti

Orderia'nın kısa vadeli hedefi genel kullanıma açık bir restoran SaaS ürünü olmak değildir. İlk gerçek hedef, bir hafta içinde köy festivalinde kullanılabilecek, garsonun iş yükünü azaltan ve siparişleri unutmamasını sağlayan güvenilir bir operasyon uygulamasıdır.

Festival ortamında temel servis akışı şöyledir:

```text
Masaya git
→ Siparişi al
→ Orderia'ya kaydet
→ Mutfağa gidip sözlü olarak yemekleri söyle
→ İçecekleri götür
→ Yeni masaya geç
→ Gerekirse ek sipariş gir
→ Hesabı kişi veya grup bazında ayır
→ Ödemeyi al
→ Siparişi kapat
→ Tüm geçmişi arşivde koru
```

Bu nedenle ilk sürümde mutfak ekranı, canlı hazırlık durumu, QR sipariş, rezervasyon, abonelik planları ve gelişmiş stok reçeteleri ana hedef değildir.

Festival sürümünün temel vaadi şudur:

> Garson yanlış yazabilir, müşteri fikrini değiştirebilir, siparişe sonradan ürün eklenebilir, hesap bölünebilir, internet kesilebilir veya sipariş yanlışlıkla kapatılabilir. Buna rağmen hiçbir sipariş, ödeme veya değişiklik kaybolmaz.

---

## 2. Mevcut Durum ve Planın Yönü

Orderia'nın mevcut çekirdeğinde aşağıdaki güçlü temeller bulunmaktadır:

- Hızlı sipariş akışı
- Çoklu garson desteği
- Offline çalışma
- Ödeme kaydı
- Hesap bölme
- Named check yapısı
- Masa taşıma ve birleştirme
- İptal geçmişi
- Fiş ve arşiv yapısı
- Arama ve raporlama
- Tenant ve şube yapısı
- PWA/Android altyapısı

Bu plan, mevcut sistemi sıfırdan yeniden tasarlamak yerine mevcut çekirdeği festival kullanımı için sadeleştirir ve aşağıdaki alanları tamamlar:

1. Özel sipariş adı
2. Kişi ve ortak hesapları
3. Ek sipariş batch'leri
4. Yemek ve içecek ayrımı
5. Hızlı ödeme ve para üstü
6. Değişiklik ve iptal audit kaydı
7. Kapatılmış siparişlerin tam arşivi
8. Offline ve çoklu cihaz güvenilirliği
9. Festival odaklı ekranlar
10. Gerçek garson senaryolarının tamamı

---

## 3. Ürün Vizyonu

Orderia Festival Mode, garsonun fiziksel adisyon kağıdı yerine kullandığı dijital hafıza ve hesap defteridir.

Uygulama aşağıdaki sorulara her an cevap vermelidir:

```text
Bu sipariş kimin?
Hangi masa veya alanda?
Kim ne söyledi?
Hangi ürünler mutfağa söylenecek?
Hangi içecekler götürülecek?
Sonradan ne eklendi?
Kim ne kadar ödeyecek?
Ne kadar ödendi?
Hangi işlem kim tarafından ve ne zaman değiştirildi?
Sipariş kapatıldıktan sonra tam olarak ne olmuştu?
```

---

## 4. Hedefler

### 4.1 Birincil hedefler

- Sipariş alma süresini mümkün olduğunca azaltmak
- Siparişlerin unutulmasını ve karışmasını önlemek
- Tanıdık müşteriler için özel sipariş isimleri kullanmak
- Aynı masa içindeki kişileri ve ortak ürünleri ayırmak
- İlk sipariş ile ek siparişleri birbirinden ayırmak
- Yemekleri ve içecekleri otomatik gruplamak
- Nakit, kart ve karışık ödemeleri kaydetmek
- Kısmi ödeme ve kişi bazlı ödeme desteklemek
- Kapalı siparişleri tüm ayrıntılarıyla saklamak
- İnternet kesildiğinde çalışmaya devam etmek
- Çoklu cihaz kullanımında veri ezilmesini önlemek

### 4.2 Başarı ölçütleri

Festival günü için minimum kabul kriterleri:

- Veri kaybı: `0`
- Çift ödeme: `0`
- Kaybolan veya görünmeyen açık sipariş: `0`
- Kapatılmış siparişte eksik geçmiş: `0`
- Offline kaydedilip senkronize olmayan işlem: `0`
- Açıklanamayan kasa farkı: `0`
- Kritik kullanıcı akışında uygulama çökmesi: `0`
- Yeni sipariş açma süresi: ideal olarak `10–20 saniye`
- Açık siparişi isimle bulma süresi: ideal olarak `5 saniyeden az`

---

## 5. Kapsam Dışı Özellikler

Aşağıdaki özellikler festival pilotunun ana kapsamına dahil değildir:

- Canlı mutfak ekranı/KDS
- Hazırlanıyor, hazır ve servis edildi durumlarının mutfaktan yönetilmesi
- Mutfak yazıcısı entegrasyonu
- QR menüden müşteri siparişi
- Rezervasyon ve bekleme listesi
- Sadakat programı
- Gelişmiş CRM
- Abonelik ve SaaS plan yönetimi
- Online müşteri ödeme sistemi
- Gelişmiş reçete ve maliyet muhasebesi
- Otomatik satın alma ve tedarik yönetimi
- Canlı stok sensörleri
- Çok şubeli kurumsal BI raporları

Bu özellikler gelecekte eklenebilir ancak bir haftalık festival hedefini geciktirmemelidir.

---

## 6. Kullanıcı Rolleri

Festival sürümünde roller sade tutulmalıdır.

### 6.1 Garson

Yetkileri:

- Sipariş oluşturma
- Sipariş adı girme
- Masa/alan seçme
- Ürün ekleme
- Kişi ve ortak hesap oluşturma
- Ek sipariş ekleme
- Ürün notu girme
- İçecekleri götürüldü olarak işaretleme
- Sipariş detayını görüntüleme
- Ödeme alma
- Yetkisi dahilinde ürün iptal etme

### 6.2 Kasiyer

Yetkileri:

- Açık siparişleri görüntüleme
- Tam, kısmi ve karışık ödeme alma
- Para üstü hesaplama
- Sipariş kapatma
- Gün sonu kasa işlemleri
- Ödeme düzeltme talebi oluşturma

### 6.3 Yönetici

Ek yetkileri:

- Kapalı siparişi yeniden açma
- Ödeme düzeltme
- İade oluşturma
- Özel fiyat uygulama
- İndirim ve ikram onaylama
- Ürün tükendi durumu verme
- Kasa kapanışı
- Tüm audit geçmişini görme
- Personel işlemlerini inceleme

### 6.4 PIN ile hızlı kullanıcı geçişi

Festival ortamında sürekli e-posta ve şifre girişi yapılmamalıdır.

Öneri:

- Cihaz bir kez şubeye bağlanır
- Kullanıcılar 4 veya 6 haneli PIN ile geçiş yapar
- Yönetici işlemlerinde yeniden PIN doğrulaması istenir
- Her işlem gerçek kullanıcı kimliğiyle loglanır

---

## 7. Temel Kavramlar

### 7.1 Sipariş

Bir müşteri, grup veya masa için açılan ana kayıt.

Örnekler:

```text
Mehmet Ağa
Hasan Amcalar
Muhtarın Masası
İstanbul'dan Gelenler
Gençler Masası
Çardak Altı
Mavi Gömlekli Grup
```

Sipariş adı benzersiz olmak zorunda değildir. Sistem her sipariş için benzersiz teknik ID üretir.

### 7.2 Sipariş adı

Kullanıcının kendisinin girdiği görünür isimdir.

```text
Görünen ad: Mehmet Ağa
Teknik ID: ORD-20260731-0148
```

### 7.3 Konum

Siparişin fiziksel yerini bulmayı kolaylaştırır.

Alanlar:

- Çardak
- Giriş tarafı
- Sahne önü
- Orman tarafı
- Büyük ağacın yanı
- Serbest açıklama

Masa örnekleri:

```text
A1
A2
B4
Çardak 7
Masa 12
```

### 7.4 Kişi hesabı

Aynı sipariş içindeki bir kişinin ürünlerini ve ödemesini ayırır.

### 7.5 Ortak hesap

Birden fazla kişinin birlikte tükettiği ürünlerin tutulduğu gruptur.

### 7.6 Sipariş batch'i

İlk sipariş ve sonradan eklenen siparişlerin ayrı tutulmasını sağlar.

```text
Batch 1: İlk sipariş
Batch 2: Ek sipariş 1
Batch 3: Ek sipariş 2
```

### 7.7 Fulfillment grubu

Ürünün garson tarafından nasıl ele alınacağını belirtir.

```typescript
"kitchen" | "drinks" | "direct" | "other"
```

- `kitchen`: Mutfağa sözlü olarak söylenecek
- `drinks`: Garsonun götüreceği içecekler
- `direct`: Hazır ve doğrudan verilecek ürün
- `other`: Özel durumlar

---

## 8. Sipariş Durum Modeli

```typescript
type OrderStatus =
  | "draft"
  | "open"
  | "partially_paid"
  | "paid"
  | "closed"
  | "cancelled"
  | "reopened";
```

### 8.1 Draft

Sipariş oluşturulmaya başlanmış ancak henüz kesin olarak kaydedilmemiştir.

### 8.2 Open

Sipariş aktiftir. Ürün eklenebilir, değiştirilebilir ve ödeme alınabilir.

### 8.3 Partially paid

Siparişin bir kısmı ödenmiştir ancak bakiye bulunmaktadır.

### 8.4 Paid

Toplam bakiye sıfırdır fakat sipariş henüz kapanış onayından geçmemiştir.

### 8.5 Closed

Sipariş tamamlanmıştır. Normal kullanıcı doğrudan değiştiremez.

### 8.6 Cancelled

Sipariş tamamen iptal edilmiştir. İptal nedeni zorunludur.

### 8.7 Reopened

Kapalı sipariş yönetici tarafından tekrar açılmıştır. Yeniden açılma nedeni zorunludur.

---

## 9. Ana Kullanıcı Akışları

## 9.1 Yeni sipariş oluşturma

```text
1. + Yeni Sipariş
2. Sipariş adı gir
3. Alan/masa seç veya boş bırak
4. Gerekirse kişi hesapları oluştur
5. Ürünleri ekle
6. Notları ekle
7. Siparişi kaydet
8. Mutfağa söylenecek özeti göster
9. İçecekleri göster
10. Yeni masaya geç
```

### Gereksinimler

- Sipariş adı alanı büyük ve hızlı erişilebilir olmalı
- Son kullanılan müşteri adları önerilmeli
- Masa zorunlu olmamalı
- Sipariş adı daha sonra değiştirilebilmeli
- Aynı isimde birden fazla siparişe izin verilmeli
- Aynı isimli siparişler yer ve saat bilgisiyle ayrılmalı

---

## 9.2 Özel sipariş adı senaryoları

Geçerli örnekler:

```text
Mehmet Ağa
Mehmet Ağa – Çardak
Hasan Amcalar
Muhtar
Düğün Ekibi
Gençler
Mavi Gömlekli Adam
Masa 6
```

Aynı isim iki kez kullanılırsa:

```text
Mehmet Ağa · Çardak · 18:42
Mehmet Ağa · Giriş · 19:15
```

Sistem kullanıcıyı engellememeli; yalnızca olası benzer siparişi göstermelidir.

---

## 9.3 Kişi ve ortak hesaplar

Örnek:

```text
Sipariş: Mehmet Ağa'nın Masası

Mehmet
- 1 Kebap
- 1 Ayran

Hasan
- 2 Köfte
- 1 Kola

Ayşe
- 1 Salata
- 1 Su

Ortak
- 2 Ekmek
- 1 Büyük Salata
```

### Temel işlemler

- Yeni kişi ekle
- Kişi adını değiştir
- Ürünü başka kişiye taşı
- Birden fazla ürünü toplu taşı
- Ürünü ortak hesaba taşı
- Ortak ürünü bir kişiye ata
- Bir kişiyi ayrı ödet
- Ödenen kişiyi kilitle
- Yeni kişi masaya katıldığında hesap ekle
- Ayrılan kişinin hesabını kapat

---

## 9.4 Ek sipariş

Siparişe sonradan eklenen ürünler ilk siparişten ayrılmalıdır.

```text
İlk Sipariş · 18:42
- 2 Köfte
- 2 Ayran

Ek Sipariş 1 · 19:04
- 1 Kebap
- 2 Su

Ek Sipariş 2 · 19:38
- 1 Salata
```

### Gereksinimler

- Her ekleme yeni batch olarak kaydedilebilmeli
- Kullanıcı tüm siparişi veya sadece yeni eklenenleri görebilmeli
- Mutfağa söylenecek özet yalnızca yeni yemekleri gösterebilmeli
- Yeni eklenen içecekler tekrar hatırlatılmalı
- Her batch için saat ve kullanıcı kaydedilmeli

---

## 9.5 Yemek ve içecek ayrımı

Sipariş kaydedildiğinde otomatik özet:

```text
MEHMET AĞA
Çardak 4

MUTFAĞA SÖYLENECEK
- 3 Köfte
- 2 Kebap
- 1 Pirzola
- 2 Salata

GÖTÜRÜLECEK İÇECEKLER
- 3 Ayran
- 2 Kola
- 1 Su
```

### Gereksinimler

- Ayrım ürün bazlı yapılmalı
- Kullanıcı ürünün grubunu gerektiğinde değiştirebilmeli
- Sipariş genel notu ayrı gösterilmeli
- Ürün notu ilgili ürünün altında gösterilmeli
- “Son siparişi göster” butonu ana ekranda bulunmalı

---

## 9.6 İçecek götürme hatırlatıcısı

Basit ve hızlı olmalıdır.

Önerilen ilk sürüm:

```text
[Tüm içecekler götürüldü]
```

Ek siparişle yeni içecek eklenirse durum tekrar bekliyor olmalıdır.

İkinci sürümde tek tek işaretleme desteklenebilir:

```text
✓ 3 Ayran
□ 2 Kola
```

---

## 10. Gerçek Garson Senaryoları

## 10.1 Müşteri sipariş verirken fikir değiştirir

Sipariş henüz kaydedilmediyse ürün doğrudan silinebilir.

Sipariş kaydedildiyse işlem audit kaydında tutulur:

```text
1x Köfte kaldırıldı
Sebep: Müşteri vazgeçti
Garson: Melih
Saat: 18:47
```

---

## 10.2 Yanlış ürün girildi

- Ürün void edilir
- Eski satır fiziksel olarak silinmez
- İptal nedeni kaydedilir
- Doğru ürün ayrı işlem olarak eklenir

```text
1x Pirzola iptal edildi
Sebep: Yanlış ürün girildi
Yerine: 1x Kebap
```

---

## 10.3 Yanlış miktar girildi

```text
Köfte miktarı 3'ten 2'ye düşürüldü
Sebep: Yanlış adet girildi
```

Miktar azaltımı geçmişte görünmelidir.

---

## 10.4 Aynı ürün farklı notlarla istenir

Birleştirilmemesi gereken örnek:

```text
2x Köfte
1x Köfte — Soğansız
1x Köfte — Acılı
```

Satırlar yalnızca ürün, modifier ve notlar tamamen aynıysa birleştirilebilir.

---

## 10.5 Ürün kalmaz

Seçenekler:

```text
[Ürünü kaldır]
[Başka ürünle değiştir]
[İkram ekle]
[Ürünü tükendi olarak işaretle]
```

Değişim örneği:

```text
Pirzola kaldırıldı
Yerine 1x Kebap eklendi
Fiyat farkı: -5 TL
```

---

## 10.6 Müşteri yer değiştirir

```text
Eski konum: Çardak 4
Yeni konum: Çardak 7
```

Eski konum geçmişte korunur.

---

## 10.7 İki masa birleşir

Seçenekler:

```text
Siparişleri ayrı tut
Siparişleri birleştir
```

Birleştirme sonrası kaynak siparişler kaybolmamalıdır.

---

## 10.8 Bir grup ikiye ayrılır

- Seçili kişiler yeni siparişe taşınır
- İlgili ürünler ve ödeme durumları taşınır
- Kaynak sipariş bağlantısı korunur

---

## 10.9 Bir kişi masadan erken ayrılır

- Kendi hesabı ödenir
- Kişi hesabı “ödendi” olarak kilitlenir
- Ana sipariş açık kalır
- Yeni ürünler yanlışlıkla ödenmiş hesaba eklenmemelidir

---

## 10.10 Yeni kişi masaya katılır

- Yeni kişi hesabı eklenir
- Sonraki ürünler bu hesaba yazılır
- Eski ürünler istenirse bu kişiye taşınabilir

---

## 10.11 İki kişi birlikte ödeme yapar

Seçili hesaplar tek ödeme altında birleştirilebilir.

---

## 10.12 Ortak ürünleri bir kişi öder

Ortak hesap tek kişiye atanabilir.

---

## 10.13 Ortak ürün eşit bölünür

İleri sürüm özelliği:

```text
12 TL / 3 kişi = 4 TL kişi başı
```

İlk sürümde ortak ürünleri manuel olarak bir kişiye taşıma yeterlidir.

---

## 10.14 Garson yanlış masayı açar

- Sipariş konumu değiştirilebilir
- Sipariş başka bir açık siparişle birleştirilebilir
- İşlem geçmişi kaydedilir

---

## 10.15 Garson yanlış siparişe ürün ekler

Ürün başka siparişe taşınabilmelidir.

```text
1x Ayran
Mehmet Ağa siparişinden
Hasan Amcalar siparişine taşındı
```

---

## 10.16 Başka garson siparişe ürün ekler

Her işlem kullanıcı ve cihaz bilgisiyle kaydedilir.

```text
2x Ayran eklendi
Garson: Ahmet
Cihaz: Telefon 2
Saat: 19:04
```

---

## 10.17 Sipariş başka garsona devredilir

```text
Siparişi devret → Ahmet
```

Siparişi açan ilk kullanıcı ve devralan kullanıcı geçmişte görünür.

---

## 10.18 İki cihaz aynı anda değişiklik yapar

Farklı ürün eklemeleri birleştirilmelidir.

Aynı alan değişirse conflict ekranı gösterilir:

```text
Buluttaki değer: 3
Senin değerin: 2

[3 Kullan]
[2 Kullan]
[Ürünleri ayrı tut]
```

---

## 10.19 Sipariş kaydedildi mi emin olunamaz

Aynı cihazdan kısa süre içinde benzer sipariş algılanırsa:

```text
Benzer bir sipariş 8 saniye önce kaydedildi.

[Mevcut siparişi aç]
[Yine de yeni oluştur]
```

---

## 10.20 Uygulama kapanır

- Açık taslak yerel olarak saklanır
- Yeniden açıldığında devam etme seçeneği sunulur
- Kaydedilmiş sipariş tekrar oluşturulmaz

---

## 10.21 Telefonun şarjı biter

- Aynı kullanıcı başka cihazdan açık siparişleri görebilir
- Senkronize olmayan işlemler açıkça belirtilir
- Cihazda bekleyen veriler tekrar açıldığında gönderilir

---

## 10.22 İnternet kesilir

Uygulama sipariş ve ödemeleri yerel olarak kaydetmeye devam eder.

```text
OFFLINE
5 işlem senkronizasyon bekliyor
```

İnternet geldiğinde sıra kontrollü şekilde gönderilir.

---

## 10.23 Ödeme kaydedilirken internet gider

Ödeme `pending_sync` olarak tutulur.

```text
Ödeme cihazda kaydedildi
Senkronizasyon bekliyor
```

Aynı siparişin ikinci kez ödenmesi engellenir.

---

## 10.24 Sipariş yanlışlıkla kapatılır

Kapatmadan önce özet gösterilir:

```text
Mehmet Ağa siparişini kapatıyorsun.
Toplam: 84 TL
Ödenen: 84 TL
Kalan: 0 TL
```

Kapalı sipariş yalnızca yönetici tarafından yeniden açılabilir.

---

## 10.25 Ödenmemiş sipariş kapatılmak istenir

Normal kapanış engellenir.

Yönetici seçenekleri:

```text
Veresiye olarak kapat
İkram olarak kapat
Zarar olarak kapat
Vazgeç
```

---

## 10.26 Müşteri beklemeden gider

Sipariş tamamen iptal edilir veya tahsil edilemeyen bakiye olarak kaydedilir.

Sebep zorunludur.

---

## 10.27 Tanıdık müşteri sonra ödeyecek

Ödeme durumu:

```typescript
"unpaid_credit"
```

Veresiye işlemleri ayrı raporda görünmelidir.

---

## 11. Ürün ve Modifier Kuralları

### 11.1 Hazır notlar

- Soğansız
- Acısız
- Az pişmiş
- İyi pişmiş
- Salatasız
- Ekmeksiz
- Ekstra ekmek
- Buzsuz
- Soğuk olmasın

### 11.2 Serbest not

Hazır notların yetmediği durumlarda serbest metin kullanılabilir.

### 11.3 Porsiyon seçenekleri

- Normal
- Yarım
- Çift
- Çocuk porsiyonu
- Özel fiyat

Özel fiyat yönetici PIN'i gerektirir.

### 11.4 Ürün birleştirme kuralı

İki ürün satırı yalnızca aşağıdakiler aynıysa otomatik birleştirilir:

- Ürün ID
- Birim fiyat
- Modifier'lar
- Notlar
- İndirim tipi
- Fulfillment grubu
- Batch numarası
- Kişi hesabı

---

## 12. İptal, İkram, İndirim ve İade

## 12.1 Ürün iptal nedenleri

- Yanlış girildi
- Müşteri vazgeçti
- Ürün kalmadı
- Yanlış hazırlandı
- Fazla hazırlandı
- Müşteri ayrıldı
- İkram edildi
- Personel tüketti
- Diğer

### Kurallar

- İptal edilen ürün fiziksel olarak silinmez
- İptal eden kullanıcı kaydedilir
- Tarih ve saat kaydedilir
- Sebep zorunludur
- İptal tutarı raporda görünür

---

## 12.2 İndirim

İndirim türleri:

- Sipariş geneli indirim
- Ürün bazlı indirim
- Yüzdesel indirim
- Sabit tutar indirimi
- Tanıdık indirimi
- Yönetici indirimi

İndirim nedeni ve onaylayan kullanıcı kaydedilir.

---

## 12.3 İkram

Ürün fiyatı sıfıra çevrilmez; normal fiyat ve ikram kaydı ayrı tutulur.

```text
1x Ayran
Normal fiyat: 3 TL
İkram: -3 TL
Net: 0 TL
```

Bu sayede gerçek tüketim ve ciro kaybı görülebilir.

---

## 12.4 Personel yemeği

- Ciroya dahil edilmez
- Tüketim raporunda görünür
- Gerekirse stoktan düşer
- Personel ve onaylayan yönetici kaydedilir

---

## 12.5 İade

Ödeme sonrası ürün iptali “iade” olarak işlenir.

İade türleri:

- Tam iade
- Kısmi iade
- Ürün bazlı iade
- Ödeme yöntemi düzeltmesi

Her iade orijinal sipariş ve ödeme kaydıyla ilişkilidir.

---

## 13. Ödeme Sistemi

## 13.1 Desteklenen ödeme yöntemleri

- Nakit
- Kart
- Karışık
- Veresiye
- İkram
- Personel
- Diğer

---

## 13.2 Tüm hesabı tek kişi öder

```text
Toplam: 84 TL
Ödeyen: Mehmet Ağa
Yöntem: Nakit
```

---

## 13.3 Kişi bazlı ödeme

```text
Mehmet: 28 TL — Ödendi
Hasan: 36 TL — Ödendi
Ayşe: 20 TL — Açık
```

---

## 13.4 Kısmi ödeme

```text
Toplam: 100 TL
Ödenen: 60 TL
Kalan: 40 TL
```

---

## 13.5 Karışık ödeme

```text
50 TL Nakit
30 TL Kart
20 TL Veresiye
```

---

## 13.6 Para üstü

```text
Toplam: 37 TL
Alınan: 50 TL
Para üstü: 13 TL
```

Kapatılmış siparişte alınan nakit ve para üstü görünmelidir.

---

## 13.7 Para üstü alınmazsa

Sistem otomatik bahşiş varsaymamalıdır.

```text
[Bahşiş olarak kaydet]
[Kasada fazla olarak bırak]
[Para üstü verildi]
```

---

## 13.8 Yanlış ödeme yöntemi

Ödeme silinmez. Ters kayıt oluşturulur.

```text
Eski ödeme: +40 TL Nakit
Düzeltme: -40 TL Nakit
Yeni ödeme: +40 TL Kart
```

---

## 13.9 Çift ödeme koruması

Her ödeme için idempotency key kullanılmalıdır.

Örnek:

```text
payment:{orderId}:{deviceId}:{localOperationId}
```

Aynı ödeme isteği iki kez gönderilse bile tek kayıt oluşmalıdır.

---

## 14. Sipariş Kapatma Kuralları

Sipariş kapatılmadan önce aşağıdakiler kontrol edilir:

- Kalan bakiye sıfır mı?
- Bekleyen offline ödeme var mı?
- Çözülmemiş conflict var mı?
- Henüz kaydedilmemiş değişiklik var mı?
- Siparişte iptal nedeni eksik ürün var mı?

### Kapatma özeti

```text
Sipariş: Mehmet Ağa
Toplam: 84 TL
Ödenen: 84 TL
Kalan: 0 TL
İptal edilen ürün: 1
İndirim: 10 TL

[Kapat]
[Vazgeç]
```

### Kapalı siparişi yeniden açma

- Yönetici PIN'i gerektirir
- Sebep zorunludur
- Eski kapanış zamanı korunur
- Yeni kapanış ayrı olay olarak kaydedilir

---

## 15. Kapatılmış Sipariş Arşivi

Arşiv Orderia'nın en kritik parçalarından biridir.

### 15.1 Arşiv bölümleri

```text
Siparişler
├── Açık Siparişler
├── Kısmen Ödenenler
├── Bugün Kapatılanlar
├── İptal Edilenler
├── Veresiye Siparişler
└── Tüm Arşiv
```

### 15.2 Arama kriterleri

- Sipariş adı
- Müşteri adı
- Kişi hesabı adı
- Masa
- Alan
- Sipariş numarası
- Garson
- Ürün adı
- Tarih
- Saat aralığı
- Ödeme yöntemi
- Tutar aralığı
- İptal nedeni
- Durum
- Cihaz

### 15.3 Arşiv kartı

```text
MEHMET AĞA
Çardak 4
31 Temmuz 2026 · 18:42
84 TL · Nakit
Kapalı
```

---

## 16. Kapatılmış Sipariş Detay Ekranı

Kapalı sipariş açıldığında aşağıdaki bilgiler eksiksiz görünmelidir.

## 16.1 Temel bilgiler

- Sipariş adı
- Teknik sipariş ID
- Alan
- Masa
- Açılış zamanı
- Kapanış zamanı
- Toplam açık kalma süresi
- Durum
- Kaynak sipariş veya birleşme bağlantıları

## 16.2 Personel bilgileri

- Siparişi açan kişi
- Siparişe işlem yapan tüm kullanıcılar
- Siparişi devralan kullanıcılar
- Siparişi kapatan kişi
- Yeniden açan yönetici

## 16.3 Kişi ve ortak hesaplar

Her kişi için:

- Ürünler
- Notlar
- İndirimler
- İptaller
- Ara toplam
- Ödeme durumu
- Ödeme yöntemi
- Ödeme zamanı

## 16.4 İlk ve ek siparişler

```text
İlk Sipariş · 18:42
Ek Sipariş 1 · 19:04
Ek Sipariş 2 · 19:38
```

Her batch ayrı görüntülenmelidir.

## 16.5 Ürün geçmişi

Örnek:

```text
Köfte

18:42 — 2 adet eklendi
19:05 — Miktar 2'den 3'e çıkarıldı
19:07 — 1 adet iptal edildi
Sebep: Yanlış girildi

Son miktar: 2
```

## 16.6 İptaller ve değişiklikler

- İptal edilen ürün
- İptal miktarı
- İptal eden kullanıcı
- Tarih/saat
- Sebep
- Yerine eklenen ürün
- Finansal etkisi

## 16.7 İndirim ve ikramlar

- Tür
- Tutar
- Sebep
- Onaylayan kullanıcı
- İlgili ürün veya sipariş

## 16.8 Ödeme detayları

- Brüt ürün toplamı
- İndirimler
- İptaller
- İkramlar
- Net toplam
- Ödenen toplam
- Kalan bakiye
- Ödeme kayıtları
- Alınan nakit
- Para üstü
- İadeler
- Düzeltmeler

## 16.9 Zaman çizelgesi

```text
18:42 — Sipariş oluşturuldu
18:43 — 2x Köfte eklendi
18:44 — 2x Ayran eklendi
19:04 — Ek sipariş açıldı
19:12 — Pirzola iptal edildi
19:13 — Yerine Kebap eklendi
19:42 — 24 TL kart ödeme alındı
20:10 — 50 TL nakit ödeme alındı
20:11 — Sipariş kapatıldı
```

## 16.10 Teknik bilgiler

Yönetici görünümünde:

- Oluşturan cihaz
- Son işlem cihazı
- Offline oluşturuldu mu?
- Sunucuya ilk senkronizasyon zamanı
- Bekleyen işlem oldu mu?
- Conflict yaşandı mı?
- Conflict çözüm şekli
- Receipt snapshot ID
- Uygulama sürümü

---

## 17. Audit ve Veri Değişmezliği

### 17.1 Temel ilke

Hiçbir finansal veya operasyonel işlem fiziksel olarak silinmemelidir.

Kullanıcı ürünü kaldırdığında kayıt şöyle kalır:

```typescript
{
  status: "voided",
  voidReason: "Yanlış girildi",
  voidedBy: "user_123",
  voidedAt: "2026-07-31T19:07:00+03:00"
}
```

### 17.2 Event kayıtları

Önerilen olay türleri:

```typescript
type OrderEventType =
  | "order_created"
  | "order_renamed"
  | "location_changed"
  | "person_added"
  | "person_renamed"
  | "item_added"
  | "item_quantity_changed"
  | "item_note_changed"
  | "item_moved"
  | "item_voided"
  | "batch_created"
  | "discount_applied"
  | "complimentary_applied"
  | "payment_created"
  | "payment_reversed"
  | "refund_created"
  | "order_transferred"
  | "order_merged"
  | "order_split"
  | "order_closed"
  | "order_reopened"
  | "order_cancelled"
  | "sync_conflict_detected"
  | "sync_conflict_resolved";
```

### 17.3 Kapalı sipariş snapshot'ı

```typescript
type ClosedOrderArchive = {
  finalSnapshot: OrderSnapshot;
  events: OrderEvent[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  receipt: ReceiptSnapshot;
};
```

Snapshot kapatılma anındaki nihai görünümü korur. Event listesi ise o noktaya nasıl gelindiğini açıklar.

---

## 18. Önerilen Veri Modeli

```typescript
type FestivalOrder = {
  id: string;
  tenantId: string;
  branchId: string;

  displayName: string;
  tableLabel?: string;
  areaLabel?: string;
  locationNote?: string;

  status:
    | "draft"
    | "open"
    | "partially_paid"
    | "paid"
    | "closed"
    | "cancelled"
    | "reopened";

  activeWaiterId?: string;
  openedByUserId: string;
  closedByUserId?: string;

  groups: OrderGroup[];
  batches: OrderBatch[];
  payments: PaymentRecord[];

  subtotal: number;
  discountTotal: number;
  complimentaryTotal: number;
  voidTotal: number;
  grandTotal: number;
  paidTotal: number;
  balanceDue: number;

  drinksDeliveredAt?: string;

  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  cancelledAt?: string;

  version: number;
};
```

```typescript
type OrderGroup = {
  id: string;
  name: string;
  type: "person" | "shared";
  paymentStatus: "unpaid" | "partial" | "paid";
  createdAt: string;
};
```

```typescript
type OrderBatch = {
  id: string;
  orderId: string;
  sequence: number;
  label: string;
  createdByUserId: string;
  createdAt: string;
};
```

```typescript
type OrderItem = {
  id: string;
  orderId: string;
  batchId: string;
  groupId: string;

  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;

  fulfillmentGroup: "kitchen" | "drinks" | "direct" | "other";
  modifiers: string[];
  notes?: string[];

  status: "active" | "voided" | "refunded";
  voidReason?: string;
  voidedByUserId?: string;
  voidedAt?: string;

  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};
```

```typescript
type PaymentRecord = {
  id: string;
  orderId: string;
  groupIds?: string[];

  type: "payment" | "reversal" | "refund";
  method: "cash" | "card" | "mixed" | "credit" | "complimentary" | "other";

  amount: number;
  cashReceived?: number;
  changeGiven?: number;

  idempotencyKey: string;
  status: "pending_sync" | "confirmed" | "reversed" | "failed";

  createdByUserId: string;
  createdAt: string;
};
```

```typescript
type OrderEvent = {
  id: string;
  orderId: string;
  type: string;
  actorUserId: string;
  deviceId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  syncedAt?: string;
};
```

---

## 19. Offline ve Senkronizasyon Tasarımı

### 19.1 Gereksinimler

- Siparişler offline oluşturulabilmeli
- Ürün ekleme ve değiştirme offline çalışmalı
- Ödeme offline kaydedilebilmeli
- Outbox kalıcı olmalı
- Uygulama kapanınca bekleyen işlemler kaybolmamalı
- Kullanıcı bekleyen işlem sayısını görmeli
- Senkronizasyon hatası sessiz kalmamalı

### 19.2 Durum göstergesi

```text
● Online — Senkronize
● Offline — 14 işlem bekliyor
● Senkronize ediliyor
● Senkronizasyon hatası
```

### 19.3 Outbox kaydı

Her işlem için:

- Local operation ID
- Sipariş ID
- İşlem tipi
- Payload
- Oluşturulma zamanı
- Retry sayısı
- Son hata
- Idempotency key

### 19.4 Conflict politikası

- Farklı ürün eklemeleri: birleştir
- Aynı ürün miktar değişikliği: kullanıcıya sor
- Sipariş adı değişikliği: son değişiklik + audit
- Ödeme: asla otomatik birleştirme yapma; idempotency ile doğrula
- Kapalı siparişe offline işlem: conflict olarak işaretle

---

## 20. Ekran Yapısı

## 20.1 Ana ekran

```text
+ YENİ SİPARİŞ

Son Açılanlar
- Mehmet Ağa
- Hasan Amcalar
- Gençler

Açık Siparişler: 14
Kısmen Ödenenler: 3
Bugün Kapatılanlar: 48

[Son Siparişi Göster]
[İsimle Ara]
```

## 20.2 Açık sipariş kartı

```text
MEHMET AĞA
Çardak 4
84 TL · 3 kişi
Son işlem: 4 dakika önce

[Ürün Ekle]
[Hesap]
[Detay]
```

## 20.3 Yeni sipariş ekranı

- Sipariş adı
- Son kullanılan isimler
- Alan
- Masa
- Kişi sekmeleri
- Ürün kategorileri
- Büyük ürün butonları
- Hızlı notlar
- Kaydet ve özeti göster

## 20.4 Sipariş özeti

Sekmeler:

```text
[Tümü]
[Mutfağa Söylenecek]
[İçecekler]
[Yeni Eklenenler]
[Hesaplar]
```

## 20.5 Ödeme ekranı

- Sipariş toplamı
- Kişi hesapları
- Ödenen
- Kalan
- Nakit
- Kart
- Karışık
- Alınan para
- Para üstü
- Ödemeyi kaydet
- Siparişi kapat

## 20.6 Arşiv ekranı

- Arama
- Tarih filtresi
- Durum filtresi
- Ödeme filtresi
- Garson filtresi
- Ürün filtresi
- Arşiv kartları

---

## 21. Gün Sonu ve Kasa

### 21.1 Vardiya açılışı

```text
Başlangıç nakdi: 300 TL
Kasiyer: Melih
Cihaz: Kasa 1
Başlangıç: 15:30
```

### 21.2 Gün içi takip

- Nakit satış
- Kart satış
- Karışık ödeme
- Veresiye
- İptal
- İade
- İndirim
- İkram
- Personel yemeği
- Masraf
- Açık sipariş
- Kısmen ödenmiş sipariş

### 21.3 Hızlı masraf kaydı

Örnek kategoriler:

- Buz
- Ekmek
- Su
- Yakıt
- Eksik malzeme
- Personel ödemesi
- Diğer

```text
Masraf: 50 TL
Kategori: Buz
Açıklama: 5 torba buz
```

### 21.4 Vardiya kapanışı

```text
Beklenen nakit: 4.820 TL
Sayılan nakit: 4.790 TL
Fark: -30 TL

Kart toplamı: 1.320 TL
Veresiye: 120 TL
Toplam satış: 6.140 TL
```

Fark varsa açıklama zorunludur.

---

## 22. Raporlama

Festival sürümü için gerekli raporlar:

### 22.1 Günlük satış özeti

- Brüt satış
- Net satış
- Nakit
- Kart
- Veresiye
- İndirim
- İkram
- İptal
- İade
- Masraf

### 22.2 Ürün satış raporu

- Ürün adı
- Satılan miktar
- İptal miktarı
- İkram miktarı
- Net satış tutarı

### 22.3 Garson işlem raporu

- Açtığı sipariş sayısı
- Eklediği ürünler
- Aldığı ödemeler
- İptal ettiği ürünler
- Uyguladığı indirimler

### 22.4 Veresiye raporu

- Sipariş adı
- Kişi
- Tutar
- Tarih
- Not
- Tahsil durumu

### 22.5 Audit raporu

- Yeniden açılan siparişler
- Ödeme düzeltmeleri
- İadeler
- Yönetici işlemleri
- Conflict çözümleri

---

## 23. Fiş, PDF ve Paylaşım

Kapalı siparişten:

- PDF oluştur
- Termal yazıcıya gönderme için hazır yapı
- WhatsApp ile paylaş
- Metin olarak paylaş
- CSV dışa aktar

Fişte bulunması gerekenler:

- Sipariş adı
- Tarih ve saat
- Alan/masa
- Ürünler
- Kişi hesapları
- İndirimler
- İkramlar
- İptaller
- Net toplam
- Ödeme yöntemleri
- Garson

PDF üzerinde açıkça şu belirtilmelidir:

> Bu belge mali fiş değildir.

---

## 24. Teknik İş Kuralları

1. Sipariş adı benzersiz olmak zorunda değildir.
2. Teknik sipariş ID her zaman benzersizdir.
3. Kapalı sipariş doğrudan düzenlenemez.
4. Finansal kayıt fiziksel olarak silinemez.
5. Ödeme düzeltmesi ters kayıtla yapılır.
6. İptal nedeni zorunludur.
7. Yeniden açma nedeni zorunludur.
8. Yönetici işlemleri PIN doğrulaması gerektirir.
9. Her işlem kullanıcı, cihaz ve zaman bilgisi taşır.
10. Offline işlem idempotent biçimde senkronize edilir.
11. Ürün adı ve fiyatı sipariş anında snapshot olarak saklanır.
12. Menü fiyatı daha sonra değişse bile eski sipariş etkilenmez.
13. Kişi hesabı ödendikten sonra yeni ürün eklenirse kullanıcı uyarılır.
14. Kalan bakiye sıfır değilse normal kapanış engellenir.
15. Kapalı sipariş arşivi final snapshot ve event geçmişini birlikte saklar.

---

## 25. API ve Servis Operasyonları

Önerilen servis işlemleri:

```text
createOrder
renameOrder
changeOrderLocation
addOrderGroup
renameOrderGroup
addOrderBatch
addOrderItem
updateOrderItemQuantity
updateOrderItemNotes
moveOrderItem
voidOrderItem
applyDiscount
applyComplimentary
createPayment
reversePayment
createRefund
transferOrder
mergeOrders
splitOrder
closeOrder
reopenOrder
cancelOrder
getOrderArchive
searchClosedOrders
getOrderTimeline
```

Finansal operasyonlar mümkünse server-side transaction veya Supabase RPC üzerinden yürütülmelidir.

---

## 26. Güvenlik ve Yetkilendirme

- Tenant izolasyonu RLS ile korunmalı
- Branch kapsamı doğrulanmalı
- Garson başka şubenin siparişini görememeli
- Yönetici işlemleri rol kontrolü gerektirmeli
- Cihaz iptal/revoke desteği korunmalı
- Audit event'leri son kullanıcı tarafından değiştirilememeli
- Receipt snapshot immutable olmalı
- Ödeme ve iade işlemleri server-side doğrulanmalı

---

## 27. Test Planı

## 27.1 Unit testler

- Sipariş toplamı hesaplama
- Kişi hesabı toplamı
- Ortak ürün atama
- İndirim hesaplama
- İptal toplamı
- Para üstü
- Kısmi ödeme
- Karışık ödeme
- Batch oluşturma
- Ürün birleştirme kuralları
- Durum geçişleri

## 27.2 Database testleri

- RLS tenant izolasyonu
- Ödeme idempotency
- Kapatma transaction'ı
- Yeniden açma audit kaydı
- Split ve merge bütünlüğü
- Refund bağlantısı
- Void geçmişi
- Receipt snapshot değişmezliği
- Concurrent update kontrolü

## 27.3 E2E senaryoları

1. Yeni sipariş oluştur
2. Özel isim ver
3. Kişi ekle
4. Ürünleri kişilere ayır
5. Ek sipariş oluştur
6. Yemek/içecek özetini doğrula
7. Bir ürünü başka kişiye taşı
8. Bir ürünü iptal et
9. Kısmi ödeme al
10. Kalanı kartla öde
11. Siparişi kapat
12. Arşivde tüm geçmişi doğrula
13. Siparişi yeniden aç
14. Düzeltme yap
15. Yeniden kapat

## 27.4 Offline testleri

- İnterneti kapatıp sipariş oluşturma
- Offline ürün ekleme
- Offline ödeme
- Uygulamayı kapatıp açma
- Aynı işlemin tekrar gönderilmesi
- İnternet gelince senkronizasyon
- Conflict çözümü
- İkinci cihazdan siparişi görme

## 27.5 Stres testi

- 3–5 cihaz
- Aynı anda 30–50 sipariş
- Aynı siparişe iki cihazdan işlem
- 100+ ödeme işlemi
- İnternetin aralıklı kesilmesi
- Uygulama restart
- Düşük pil ve cihaz değişimi

---

## 28. Yedi Günlük Uygulama Planı

## Gün 1 — Festival Mode ve hızlı sipariş

- Festival Mode feature flag
- Ana ekran sadeleştirme
- Özel sipariş adı
- Alan/masa alanları
- Son kullanılan isimler
- Büyük ürün butonları
- Hızlı notlar

### Gün 1 kabul kriteri

- Kullanıcı 20 saniye içinde isimli sipariş açabilmeli
- Sipariş listesinde ad, yer ve saat görünmeli

---

## Gün 2 — Kişiler, ortak hesap ve batch

- Kişi hesabı oluşturma
- Ortak hesap
- Ürünü kişi hesabına ekleme
- Ürünü hesaplar arasında taşıma
- Ek sipariş batch'leri
- İlk sipariş ve ek sipariş ayrımı

### Gün 2 kabul kriteri

- Bir masa içindeki üç kişi ayrı takip edilebilmeli
- Sonradan eklenen ürünler ayrı batch'te görünmeli

---

## Gün 3 — Yemek/içecek özeti ve sipariş detayları

- Fulfillment grupları
- Mutfağa söylenecek özet
- İçecek özeti
- Son siparişi göster
- Sadece yeni eklenenleri göster
- İçecekler götürüldü işareti

### Gün 3 kabul kriteri

- Garson siparişi tek ekranda okuyup mutfağa sözlü aktarabilmeli

---

## Gün 4 — İptal, değişiklik ve audit

- Ürün iptali
- İptal nedeni
- Miktar değişikliği geçmişi
- Not değişikliği geçmişi
- Ürün taşıma geçmişi
- Timeline altyapısı
- Yönetici PIN'i

### Gün 4 kabul kriteri

- Hiçbir değişiklik fiziksel olarak silinmemeli
- Her işlem kullanıcı ve zaman bilgisiyle görünmeli

---

## Gün 5 — Ödeme ve kapanış

- Tam ödeme
- Kişi bazlı ödeme
- Kısmi ödeme
- Nakit/kart/karışık
- Para üstü
- Veresiye
- Kapatma kontrolü
- Yeniden açma

### Gün 5 kabul kriteri

- Kalan bakiye doğru hesaplanmalı
- Çift ödeme oluşmamalı
- Kapalı sipariş yönetici dışında değiştirilememeli

---

## Gün 6 — Arşiv ve offline güvenilirlik

- Kapalı sipariş arşivi
- Arama ve filtreler
- Tam sipariş detay ekranı
- Zaman çizelgesi
- Offline durum göstergesi
- Outbox görünümü
- Senkronizasyon hataları
- CSV yedek

### Gün 6 kabul kriteri

- Kapatılmış bir sipariş tüm ayrıntılarıyla bulunabilmeli
- Offline işlemler internet geldikten sonra eksiksiz senkronize olmalı

---

## Gün 7 — Gerçek festival provası

- Gerçek menü ve fiyatlar
- Gerçek kullanıcılar
- Gerçek cihazlar
- Gerçek alan ve masa isimleri
- 30–60 dakika kesintisiz yoğun sipariş simülasyonu
- İnternet kesintisi
- Cihaz değişimi
- Kısmi ödeme
- İptal
- Veresiye
- Gün sonu kasa mutabakatı

### Gün 7 kabul kriteri

- Veri kaybı yok
- Çift ödeme yok
- Açıklanamayan finansal fark yok
- Kritik akışta çökme yok
- Personel uygulamayı açıklama almadan temel seviyede kullanabiliyor

---

## 29. Önceliklendirilmiş Backlog

## P0 — Festivalden önce zorunlu

1. Festival Mode
2. Özel sipariş adı
3. Alan/masa bilgisi
4. Açık sipariş listesi ve arama
5. Kişi ve ortak hesaplar
6. Ürünü hesaplar arasında taşıma
7. Ek sipariş batch'leri
8. Yemek/içecek ayrımı
9. Son siparişi gösterme
10. Ürün iptali ve nedenleri
11. Audit timeline
12. Tam/kısmi/kişi bazlı ödeme
13. Nakit/kart/karışık ödeme
14. Para üstü
15. Sipariş kapatma kontrolü
16. Kapalı sipariş arşivi
17. Tam kapalı sipariş detayı
18. Yönetici PIN'iyle yeniden açma
19. Offline durum göstergesi
20. Kalıcı outbox ve retry
21. CSV/yedek dışa aktarma

## P1 — Çok değerli, zaman kalırsa

- İndirim
- İkram
- Personel yemeği
- Veresiye raporu
- Sipariş birleştirme
- Sipariş bölme
- Garson devri
- Ürün tükendi
- Hızlı masraf kaydı
- Kasa açılışı/kapanışı
- PDF/WhatsApp paylaşımı

## P2 — Festival sonrası

- Mutfak ekranı/KDS
- Termal yazıcı
- Gelişmiş stok
- Reçete maliyeti
- QR sipariş
- Rezervasyon
- Sadakat
- CRM
- SaaS abonelikleri
- Çok şubeli gelişmiş raporlama

---

## 30. Festival Günü Operasyon Kontrol Listesi

### Cihazlar

- Tüm cihazlar tam şarjlı
- Powerbank hazır
- Şarj kabloları etiketli
- Ekran parlaklığı yeterli
- Uygulama sürümü aynı
- Cihaz saatleri doğru

### Kullanıcılar

- Her kullanıcı PIN'ini biliyor
- Yönetici PIN'i yalnızca yetkili kişilerde
- Kimlerin ödeme alacağı belli
- Kimlerin sipariş kapatacağı belli

### Menü

- Ürün adları doğru
- Fiyatlar doğru
- Hızlı notlar hazır
- Yemek/içecek grupları doğru
- Tükenecek ürünler için hızlı pasifleştirme hazır

### Veri

- Yerel veritabanı çalışıyor
- Offline test yapıldı
- Outbox boş
- Son yedek alındı
- CSV export test edildi

### Operasyon

- Alan ve masa isimleri personele anlatıldı
- Sipariş isimlendirme standardı belirlendi
- Kişi hesabı kullanım şekli anlatıldı
- İptal nedenleri anlatıldı
- Gün sonu kasa sorumlusu belirlendi

---

## 31. Riskler ve Önlemler

### Risk: Çok fazla özellik yetiştirmeye çalışma

**Önlem:** P0 dışındaki özellikler ertelenir.

### Risk: Garson ekranında fazla tıklama

**Önlem:** Büyük butonlar, son kullanılanlar ve varsayılan seçimler kullanılır.

### Risk: İnternet kesintisi

**Önlem:** Offline-first local transaction ve kalıcı outbox.

### Risk: Çift ödeme

**Önlem:** Idempotency key ve ödeme pending durumu.

### Risk: Siparişlerin aynı isimde olması

**Önlem:** Alan, masa ve saat bilgisiyle ayırma.

### Risk: Kapalı siparişin değiştirilmesi

**Önlem:** Immutable snapshot ve yönetici kontrollü reopen.

### Risk: Kasa farkı

**Önlem:** Nakit/kart ayrımı, para üstü kaydı, masraf kaydı ve audit timeline.

### Risk: Cihaz kaybı veya batarya bitmesi

**Önlem:** Çoklu cihaz erişimi, powerbank ve senkronizasyon kontrolü.

### Risk: Kullanıcıların uygulamayı öğrenememesi

**Önlem:** Gerçek festivalden önce yoğun prova.

---

## 32. Definition of Done

Bir özellik tamamlandı sayılmak için:

- UI akışı çalışıyor
- Veri modeli ve migration hazır
- RLS/authorization doğru
- Offline davranışı test edildi
- Audit event oluşturuluyor
- Hata durumu kullanıcıya gösteriliyor
- Unit test var
- En az bir E2E senaryosu var
- Fiziksel Android cihazda test edildi
- iPhone Safari/PWA üzerinde temel test yapıldı
- Arşivde doğru görünümü doğrulandı

Festival pilotu tamamlandı sayılmak için:

- CI yeşil
- Kritik lint/format hatası yok
- DB testleri çalışıyor
- Gerçek cihaz testleri tamamlandı
- Veri kaybı yok
- Çift ödeme yok
- Açıklanamayan kasa farkı yok
- Açık P0 hata yok
- Personel provası başarılı

---

## 33. Gelecek Yol Haritası

Festival sonrasında gerçek kullanım verilerine göre sırayla:

1. Minimal mutfak ekranı
2. Termal yazıcı
3. Kasa kapanışı geliştirmeleri
4. İade ve düzeltme merkezi
5. Kullanıcı/rol yönetimi
6. Basit stok ve ürün tükendi tahmini
7. Paket servis/gel-al
8. QR menü
9. Rezervasyon
10. SaaS abonelik ve plan yönetimi

---

## 34. Son Karar

Orderia Festival Mode'un başarısı özellik sayısıyla ölçülmemelidir.

Başarılı ürün şudur:

- Garson siparişi hızlı yazar
- Sipariş ismiyle hemen bulur
- Mutfağa ne söyleyeceğini karıştırmaz
- İçecekleri unutmaz
- Ek siparişleri ilk siparişten ayırır
- Kişilerin hesaplarını doğru böler
- Ödemeyi doğru kaydeder
- Yanlış işlemi iz bırakmadan silemez
- İnternet kesilse bile çalışır
- Kapatılmış sipariş aylar sonra eksiksiz açılabilir

Bu pilot sürümün tek ve net amacı:

> Yoğun festival ortamında tek bir siparişin, ödemenin veya değişikliğin kaybolmasına izin vermeyen hızlı ve güvenilir garson uygulaması oluşturmak.
