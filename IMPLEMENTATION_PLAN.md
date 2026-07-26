# Orderia 2.0 — Implementation Plan

> Durum: Planlandı
> Tarih: 2026-07-26
> Hedef ürün: Çok şubeli, local-first, PWA + Android uygulaması olarak çalışan hızlı garson sipariş defteri
> Ana kullanıcılar: Garson ve yönetici
> Cloud platformu: Supabase (Auth, PostgreSQL, Realtime, Storage, Edge Functions)
> İstemciler: Android telefon uygulaması ve iPhone Safari/Home Screen PWA

---

## 1. Yönetici özeti

Orderia 2.0, mevcut cihaz-local restoran uygulamasının görsel olarak yenilenmiş bir sürümü olmayacaktır. Ürün; yoğun servis sırasında tek elle kullanılabilen, internet kesildiğinde çalışmaya devam eden, aynı masada birden fazla garsonun güvenle işlem yapabildiği ve bütün işlemleri geriye dönük kanıtlayabilen bir servis çalışma alanına dönüştürülecektir.

Temel ürün vaadi:

> Bir garson, yoğun servis sırasında müşteriye bakmayı bırakmadan birkaç dokunuşla doğru hesaba doğru ürünü ekleyebilmeli; yaptığı işlem anında cihazda görünmeli, bağlantı gelince güvenle senkronize olmalı ve daha sonra kimin ne yaptığı tartışmasız biçimde görülebilmelidir.

Planın öncelik sırası Aarron Walter hiyerarşisine göre şöyledir:

1. **Functional:** Sipariş, ayrı hesap, ödeme, masa taşıma/birleştirme ve fiş arşivi doğru çalışmalı.
2. **Reliable:** Offline kullanım, eşzamanlı cihazlar ve uygulama kapanması veri kaybı veya çift işlem oluşturmamalı.
3. **Usable:** Garsonun sık kullandığı işlemler 1–3 dokunuşta yapılmalı.
4. **Pleasurable:** Animasyon, tema ve görsel detaylar ancak ilk üç katman tamamlandıktan sonra eklenmeli.

Bu doküman aşağıdaki kararları kesinleştirir:

- Ürün çok şubeli SaaS olarak tasarlanacaktır.
- Her kullanıcı ayrı kimliğe sahip olacaktır; ortak garson hesabı kullanılmayacaktır.
- Roller ilk sürümde `waiter` ve `manager` olacaktır.
- Mevcut UI görsel veya yapısal temel olarak korunmayacak; garson ve yönetici arayüzleri sıfırdan tasarlanacaktır.
- Aynı masaya birden fazla garson eşzamanlı sipariş ekleyebilecektir.
- Her sipariş satırı ve değişiklik, işlemi yapan garsonla ilişkilendirilecektir.
- Native Android istemci local veriyi SQLite içinde tutacaktır.
- Web/PWA istemcisi local veriyi IndexedDB içinde tutacaktır.
- Supabase PostgreSQL bulut tarafındaki kalıcı ve yetkili kayıt olacaktır.
- Realtime yalnızca hızlandırıcı bildirim katmanı olacaktır; kaçırılan olaylar cursor tabanlı pull sync ile tamamlanacaktır.
- Ödeme, hesap bölme, masa taşıma ve masa birleştirme server-side transaction ile kesinleşecektir.
- Kapanan hesapların ticari snapshot'ı değiştirilmeyecek; düzeltmeler yeni audit/adjustment kayıtları üretecektir.
- AI, menü oluşturmayı hızlandıran yönetici yardımcısı olacaktır; garsonun temel sipariş akışı AI'a bağlı olmayacaktır.
- AI alerjen bilgisi uyduramayacak ve yönetici onayı olmadan menüye bilgi yayımlayamayacaktır.

---

## 2. Ürün problemi ve başarı tanımı

### 2.1 Problem ifadesi

Yoğun tempoda çalışan garson; masayı, ayrı hesabı, ürünleri, değişiklikleri ve ödemeyi hızlıca yönetmek zorundadır. Bugünkü Orderia arayüzünde ana işlem akışı fazla modal, uzun basma, küçük dokunma hedefleri ve cihaz-local dağınık state üzerinden ilerlemektedir. Bu durum yanlış hesaba ürün ekleme, yapılan değişikliğin kaynağını bulamama, farklı cihazlarda veri kaybı ve eski fişlere güvenilir biçimde ulaşamama riski yaratmaktadır.

Başarı; garsonun ortak siparişleri hızlı ve hatasız alması, yöneticinin bütün şubeleri canlı izleyebilmesi ve her finansal değişikliğin geriye dönük açıklanabilmesiyle ölçülecektir.

### 2.2 Ana ürün ölçütleri

Pilot öncesi hedefler:

- Uygulama açılışından kullanılabilir masa ekranına warm start süresi: hedef `< 1 saniye`.
- Sık kullanılan bir ürünü açık hesaba ekleme: hedef `1 dokunuş`, kullanıcı süresi `< 2 saniye`.
- Arama ile ürün ekleme: hedef `en fazla 3 dokunuş`.
- Basit nakit ödeme: hedef `en fazla 3 ana işlem`.
- Her lokal aksiyonun görsel geri bildirimi: hedef `< 100 ms`.
- Online olduğunda mutation server kabul süresi: p95 hedef `< 2 saniye`.
- Offline'dan online'a dönüşte otomatik senkron başlangıcı: hedef `< 2 saniye`.
- Veri kaybı, çift sipariş veya çift ödeme: `0`.
- Yanlış hesaba eklenen bir ürünü geri alma: hedef `< 5 saniye`.
- Açık masanın sahibi ve son işlem yapan garsonun görünürlüğü: `%100`.
- Kapanmış fişi tarih + saat + masa üzerinden bulma: hedef `< 15 saniye`.
- Kritik ekranlardaki dokunma hedefleri: minimum `48 × 48 px`.
- Body text kontrastı: WCAG AA, minimum `4.5:1`.
- Crash-free session hedefi: `>= %99.8`.
- Senkronizasyon başarı oranı: `>= %99.9`; kalan işlemler kullanıcıya kurtarma seçeneğiyle gösterilmeli.

### 2.3 Ölçülecek gerçek servis metrikleri

- Sipariş satırı ekleme süresi
- Masa açma süresi
- Masa başına düzeltme/iptal oranı
- Offline sırada bekleyen mutation sayısı ve yaşı
- Conflict sayısı ve çözüm süresi
- Double-tap nedeniyle engellenen tekrar yazım sayısı
- Garson başına servis verilen masa, satır ve ciro
- Garson başına iptal/ikram/düzeltme oranı
- Ortalama masa açık kalma süresi
- Fiş arama ve tekrar indirme başarı oranı
- PWA install/use oranı

Bu metrikler performans cezalandırma aracı olarak değil, eğitim ve operasyon iyileştirme girdisi olarak kullanılmalıdır.

---

## 3. Onaylanmış kapsam

### 3.1 İlk genel kullanıma açık sürümde bulunacaklar

- Çok kiracılı organizasyon ve çok şubeli yapı
- Yönetici ve garson rolleri
- Kullanıcı daveti, şube ataması ve güvenli oturum
- Android uygulama ve iPhone Safari/Home Screen PWA
- Salon ve masa yönetimi
- Canlı masa durumu
- Masa başına birden fazla isimli hesap
- Hesap başına not
- Sipariş satırı başına not ve seçenekler
- Aynı masada birden fazla garsonun eşzamanlı çalışması
- Her satırda ekleyen/değiştiren garson bilgisi
- Hızlı ürün ekleme, favoriler, son kullanılanlar ve arama
- Yanlış işlem için undo, iptal nedeni ve audit log
- Hesap bölme ve kısmi ödeme
- Ürün bazlı, tutar bazlı ve eşit bölme
- Masa taşıma ve masa birleştirme
- Otomatik fiş snapshot'ı ve indirilebilir PDF
- Eski fişleri tarih, saat, masa, garson ve tutarla arama
- Garson performans raporu
- Yönetici canlı operasyon görünümü
- Menü ve modifier yönetimi
- AI destekli menü taslağı ve seçenek önerileri
- Local-first veri katmanı ve cloud sync
- Offline göstergesi, sync kuyruğu ve conflict kurtarma ekranı
- Audit, hata izleme ve temel operasyon metrikleri

### 3.2 Sonraki sürümlere bırakılacaklar

İlk sürümün güvenilirliğini riske atmamak için aşağıdakiler ayrı epic olarak tutulacaktır:

- Mutfak ekranı/KDS
- Termal yazıcı entegrasyonu
- Stok ve reçete maliyeti
- Paket servis/gel-al
- Online ödeme sağlayıcısı
- Müşterinin QR üzerinden doğrudan sipariş vermesi
- Vardiya kasa sayımı ve tam muhasebe
- Gelişmiş franchise/royalty yönetimi
- Sadakat programı

Veri modeli bu özelliklere kapıyı kapatmayacak, ancak ilk sürüm UI'ında yarım özellik gösterilmeyecektir.

### 3.3 Açıkça kapsam dışı

- Orderia 2.0 ilk sürümde yasal/fiskal kasa cihazının yerine geçtiğini iddia etmeyecektir.
- Üretilen PDF, işletme fişi/adisyon özeti olacaktır. Ülkeye göre mali fiş veya fatura gereksinimi ayrı uyumluluk çalışmasıdır.
- AI tarafından önerilen alerjen bilgisi kesin kabul edilmeyecektir.
- Cloud bağlantısı garsonun sipariş alabilmesi için zorunlu olmayacaktır.

---

## 4. Mevcut uygulama denetimi

### 4.1 Korunabilecek güçlü yönler

- Expo + React Native + TypeScript tabanı Android ve web hedeflerini destekliyor.
- Mevcut `expo export --platform web` işlemi başarılı.
- Mevcut TypeScript kontrolü hatasız tamamlanıyor.
- Menü, salon, masa, sipariş ve tarihçe için temel domain kavramları var.
- Fiyat snapshot'ı fikri mevcut modelde bulunuyor.
- Zustand store'ları başlangıç prototipi için anlaşılır.
- Türkçe, Bulgarca ve İngilizce çeviri temeli var.
- PDF oluşturma, tema ve bildirim konusunda yeniden kullanılabilecek parçalar mevcut.

### 4.2 Mevcut teknik durum

- Yaklaşık 49 TypeScript/TSX kaynak dosyası ve 12.750 satır kaynak kodu bulunuyor.
- `TableDetailScreen.tsx` 1.100 satırın üzerinde.
- `AnalyticsScreen.tsx`, `NotificationCenter.tsx`, `MenuScreen.tsx`, `SettingsScreen.tsx` ve `TablesScreen.tsx` 400 satır sınırını aşıyor.
- Veriler dört ayrı Zustand persist store üzerinden AsyncStorage'a yazılıyor.
- Cloud auth, tenant/branch izolasyonu, server validation ve senkronizasyon yok.
- Test runner, unit test, integration test ve E2E test altyapısı yok.
- Web export üretiliyor ancak PWA manifest, service worker, app-shell cache ve güvenli offline mutation kuyruğu yok.
- Mevcut web JS bundle yaklaşık 2.83 MB.

### 4.3 Kritik mantık ve kullanılabilirlik sorunları

| Öncelik | Mevcut problem | Etki | Planlanan çözüm |
|---|---|---|---|
| P0 | Sipariş, tarihçe ve masa durumu farklı AsyncStorage store'larına ayrı ayrı yazılıyor | Uygulama kapanırsa yarım ödeme, açık görünen kapanmış masa veya kayıp tarihçe oluşabilir | Tek local database transaction + tek server transaction |
| P0 | Ödeme akışı istemcide kesinleşiyor, idempotency ve server authority yok | Double tap/retry çift ödeme veya tutarsız hesap oluşturabilir | Idempotency key, server RPC, row lock ve payment allocation invariants |
| P0 | Cloud/tenant/RLS yok | SaaS ortamında restoranlar arası veri sızıntısı riski | Organization/branch üyeliği + tüm iş tablolarında RLS |
| P0 | Kategori/salon/masa hard-delete açık siparişleri ve raporları orphan bırakabilir | Tarihçe kaybı ve rapor bozulması | Soft-delete, referential constraint ve aktif ilişki kontrolü |
| P1 | Günlük toplam fonksiyonu açık ticket toplamını “günlük toplam” gösteriyor | Yönetici yanlış ciro görür | Paid payment ledger tabanlı günlük ciro |
| P1 | History ve analytics cancelled satırları toplamdan düşmüyor | Ciro ve ürün raporları fazla çıkar | Immutable financial snapshot + status filtreli ledger |
| P1 | Geçmiş raporlar güncel menü/category kayıtlarına bakıyor | Ürün silinince veya kategori değişince eski rapor bozulur | Satırda isim, kategori, vergi ve fiyat snapshot'ı |
| P1 | Import kodu Zustand state alanlarını doğrudan mutate ediyor | Import görünürde başarılı olsa da persist/UI güncellenmeyebilir | Versiyonlu import service, transaction ve doğrulama |
| P1 | Refresh yalnızca 1 saniyelik sahte bekleme | Kullanıcı güncel veri geldiğini sanır | Gerçek sync state ve pull-to-sync |
| P1 | 32 × 32 adet butonları ve küçük durum aksiyonları | Yoğun tempoda yanlış dokunma | Minimum 48 × 48 hedef ve geniş aralık |
| P1 | Kritik aksiyonlar long-press arkasında | Keşfedilebilirlik düşük, garson işlemi hatırlamak zorunda | Görünür hızlı aksiyon + overflow menüsü |
| P1 | Her ürün eklendiğinde seçim ekranı kapanıyor | Arka arkaya ürün girişi yavaş | Açık kalan ürün paleti, tek dokunuş ekleme, sticky cart |
| P1 | Aynı masaya kimin ne eklediği tutulmuyor | Müşteri itirazında kanıt yok | `created_by`, `updated_by`, event log ve garson rozeti |
| P1 | Birden fazla ticket sekmesi “ayrı hesap” iş kurallarını modellemiyor | Kısmi ödeme ve ürün taşıma güvenilir değil | Check + allocation domain modeli |
| P2 | UI metinlerinin bir bölümü hardcoded İngilizce | Dil tutarsızlığı | Typed translation keys ve CI doğrulaması |
| P2 | App açılışı sample data'yı timeout ile başlatıyor | Bootstrap sırasında yanlış/atlayan state | Explicit boot state ve versiyonlu seed |
| P2 | Büyük component'lerde UI, domain ve side-effect iç içe | Test ve değişiklik riski yüksek | Feature-based modüller ve repository/use-case sınırları |

### 4.4 UX sağlık kararı

Mevcut arayüz kozmetik düzenlemeyle kurtarılamaz. Ana masa ve sipariş akışı yeniden tasarlanmalı; mevcut ekranlardan yalnızca iş kavramları ve doğrulanmış yardımcı fonksiyonlar seçilerek taşınmalıdır.

Öncelik sırası:

1. Veri kaybı ve finansal tutarsızlık riskleri
2. Local-first veri/sync temeli
3. Garsonun ana servis akışı
4. Hesap/ödeme/masa esnekliği
5. Yönetici raporları ve arşiv
6. AI ve görsel polish

---

## 5. Kullanıcılar ve gerçek çalışma koşulları

### 5.1 Persona: Garson — “Yoğun serviste tek el”

- Telefonu çoğunlukla tek elle kullanır.
- Diğer eli tepsi, not defteri veya tabakla meşgul olabilir.
- Ortam gürültülü, loş veya güneşli olabilir.
- Müşteriler konuşurken ekrana uzun süre bakamaz.
- Aynı anda birden fazla masayı takip eder.
- Ürün adlarını farklı şekillerde arayabilir.
- Yanlış masaya veya yanlış hesaba ekleme yapabilir.
- Başka bir garsonun açık masasına yardım edebilir.
- İnternet kalitesini kontrol edemez.
- Başarısı, ekranın güzelliğinden çok servis hızına ve hata kurtarmaya bağlıdır.

### 5.2 Persona: Yönetici — “Canlı kontrol ve sonradan kanıt”

- Bütün masaların durumunu ve toplam operasyonu görmek ister.
- Bir siparişi kimin eklediğini/değiştirdiğini bilmek ister.
- Müşteri itirazını fiş ve audit geçmişiyle çözmek ister.
- Menü ve fiyatları hızlı yönetmek ister.
- Birden fazla şube arasında geçiş yapar.
- Garson performansını bağlamıyla görmek ister.
- Geçmiş fişi tarih/saat/masa üzerinden bulmak ister.

### 5.3 Tasarımın hesaba katacağı servis problemleri

- Müşteri “Bunu sipariş etmedim” der.
- Ürün yanlış masaya girilir.
- Ürün doğru masada yanlış ayrı hesaba girilir.
- Müşteri sonradan ayrı ödemek ister.
- Bir masa iki masaya ayrılır veya iki masa birleşir.
- Müşteri masa değiştirir.
- Garson siparişin bir bölümünü iptal eder.
- Ürün fiyatı beklenenden yüksek görünür.
- Menü fiyatı servis sırasında değişir.
- Müşteri ürünün yarısını öder, kalanını başkası öder.
- Nakit alınan tutar yanlış girilir.
- Aynı butona iki kez basılır.
- İki garson aynı ürünü aynı anda ekler.
- İnternet sipariş eklenirken gider.
- Telefon kapanır veya PWA arka plana atılır.
- Garson vardiya ortasında başka cihaza geçer.
- Bir ürün stokta yoktur fakat menüde aktiftir.
- Müşteri alerjen sorar.
- Bir hafta önceki masanın fişi tekrar istenir.
- Yönetici iptal/ikramın nedenini araştırır.

Her kritik akışın normal, offline, eşzamanlı, hata ve geri alma durumu ayrı tasarlanacaktır.

---

## 6. UX stratejisi: “Shift Mode”

### 6.1 Ana ilkeler

1. **Recognition over recall:** Gizli long-press işlemler ana akıştan kaldırılacak.
2. **Hick's Law:** Garsona yalnızca servis sırasında gereken seçenekler gösterilecek; yönetim özellikleri ayrı alanda kalacak.
3. **Thumb reach:** En sık aksiyonlar alt başparmak alanında bulunacak.
4. **Immediate feedback:** Her lokal işlem anında görünür olacak; cloud beklenmeyecek.
5. **Undo before confirmation:** Finansal olmayan, geri alınabilir işlemlerde sürekli modal onayı yerine 5–8 saniyelik Undo kullanılacak.
6. **Strict confirmation where needed:** Ödeme, merge, kapatma ve finansal düzeltme review ekranından geçecek.
7. **Status without color dependence:** Renk + ikon + metin birlikte kullanılacak.
8. **Preserve context:** Ürün eklemek garsonu masa ekranından koparmayacak.
9. **Progressive disclosure:** Sık kullanılmayan seçenekler “Daha fazla” alanında gösterilecek.
10. **No dead ends:** Empty, loading, error, offline ve conflict durumları her ekranda bir sonraki aksiyonu söyleyecek.

### 6.2 Garson navigasyonu

Alt navigasyon en fazla üç ana hedef içerecek:

1. **Servis:** Canlı masa panosu ve “Benim masalarım”.
2. **Geçmiş:** Yetkisi kapsamındaki kapanmış hesaplar ve fişler.
3. **Profil:** Kullanıcı, şube, sync durumu ve çıkış.

Garson için Menü Yönetimi, Analitik ve sistem ayarları gösterilmeyecektir.

### 6.3 Yönetici navigasyonu

1. **Canlı:** Şube genelinde açık masalar ve uyarılar.
2. **Masalar:** Salon/masa düzeni ve servis görünümü.
3. **Menü:** Kategori, ürün, modifier, alerjen ve AI asistanı.
4. **Raporlar:** Ciro, masa ve garson performansı.
5. **Arşiv:** Hesap ve fiş arama.
6. **Ayarlar:** Organizasyon, şube, kullanıcı ve cihazlar.

Mobilde 4 ana tab + “Daha Fazla”, geniş web görünümünde sol rail kullanılabilir.

### 6.4 Responsive davranış

| Alan | Android telefon | iPhone Safari/PWA | Geniş web/tablet |
|---|---|---|---|
| Masa panosu | 2–3 kolon, büyük kart | 2–3 kolon, safe-area uyumlu | Salon planı + liste |
| Sipariş ekranı | Ürün paleti ve sticky hesap özeti | Aynı mobil akış | Sol ürünler, sağ sticky hesap |
| Ayrı hesaplar | Yatay hesap chip'leri | Yatay hesap chip'leri | Dikey check listesi |
| Ödeme bölme | Tam ekran stepper | Tam ekran stepper | İki panel drag/select |
| Yönetici raporu | KPI + drill-down | KPI + drill-down | Tablo + grafik + filtre paneli |

---

## 7. Bilgi mimarisi ve ekran özellikleri

### 7.1 Boot ve oturum ekranı

Amaç: Yanlış login/boş ekran flash'ı göstermeden lokal veriyi açmak.

Durum makinesi:

```text
unknown
  → loading secure session
  → opening local database
  → running migrations
  → hydrating active branch
  → ready
  ├─ authenticated + online
  ├─ authenticated + offline
  ├─ session-expired but offline grace allowed
  └─ login required
```

Kurallar:

- Unknown auth, guest olarak yorumlanmayacak.
- Lokal DB hazır olmadan gerçek servis ekranı gösterilmeyecek.
- Daha önce doğrulanmış cihaz için kontrollü offline grace period uygulanacak.
- Süresi dolmuş yetkiyle sınırsız offline çalışma yapılmayacak.
- Aktif sipariş varken uygulama güncellemesi zorla reload yaptırmayacak.

### 7.2 Servis Panosu

Üst bölüm:

- Şube adı
- Garson adı ve avatar/initial
- Online/offline/sync durumu
- “Benim masalarım / Tümü / Uyarılar” hızlı filtresi
- Masa veya hesap adı araması

Masa kartı:

- Masa adı/numarası
- Durum: boş, açık, ödeme bekliyor, sync sorunu
- Açık kalma süresi
- Toplam tutar
- Ayrı hesap sayısı
- Son işlem yapan garson
- Garson initial'ları
- Senkron bekliyorsa küçük cloud etiketi

Sıralama seçenekleri:

- Salon düzeni
- Benim masalarım
- En uzun açık
- Son işlem
- Ödeme bekleyen

Hızlı aksiyonlar:

- Boş masa: tek dokunuşla aç
- Açık masa: sipariş alanına git
- Kart üzerinde görünür `…`: taşı, birleştir, not, sahiplen/devret

Masa durumu sadece renkle anlatılmayacaktır.

### 7.3 Masa Çalışma Alanı

Bu ekran ürünün ana çalışma ekranıdır.

Header:

- Geri
- Masa adı
- Açık kalma süresi
- Masada aktif garsonlar
- Sync göstergesi
- Masa işlemleri

Ayrı hesap şeridi:

- `Genel`, `Ali`, `Çocuklar`, `Hesap 3` gibi isimli hesaplar
- Her chip üzerinde ara toplam
- `+ Hesap` görünür aksiyonu
- Uzun basma zorunlu değil; yeniden adlandır ve sil `…` içinde
- Masa notu ve hesap notu birbirinden ayrılacak

Ürün alanı:

- Favoriler
- Son eklenenler
- Sık kullanılanlar
- Kategori chip'leri
- Hızlı arama
- Her ürün en az 48 px yüksekliğinde
- Ürün adına veya karta tek dokunuş `+1`
- Variant/modifier gerektiren ürün dokunulduğunda hızlı seçenek sheet'i
- Aynı ürün tekrar eklenirse şube kuralına göre satırı artır veya yeni satır oluştur
- Ekleme sonrası ekran kapanmaz
- Son aksiyon için Undo toast gösterilir

Sticky hesap alanı:

- Seçili hesabın ürün adedi ve ara toplamı
- `Hesabı Gör`
- `Ödeme`
- Mobilde bottom bar, geniş ekranda sabit sağ panel

Sipariş satırı:

- Ad, quantity, unit price ve toplam
- Modifier/not özeti
- Ekleyen garson adı/initial
- Eklenme zamanı
- Status etiketi
- Büyük `− / +` kontrolleri
- Swipe yalnızca hızlandırıcı olabilir; görünür alternatif şarttır
- Yanlış satır için `Taşı`, `İptal`, `Düzenle`

### 7.4 Ürün seçenekleri

Modifier grupları örnekleri:

- Boyut: küçük/orta/büyük
- Peynir: peynirsiz/peynirli/ekstra peynir
- Pişme: az/orta/iyi
- Sos: ketçap/mayonez/sossuz
- Ekstralar: ücretli veya ücretsiz

Kurallar:

- Zorunlu grup tamamlanmadan `Ekle` aktif olmaz.
- Varsayılan seçenekler yönetici tarafından belirlenebilir.
- Garsonun sık seçtiği kombinasyon önerilebilir.
- Fiyat farkı her seçenekte görünür.
- Alerjen değiştiriyorsa açık uyarı gösterilir.
- Serbest not önerilen kısa chip'lerden sonra gelir.

### 7.5 Yanlış sipariş ve müşteri itirazı akışı

Sipariş satırı durumları:

```text
draft → ordered → served
  └──────────────→ cancelled
```

- Henüz server tarafından kabul edilmemiş/draft satır Undo ile tamamen kaldırılabilir.
- Ordered veya served satır hard-delete edilemez.
- İptal için neden seçilir: yanlış masa, müşteri vazgeçti, yanlış ürün, mutfak hatası, ikram/düzeltme, diğer.
- Yönetici şube bazında özel neden listesi tanımlar.
- İptal kaydı original satırla birlikte kalır.
- Fiyat uyuşmazlığında satır, o anda geçerli `price_snapshot` değerini gösterir.
- Menü fiyatı sonradan değişse bile eski sipariş değişmez.
- Audit timeline “kim, ne zaman, hangi cihazda, eski/yeni değer” bilgisini gösterir.
- Garsonun yetkisini aşan finansal düzeltmeler manager onayı isteyebilir.

Müşteriye açıklama görünümü:

- Ürün adı
- Adet
- Birim fiyat
- Modifier fiyatları
- Satır toplamı
- Sipariş zamanı
- İptal/ikram varsa açık işaret

Bu görünüm teknik event detaylarını değil, anlaşılır ticari açıklamayı sunar.

### 7.6 Hesap bölme ve kısmi ödeme

Desteklenecek yöntemler:

1. Ürünleri yeni hesaba taşıma
2. Aynı satırın quantity'sini iki hesaba bölme
3. Hesabı kişi sayısına eşit bölme
4. Belirli tutar ödeme
5. Nakit + kart karışık ödeme
6. Bir müşterinin seçili ürünleri ödemesi

Ödeme ekranı:

- Sol/üst: ödenmemiş ürünler
- Sağ/alt: seçilen ödeme payı
- Kalan tutar sürekli görünür
- Nakit alındı ve para üstü
- Kart tutarı
- `Ödemeyi Gözden Geçir`
- Son adımda yöntem, ödenen, kalan ve kapanacak hesap açıkça gösterilir

Finansal kurallar:

- Allocation toplamı order item ödenebilir miktarını aşamaz.
- Kısmen ödenen satır kalan quantity/tutarı korur.
- Son payment allocation tamamlanmadan check `paid` olamaz.
- Nakit para üstü ciroya dahil edilmez.
- İki cihaz aynı kalan tutarı aynı anda ödeyemez; server row lock ile biri kabul edilir, diğeri güncel kalan tutarı görür.
- Payment request idempotent olmalıdır.
- Başarısız/şüpheli ödeme otomatik tekrar edilmez.

### 7.7 Masa taşıma ve birleştirme

Masa taşıma:

- Kaynak masa ve hedef masa review ekranında gösterilir.
- Hedef boşsa session tüm check'leriyle taşınır.
- Hedef açıksa kullanıcı “ayrı hesap olarak ekle” veya “session birleştir” seçer.
- İşlem server transaction içinde yapılır.
- Kaynak/hedef kayıtları sabit sırayla lock edilir.

Masa birleştirme:

- İki açık session seçilir.
- Hesaplar otomatik karışmaz; önce ayrı check olarak korunur.
- Yönetici/garson isterse seçili check'leri sonra birleştirir.
- Her order item original masa ve session bilgisini audit metadata içinde korur.
- Birleştirme offline yapılabilir ancak “yüksek conflict riski” olarak işaretlenir; server reddederse anlaşılır çözüm ekranı açılır.

### 7.8 Hesap kapatma ve fiş

Hesap kapandığında:

1. Server payment allocation'ları doğrular.
2. Check total, paid total ve remaining total tekrar hesaplanır.
3. Kapanış snapshot'ı oluşturulur.
4. Sıralı şube fiş numarası atanır.
5. Receipt kaydı immutable olarak yazılır.
6. PDF üretilir veya deterministik üretim kuyruğuna alınır.
7. PDF Supabase Storage private bucket'a kaydedilir.
8. İstemci kapanan hesabı lokal arşive alır.
9. Kullanıcı “Paylaş / İndir / Sonra” seçeneklerini görür.

PDF içeriği:

- İşletme ve şube bilgisi
- Fiş/adisyon numarası
- Masa ve ayrı hesap adı
- Açılış ve kapanış zamanı
- Ürün, modifier, quantity, unit price ve total
- İptal edilen ürünler müşteri fişine dahil edilmeyecek; yönetici audit görünümünde kalacak
- Ödeme yöntemleri ve para üstü
- İşlemi alan garson(lar)
- Para birimi ve gerekli vergi alanları
- “Mali fiş değildir” ibaresi, hukuki inceleme gerektiriyorsa konfigüre edilebilir

### 7.9 Fiş ve sipariş arşivi

Filtreler:

- Organizasyon/şube
- Tarih aralığı
- Saat aralığı
- Masa
- Hesap adı
- Fiş numarası
- Garson
- Ödeme yöntemi
- Tutar aralığı
- İptal/düzeltme içerenler

Örnek sorgu:

> Geçen hafta, 13:00–14:00 arasında, Masa 4'te kapanan hesapları bul.

Sonuç kartı:

- Tarih/saat
- Masa ve hesap adı
- Toplam
- Garson
- Fiş numarası
- `Detay`, `PDF indir`, `Paylaş`

Arşiv sayfalı/cursor tabanlı yüklenmeli; bütün tarihçe tek seferde cihaza indirilmemelidir.

### 7.10 Yönetici canlı görünümü

- Şube seçici
- Açık masa sayısı
- Ödeme bekleyen masalar
- Offline/sync sorunu yaşayan cihazlar
- Uzun süredir açık masalar
- Garson başına aktif masa
- Son iptal ve düzeltmeler
- Bugünkü server-confirmed ciro

Yönetici bütün masaları görebilir; garson varsayılan olarak kendi şubesindeki masaları görür. “Benim masalarım” filtresi kişisel hızlandırıcıdır, güvenlik filtresi değildir.

### 7.11 Garson performans raporu

Metrikler:

- Aktif olunan süre/vardiya
- Açılan veya servis verilen masa
- Eklenen order item
- Katkıda bulunulan ciro
- Tamamlanan ödeme
- Ortalama masa süresi
- Ortalama hesap tutarı
- İptal/düzeltme/ikram oranı
- Başka garsona yardım edilen masa

Attribution kuralları açık olmalıdır:

- Ürün katkısı `order_item.created_by` üzerinden hesaplanır.
- Ödeme katkısı `payment.created_by` üzerinden ayrıca gösterilir.
- Masa geliri tek bir “sahip” garsona zorla yazılmaz.
- Aynı masada birden fazla garson çalışırsa katkılar satır bazında ayrılır.
- İptal oranı ham sayı olarak cezalandırma metriği yapılmaz; neden ve yoğunluk bağlamı gösterilir.

---

## 8. Tamamen yeni UI tasarım sistemi

### 8.1 Redesign kararı

Orderia 2.0 arayüzü mevcut UI'ın teması değiştirilmiş veya kartları modernleştirilmiş hali olmayacaktır. Bütün ana ekranlar sıfırdan tasarlanacaktır.

Taşınabilecekler:

- Orderia marka adı
- Doğrulanmış domain kavramları
- İşe yaradığı kullanıcı testiyle kanıtlanan copy
- Uygun bulunan logo varlıkları

Taşınmayacaklar:

- Mevcut bottom-tab bilgi mimarisi
- Mevcut masa kartı düzeni
- Mevcut sipariş modal akışı
- Long-press'e bağımlı ana işlemler
- Mevcut inline style sistemi
- Mevcut renk paleti ve component görünümleri
- 32 px quantity butonları
- Her ürün eklemede kapanan seçim ekranı
- Birbirinden kopuk Alert/modal zincirleri
- Analytics ve yönetim ekranlarının mevcut yerleşimi

Yeni UI'ın çalışma adı:

> **Orderia Service Console — hızlı servis için tek elle kullanılan operasyon arayüzü**

Yeni tasarımın üç ana hedefi:

1. Garsonun gözünü ve elini müşteriden mümkün olduğunca az ayırmak.
2. Yanlış masaya/hesaba/ürüne işlem yapmayı tasarımla önlemek.
3. Her aksiyondan sonra ne olduğunu ve cloud durumunu tereddütsüz göstermek.

Bu karar, `TableDetailScreen.tsx` veya mevcut component'leri görsel referans kabul ederek ekran kopyalamayı yasaklar. Legacy component yalnızca davranışı test edilmiş ve yeni design token sözleşmesine uydurulmuşsa içeride yeniden kullanılabilir.

### 8.2 Before → After

| Alan | Before | After | Gerekçe |
|---|---|---|---|
| Ana navigasyon | Garson ve yönetici aynı tab'leri görür | Role göre ayrı Servis ve Yönetim shell'i | Hick's Law: ilgisiz seçenekleri kaldırır |
| Masa görünümü | Küçük, benzer kartlar ve ağırlıklı renk kodu | Büyük durum, süre, toplam, garson ve hesap sayısı gösteren canlı kart | Nielsen #1: sistem durumunu görünür yapar |
| Ürün ekleme | Search/modal açılır, ürün eklenince kapanır | Ekranda kalan ürün paleti + tek dokunuş `+1` | Nielsen #7: uzman kullanımını hızlandırır |
| Ayrı hesap | Belirsiz “Order 1/2” ticket sekmeleri | İsimli hesap chip'leri ve her birinin ara toplamı | Gerçek dünya eşleşmesi ve recognition |
| Ürün satırı | Küçük butonlar, ekleyen kişi yok | 48 px stepper, garson initial, zaman ve modifier özeti | Norman Visibility + physical ease |
| Not ekleme | Long-press veya ayrı modal | Görünür not aksiyonu + sık not chip'leri | Gizli gesture bağımlılığını kaldırır |
| Yanlış sipariş | Sil/iptal davranışı karışık | Undo → nedenli iptal → audit timeline | Nielsen #3 ve #5 |
| Ödeme | Alert zinciri | Özet, allocation ve review içeren tam ekran akış | Finansal hatayı işlemden önce engeller |
| Offline | Belirsiz veya hiç görünmez | Global banner + item seviyesinde sync işareti | Gulf of Evaluation'ı kapatır |
| Yönetici ekranı | Mobil kartların uzatılmış hali | Geniş ekranda operasyon paneli, filtre rail'i ve tablo | Platforma uygun bilgi yoğunluğu |
| Arşiv | Günlük history listesi | Tarih/saat/masa/garson/tutar sorgusu + PDF | Recognition ve gerçek görev eşleşmesi |
| Görsel dil | Fazla kart, karışık radius ve inline renk | Net yüzey katmanları, tek icon family, ortak token | Nielsen #4 tutarlılık |

### 8.3 Görsel konsept

“Operational clarity” yaklaşımı kullanılacaktır:

- Nötr ve sakin ana yüzeyler
- Tek ana marka rengi
- Tek vurgu rengi
- Semantik durum renkleri
- Durum renginin yanında ikon ve açık text
- Az gölge, net sınırlar ve güçlü typographic hierarchy
- Yüksek bilgi yoğunluğu fakat sıkışık olmayan 8 pt grid
- Büyük rakamlar: masa süresi, tutar, adet ve kalan ödeme
- Garson avatarı yerine gerektiğinde hızlı okunan initial badge
- Dekoratif gradient yalnızca login/marka alanında
- Operasyon ekranlarında blur, glassmorphism veya ağır gradient kullanılmaması
- Tek icon family; emoji'nin operasyon ikonu olarak kullanılmaması
- Koyu tema “morlaştırılmış UI” değil, aynı semantik hiyerarşinin düşük ışık sürümü

Ekran yüzey katmanları:

1. `canvas`: uygulama arka planı
2. `surface`: ana çalışma paneli
3. `raised`: sheet, sticky cart ve kritik özet
4. `semantic`: warning/error/success alanı

Kartlar her şeyi çevreleyen varsayılan container olmayacaktır. Gestalt proximity ve whitespace, gereksiz kart çerçeveleri yerine ilişki kurmak için kullanılacaktır.

### 8.4 Mobil wireframe — Servis Panosu

Platform: Android telefon ve iPhone PWA
Amaç: Garsonun bir sonraki masayı en hızlı biçimde bulması.

```text
┌────────────────────────────────────┐
│ Orderia · Merkez Şube       ● Sync │
│ Günaydın, Ayşe              [AV]   │
├────────────────────────────────────┤
│ [ Benim 8 ] [ Tümü 24 ] [ Uyarı 2]│
│ [ 🔎 Masa veya hesap ara         ] │
│ Salon: [Tümü] [Bahçe] [İçerisi] → │
├────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ │
│ │ MASA 4    ●  │ │ MASA 5       │ │
│ │ 32 dk        │ │ BOŞ           │ │
│ │ €48,20 · 2 H │ │               │ │
│ │ AY · MK   …  │ │ [ Hızlı Aç ]  │ │
│ └──────────────┘ └──────────────┘ │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ MASA 7   !   │ │ BAHÇE 2      │ │
│ │ 1 sa 14 dk   │ │ ÖDEME BEKLİYOR│ │
│ │ €96,00 · 3 H │ │ €34,00        │ │
│ │ AY · Offline │ │ MK         …  │ │
│ └──────────────┘ └──────────────┘ │
│                                    │
├────────────────────────────────────┤
│  ● Servis        Geçmiş     Profil │
└────────────────────────────────────┘
```

Anotasyon:

- Sync durumu header'da sürekli görünür; Nielsen #1.
- “Benim/Tümü/Uyarı” tek karar grubudur; Gestalt common region.
- Boş masanın kartında doğrudan `Hızlı Aç` vardır; Gulf of Execution küçülür.
- Açık masa kartı süre, toplam, hesap sayısı ve garsonu aynı bakışta verir.
- Kartın tamamı minimum 96 px yüksekliğinde dokunma hedefidir.
- Semantik uyarı renk + ikon + text ile gösterilir.

### 8.5 Mobil wireframe — Masa Çalışma Alanı

Platform: Android telefon ve iPhone PWA
Amaç: Ekrandan ayrılmadan peş peşe sipariş eklemek.

```text
┌────────────────────────────────────┐
│ ‹  MASA 4 · 32 dk      AY MK   …  │
│ Çevrimdışı · 3 işlem cihazda güvenli│
├────────────────────────────────────┤
│ [Genel €28] [Ali €12] [Çocuk €8] [+]│
├────────────────────────────────────┤
│ [🔎 Ürün ara                     ] │
│ [Favori] [Son] [İçecek] [Yemek] → │
├────────────────────────────────────┤
│ FAVORİLER                           │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Kola         │ │ Patates      │ │
│ │ €3,00    [+] │ │ €4,00    [+] │ │
│ └──────────────┘ └──────────────┘ │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Burger       │ │ Su           │ │
│ │ €9,50    [>] │ │ €1,50    [+] │ │
│ └──────────────┘ └──────────────┘ │
│                                    │
│ Son: Patates +1 · Ali hesabı [Geri]│
├────────────────────────────────────┤
│ Ali · 3 ürün               €12,00  │
│ [ Hesabı Gör ]       [ Ödeme → ]  │
└────────────────────────────────────┘
```

Anotasyon:

- Seçili hesap ve tutar ekranın üstünde ve altında doğrulanır; yanlış hesaba eklemeyi azaltır.
- `+` doğrudan ekler; `>` modifier seçimi gerektiğini açıkça signifier ile gösterir.
- Ürün grid'i ekleme sonrası açık kalır.
- Son işlem ve Undo, kullanıcı kontrolünü korur.
- Sticky alt alan başparmak bölgesinde iki ana aksiyonla sınırlıdır; Hick's Law.

### 8.6 Mobil wireframe — Hesap Detayı

```text
┌────────────────────────────────────┐
│ ‹  Ali Hesabı               €12,00│
│ Masa 4 · Not: doğum günü           │
├────────────────────────────────────┤
│ Patates Kızartması          €5,00  │
│ Peynirli · Ketçap                   │
│ Ekleyen: Ayşe · 20:14      [−] 1 [+]│
│ [Not] [Taşı] [İptal]               │
├────────────────────────────────────┤
│ Kola × 2                     €6,00  │
│ Ekleyen: Mehmet · 20:16    [−] 2 [+]│
│ [Not] [Taşı] [İptal]               │
├────────────────────────────────────┤
│ Su                           €1,00  │
│ Ekleyen: Ayşe · 20:17               │
├────────────────────────────────────┤
│ [ + Ürün ] [ Hesabı Böl ]           │
│ [          Ödemeye Geç →          ] │
└────────────────────────────────────┘
```

Anotasyon:

- Ekleyen garson ve zaman her satırda görünür.
- Modifier, fiyat uyuşmazlığı tartışmasında satır altında açıklanır.
- Taşı/iptal/not görünür; long-press yalnızca hızlandırıcı olabilir.
- Bir satırın bütün aksiyonları aynı common region içinde gruplanır.

### 8.7 Mobil wireframe — Bölünmüş Ödeme

```text
┌────────────────────────────────────┐
│ ‹ Hesabı Böl             Kalan €48│
├────────────────────────────────────┤
│ Yöntem: [Ürün] [Eşit] [Tutar]      │
│                                    │
│ ☑ Burger ×1                 €9,50  │
│ ☑ Kola ×2                   €6,00  │
│ ☐ Patates ×2         [−] 1/2 [+]  │
│ ☐ Tatlı                     €5,00  │
│                                    │
│ Seçilen                      €19,50│
│ Bu ödemeden sonra kalan      €28,50│
├────────────────────────────────────┤
│ [Nakit] [Kart] [Nakit + Kart]      │
│ [        Ödemeyi Gözden Geçir →  ] │
└────────────────────────────────────┘
```

Anotasyon:

- Kalan tutar işlem boyunca görünür; recognition over recall.
- Ürün seçimi ve ödeme yöntemi iki ayrı karar grubudur.
- Confirm CTA, allocation geçerli değilse disabled olur; Norman Constraints.
- Son adım review ekranıdır; finansal değişiklik tek dokunuşla sessizce kesinleşmez.

### 8.8 Geniş web wireframe — Yönetici Canlı Paneli

```text
┌──────────────┬────────────────────────────────────────────────────┐
│ ORDERIA      │ Merkez Şube ▾       Bugün 26 Temmuz       ● Canlı │
│              ├────────────────────────────────────────────────────┤
│ ● Canlı      │ [Açık 18] [Ödeme 4] [Ciro €2.840] [Sync Sorunu 1] │
│   Masalar    ├───────────────────────────┬────────────────────────┤
│   Menü       │ CANLI MASALAR             │ OPERASYON AKIŞI        │
│   Raporlar   │ [Tümü][>45dk][Ödeme]      │ 20:17 Ayşe + Patates  │
│   Arşiv      │                           │       Masa 4           │
│   Ekip       │ ┌────────┐ ┌────────┐     │ 20:16 Mehmet ödeme    │
│   Ayarlar    │ │Masa 4  │ │Masa 7 !│     │       Bahçe 2         │
│              │ │€48 ·32d│ │€96 ·74d│     │ 20:15 Masa 9 taşındı │
│              │ └────────┘ └────────┘     │                        │
│              │ ┌────────┐ ┌────────┐     ├────────────────────────┤
│              │ │Masa 12 │ │Bahçe 2 │     │ GEREKEN AKSİYONLAR    │
│              │ │Ödeme   │ │Offline │     │ • 1 sync conflict     │
│              │ └────────┘ └────────┘     │ • 2 uzun açık masa    │
└──────────────┴───────────────────────────┴────────────────────────┘
```

Anotasyon:

- Web arayüzü mobil kartların büyütülmüş hali değildir.
- Sol rail, sürekli yönetici navigasyonunu taşır.
- KPI, masa panosu ve event feed aynı ekranda farklı Gestalt bölgeleridir.
- Yönetici ayrıntıya drill-down yapar; ana panelde bütün raporlar aynı anda gösterilmez.

### 8.9 Etkileşim modeli

#### Tap

- Bir ürün tile'ına tap: `+1`.
- Modifier zorunluysa tile açık `>` signifier taşır ve sheet açar.
- Masa kartına tap: Masa Çalışma Alanı.
- Hesap chip'ine tap: aktif hesabı değiştirir.

#### Long-press

- Hiçbir zorunlu ana işlem yalnızca long-press ile bulunmaz.
- Long-press yalnızca power-user hızlandırıcısı olabilir.
- Kullanıcı ilk kullanımda long-press öğrenmek zorunda kalmaz.

#### Swipe

- Swipe-to-cancel tek başına kullanılmaz.
- Swipe varsa görünür `İptal` aksiyonuyla aynı işi yapar.
- Destructive swipe tam hareketten sonra Undo sunar.

#### Haptic

- Ürün eklendi: hafif feedback
- Modifier tamamlandı: hafif feedback
- Ödeme kesinleşti: success feedback
- Hata/conflict: warning feedback
- Haptic kapalı veya webde yoksa görsel davranış eksilmez

#### Motion

- Press: 80–120 ms scale/opacity
- Yeni order line: 120–180 ms yerleşim feedback'i
- Undo toast: 200 ms giriş, süre göstergesi
- Sheet: 180–240 ms
- Route transition: platform standardı
- Dekoratif uzun animasyon yok
- `reduce-motion` açıkken transform animasyonları kaldırılır

#### Web klavye hızlandırıcıları

- `/`: ürün veya masa araması
- `Esc`: sheet/modal kapat
- `Enter`: odaktaki primary aksiyon
- `1–9`: açık ürün paletinde opsiyonel hızlı favori
- Kısayollar yardım panelinde görünür ve kapatılabilir

### 8.10 Component anatomisi

#### TableCard

- Masa etiketi
- Açık kalma süresi
- Durum icon + text
- Toplam
- Hesap sayısı
- Garson badge grubu
- Sync durumu
- Overflow aksiyonu

Durumlar:

```text
empty · open · payment_pending · offline_pending · conflict · disabled
```

#### ProductTile

- Ürün adı, maksimum 2 satır
- Fiyat
- Availability
- Favori işareti
- Direct-add `+` veya modifier `>`
- Basıldığında anlık pressed state

#### OrderLine

- Ürün ve modifier özeti
- Garson + timestamp
- Quantity stepper
- Unit/line total
- Status
- Not/taşı/iptal aksiyonları
- Local pending/sync conflict state

#### SyncBadge

- `Synced`
- `3 bekliyor`
- `Offline`
- `Conflict`

Raw teknik hata veya request ID ana UI'da gösterilmez. Detay yönetici diagnostics alanında bulunur.

#### BottomActionBar

- En fazla iki primary-level aksiyon
- iOS safe-area inset
- Klavye açıldığında ilgili input'u kapatmaz
- Scroll içeriği bar arkasında kalmaz
- Android geri davranışıyla uyumlu

### 8.11 Token başlangıcı

```text
color.primary.600:        #2563EB
color.primary.700:        #1D4ED8
color.accent.600:         #7C3AED
color.neutral.950:        #0F172A
color.neutral.700:        #334155
color.neutral.500:        #64748B
color.neutral.200:        #E2E8F0
color.neutral.50:         #F8FAFC
color.success.700:        #15803D
color.warning.700:        #B45309
color.error.700:          #B91C1C
color.info.700:           #0369A1

space: 4 / 8 / 12 / 16 / 24 / 32 / 48
radius: 6 / 10 / 16 / full
type: 12 / 14 / 16 / 18 / 20 / 24 / 32
weight: 400 / 500 / 600 / 700
touch-target: min 48 × 48
motion.fast: 100 ms
motion.standard: 180 ms
motion.sheet: 240 ms
```

Kurallar:

- Aynı token native ve web adapter'larında kullanılacak.
- Component içinde rastgele hex renk girilmeyecek.
- Semantik renkler marka renginden türetilmeyecek.
- Kesin renkler high-fidelity prototip ve kontrast testi sonrası sabitlenecek.
- Body font platform system stack veya okunabilirliği kanıtlanan tek variable font olacaktır.

### 8.12 Temel bileşen seti

- AppShell
- WaiterBottomNav
- ManagerSideRail
- TopBar
- Button: primary, secondary, ghost, destructive
- IconButton
- SegmentedControl
- SearchField
- FilterChip
- CategoryChip
- ProductTile
- TableCard
- CheckChip
- OrderLine
- QuantityStepper
- ModifierSheet
- BottomActionBar
- StatusBadge
- WaiterBadge
- SyncBadge
- OfflineBanner
- UndoToast
- ConfirmationReview
- ConflictCard
- MoneyInput
- ReceiptCard
- DataTable
- Skeleton
- EmptyState
- ErrorState

Her bileşen için:

- Anatomy
- Variants
- Default/pressed/focus/disabled/loading/error/offline states
- Content limits
- Responsive behavior
- Accessibility contract
- Unit/visual test

tanımlanmadan component tamamlanmış sayılmayacaktır.

### 8.13 Ekran durumları

Her yeni ekran high-fidelity tasarımda aşağıdaki state'lerle teslim edilecektir:

- Normal
- Empty
- First-use
- Loading/skeleton
- Background refreshing
- Offline with safe local data
- Sync pending
- Conflict
- Permission denied
- Session expired
- Server error with retry
- Long text/large price
- Large font/200% zoom
- Keyboard open
- Reduced motion

Örnek offline empty state:

```text
Bu cihazda henüz masa verisi yok.
İlk senkronizasyon için internete bağlan.
[Tekrar Dene]
```

Örnek conflict:

```text
Bu hesap başka bir cihazda değişti.
Senin notun: “Peynirsiz”
Güncel not: “Ekstra peynir”
[Benimkini Kullan] [Günceli Koru]
```

### 8.14 Responsive grid ve breakpoint kuralları

- `compact`: 0–479 px; telefon portrait
- `medium`: 480–839 px; büyük telefon/tablet
- `expanded`: 840 px+; tablet landscape/web

Compact:

- Tek ana kolon
- Sticky bottom action
- Bottom sheets
- 2 kolon product/table grid

Medium:

- 3–4 kolon grid
- Bazı sheet'ler side panel olabilir
- Hesap ve ürün alanı split view'e geçebilir

Expanded:

- Manager side rail
- Ürün + hesap iki panel
- Filter sidebar
- Hover yalnızca yardımcıdır; bütün işlemler click/keyboard ile yapılabilir

Breakpoint yalnızca ekran genişliğine bakmaz; pointer type, safe-area ve font scaling test edilir.

### 8.15 Tasarım üretim süreci ve onay kapıları

#### Tasarım Aşaması 1 — Flow ve içerik

Teslimatlar:

- Waiter ve manager site map
- En kritik 10 user flow
- Ekran içerik öncelikleri
- Error/offline/conflict flow'ları

Onay:

- Her primary görev için sonraki aksiyon görünür.
- Garson shell'inde yönetim gürültüsü yok.

#### Tasarım Aşaması 2 — Low-fidelity wireframe

Teslimatlar:

- Servis Panosu
- Masa Çalışma Alanı
- Modifier seçimi
- Hesap detay
- Split payment
- Masa taşıma/birleştirme
- Receipt arşivi
- Manager canlı panel
- Menü AI review

Onay:

- Renk ve marka olmadan hiyerarşi anlaşılır.
- Sık görevlerin tap sayısı ölçülmüş.

#### Tasarım Aşaması 3 — High-fidelity UI

Teslimatlar:

- Light operational theme
- Dark/low-light operational theme
- Component library
- Token set
- Android ve iPhone frame'leri
- Expanded web frame'leri
- Bütün edge state'ler

Onay:

- WCAG kontrast kontrolü
- 48 px target kontrolü
- Copy ve translation overflow kontrolü

#### Tasarım Aşaması 4 — Interactive prototype

Prototip akışları:

1. Masa aç ve üç ürün ekle
2. Modifier ekle
3. Yanlış ürünü geri al
4. İsimli ikinci hesap aç
5. Ürünü hesaba taşı
6. Hesabı böl ve kısmi ödeme al
7. Masayı taşı
8. Eski fişi bul

Onay:

- 3–5 gerçek garsonla görev testi
- Kritik görevlerde ciddi kullanılabilirlik sorunu kalmaması
- Ölçülen sürelerin Bölüm 2 hedeflerine yaklaşması

#### Tasarım Aşaması 5 — Engineering handoff ve visual QA

Teslimatlar:

- Component anatomy/state dokümanı
- Token export
- Spacing/redline
- Responsive kurallar
- Motion specs
- Accessibility annotation
- Empty/error/offline copy

Onay:

- Implement edilen ekran prototype ile side-by-side karşılaştırılır.
- Tasarım sapmaları issue olarak kaydedilir.
- UI yalnızca “yaklaşık benziyor” diye kabul edilmez.

### 8.16 UI redesign kabul kriterleri

- Legacy ekranlardan hiçbiri aynı yerleşimle production'a taşınmamış.
- Garson ve yönetici ayrı navigation shell kullanıyor.
- Sık ürün tek dokunuşla ekleniyor.
- Ana garson akışında zorunlu long-press yok.
- Her ürün satırında ekleyen garson görünür.
- Seçili masa ve hesap sipariş ekleme boyunca görünür.
- Ürün paleti arka arkaya eklemede kapanmıyor.
- Offline ve sync durumu sürekli fakat rahatsız etmeyen biçimde görünür.
- Ana aksiyon hedefleri minimum 48 × 48 px.
- Mobile, large mobile ve web layout'ları ayrı doğrulanmış.
- Normal dışındaki edge state'ler tasarım dosyasında mevcut.
- Light/dark tema aynı semantik hiyerarşiyi koruyor.
- Gerçek garson prototype testi yapılmış.

### 8.17 Erişilebilirlik

- Body text kontrastı minimum 4.5:1.
- Büyük text ve UI sınırları minimum 3:1.
- Durum yalnızca renk üzerinden anlatılmayacak.
- Tüm aksiyonlar webde klavye ile kullanılabilir olacak.
- Focus ring görünür olacak.
- Modal/sheet focus trap ve geri dönüş davranışına sahip olacak.
- Font %200 büyütmede içerik kırılmayacak.
- Screen reader label'ları ürün + fiyat + durum + ekleyen garsonu anlamlı sırada okuyacak.
- Haptic feedback görsel feedback'in yerine geçmeyecek.
- `prefers-reduced-motion` ve sistem reduce-motion ayarı desteklenecek.
- Form input'larında placeholder yerine kalıcı label kullanılacak.
- Dynamic toast/sync değişiklikleri uygun live region ile duyurulacak.

---

## 9. Hedef teknik mimari

### 9.1 Teknoloji kararları

| Katman | Seçim | Gerekçe |
|---|---|---|
| Ortak UI runtime | Expo + React Native + TypeScript | Mevcut taban, Android/web ortaklığı |
| Navigasyon | Expo Router'a kademeli geçiş | Web route/deep-link, layout ve PWA HTML kontrolü |
| Native local DB | Expo SQLite | Transaction, query, migration ve güvenilir persistence |
| Web local DB | IndexedDB + ince adapter | Safari/PWA için tarayıcı-native kalıcı veri |
| UI state | Zustand | Sadece ephemeral UI ve seçili context |
| Server state erişimi | Repository + sync engine | UI'ı Supabase SDK ve storage detaylarından ayırır |
| Cloud DB | Supabase PostgreSQL | Transaction, constraint, RLS ve raporlama |
| Auth | Supabase Auth | Her garson için ayrı kimlik |
| Realtime | Supabase Broadcast + private channels | Güvenli, ölçeklenebilir değişiklik bildirimi |
| Dosya | Supabase Storage private bucket | Fiş PDF ve export |
| Server işlemleri | PostgreSQL RPC + Supabase Edge Functions | Finansal transaction ve entegrasyon |
| Hata izleme | Sentry veya eşdeğer | Mobile/web crash ve sync hata görünürlüğü |
| Analytics | Privacy-safe product events | Akış hızını ölçmek |

### 9.2 Realtime ile ilgili karar

Realtime, verinin tek kaynağı olmayacaktır. WebSocket bağlantısı kesilebilir veya cihaz arka planda olay kaçırabilir.

Bu nedenle:

- Broadcast hızlı ekran güncellemesi sağlar.
- Her event server sequence/revision taşır.
- İstemci son uyguladığı cursor'ı saklar.
- Reconnect sonrası “cursor'dan sonraki değişiklikleri” pull eder.
- Realtime event yalnızca invalidation/tetikleyici gibi davranabilir.
- Kritik finansal sonuç, RPC cevabı veya doğrulanmış pull kaydıyla kesinleşir.

### 9.3 Hedef klasör yapısı

```text
src/
├─ app/                         # Expo Router routes ve layouts
├─ bootstrap/                   # auth, db, migrations, config boot
├─ domain/
│  ├─ menu/
│  ├─ service/
│  ├─ orders/
│  ├─ payments/
│  ├─ receipts/
│  └─ reporting/
├─ features/
│  ├─ auth/
│  ├─ shift-board/
│  ├─ table-workspace/
│  ├─ split-payment/
│  ├─ table-transfer/
│  ├─ receipt-archive/
│  ├─ menu-management/
│  ├─ menu-ai-assistant/
│  ├─ waiter-performance/
│  └─ sync-status/
├─ data/
│  ├─ local/
│  │  ├─ native-sqlite/
│  │  └─ web-indexeddb/
│  ├─ remote/
│  ├─ repositories/
│  ├─ sync/
│  └─ migrations/
├─ shared/
│  ├─ components/
│  ├─ design-system/
│  ├─ i18n/
│  ├─ money/
│  ├─ time/
│  ├─ validation/
│  └─ observability/
└─ test/
   ├─ factories/
   ├─ fixtures/
   └─ helpers/

supabase/
├─ migrations/
├─ seed.sql
├─ tests/
├─ functions/
│  ├─ menu-ai-suggest/
│  ├─ receipt-render/
│  └─ export-report/
└─ config.toml
```

### 9.4 Katman kuralları

- Screen doğrudan Supabase SDK çağırmaz.
- Screen doğrudan SQLite/IndexedDB çağırmaz.
- Domain kuralları React component içinde bulunmaz.
- Para hesapları ortak `money` modülünde integer minor units ile yapılır.
- Tarih ve business day hesapları branch timezone üzerinden yapılır.
- Repository action'ları idempotency metadata olmadan kritik write göndermez.
- Zustand kalıcı ticari verinin kaynağı olmaz.
- Sync engine UI component lifecycle'ına bağlı olmaz.

---

## 10. Cloud veri modeli

### 10.1 Kimlik ve çok kiracılı yapı

#### `organizations`

- `id`
- `name`
- `slug`
- `plan`
- `status`
- `created_at`

#### `branches`

- `id`
- `organization_id`
- `name`
- `timezone`
- `currency_code`
- `business_day_cutoff`
- `receipt_prefix`
- `status`
- `created_at`
- `deleted_at`

#### `profiles`

- `id` → `auth.users.id`
- `display_name`
- `email`
- `avatar_url`
- `locale`
- `created_at`

#### `memberships`

- `id`
- `organization_id`
- `branch_id` nullable; organization manager için null olabilir
- `user_id`
- `role` → `waiter | manager`
- `status` → `invited | active | suspended`
- `created_at`
- `deleted_at`

Unique constraint:

```text
(organization_id, branch_id, user_id) where deleted_at is null
```

#### `devices`

- `id`
- `organization_id`
- `branch_id`
- `user_id`
- `platform`
- `app_version`
- `last_seen_at`
- `last_sync_at`
- `push_endpoint`
- `revoked_at`

### 10.2 Menü

#### `menu_categories`

- `id`
- `organization_id`
- `branch_id` nullable; ortak katalog desteği
- `name`
- `sort_order`
- `is_active`
- `version`
- `created_by`
- `created_at`
- `updated_at`
- `deleted_at`

#### `menu_items`

- `id`
- `organization_id`
- `branch_id` nullable
- `category_id`
- `name`
- `description`
- `price_minor`
- `currency_code`
- `tax_rate`
- `is_active`
- `is_available`
- `prep_time_minutes`
- `version`
- `created_by`
- `created_at`
- `updated_at`
- `deleted_at`

#### `modifier_groups`

- `id`
- `menu_item_id`
- `name`
- `selection_type` → `single | multiple`
- `minimum_choices`
- `maximum_choices`
- `is_required`
- `sort_order`

#### `modifier_options`

- `id`
- `modifier_group_id`
- `name`
- `price_delta_minor`
- `is_default`
- `is_active`
- `sort_order`

#### `allergens`

- `id`
- `code`
- `name`

#### `menu_item_allergens`

- `menu_item_id`
- `allergen_id`
- `presence` → `contains | may_contain | free_from | unknown`
- `source` → `manager | recipe | supplier`
- `confirmed_by`
- `confirmed_at`

AI kaynağı `confirmed` olarak kabul edilmeyecektir.

### 10.3 Salon, masa ve servis

#### `halls`

- `id`
- `organization_id`
- `branch_id`
- `name`
- `sort_order`
- `version`
- `deleted_at`

#### `restaurant_tables`

- `id`
- `organization_id`
- `branch_id`
- `hall_id`
- `label`
- `sequence_number`
- `capacity`
- `sort_order`
- `version`
- `deleted_at`

#### `table_sessions`

Bir müşteri grubunun masada açık kaldığı servis oturumudur.

- `id`
- `organization_id`
- `branch_id`
- `table_id`
- `status` → `open | payment_pending | closed | voided`
- `opened_by`
- `opened_at`
- `closed_by`
- `closed_at`
- `guest_count`
- `note`
- `transferred_from_table_id`
- `version`

Bir masada aynı anda tek aktif session için partial unique constraint oluşturulacaktır.

#### `session_participants`

- `session_id`
- `user_id`
- `first_action_at`
- `last_action_at`

Bu tablo masada çalışan garson avatarlarını hızlı göstermek için read model olarak kullanılabilir.

#### `checks`

Masa başındaki ayrı hesap.

- `id`
- `organization_id`
- `branch_id`
- `table_session_id`
- `name`
- `note`
- `status` → `open | partially_paid | paid | voided`
- `opened_by`
- `opened_at`
- `closed_at`
- `version`

### 10.4 Sipariş

#### `order_batches`

Garsonun aynı gönderim anında eklediği ürün grubunu temsil eder.

- `id`
- `organization_id`
- `branch_id`
- `table_session_id`
- `check_id`
- `created_by`
- `created_at`
- `client_mutation_id`

#### `order_items`

- `id`
- `organization_id`
- `branch_id`
- `table_session_id`
- `check_id`
- `order_batch_id`
- `menu_item_id` nullable; menü ürünü sonradan silinebilir
- `name_snapshot`
- `category_id_snapshot`
- `category_name_snapshot`
- `unit_price_minor`
- `currency_code`
- `tax_rate_snapshot`
- `quantity`
- `status` → `draft | ordered | served | cancelled`
- `note`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`
- `cancelled_by`
- `cancelled_at`
- `cancellation_reason_id`
- `version`

#### `order_item_modifiers`

- `id`
- `order_item_id`
- `modifier_group_name_snapshot`
- `modifier_option_name_snapshot`
- `price_delta_minor`
- `quantity`

#### `cancellation_reasons`

- `id`
- `organization_id`
- `branch_id`
- `name`
- `requires_manager`
- `is_active`

### 10.5 Ödeme ve fiş

#### `payments`

- `id`
- `organization_id`
- `branch_id`
- `table_session_id`
- `method` → `cash | card | mixed_adjustment`
- `status` → `pending | confirmed | failed | voided`
- `amount_minor`
- `tendered_minor`
- `change_minor`
- `currency_code`
- `created_by`
- `created_at`
- `confirmed_at`
- `idempotency_key`
- `device_id`

#### `payment_allocations`

- `id`
- `payment_id`
- `check_id`
- `order_item_id` nullable
- `quantity` nullable
- `amount_minor`

#### `receipts`

- `id`
- `organization_id`
- `branch_id`
- `table_session_id`
- `check_id`
- `receipt_number`
- `business_date`
- `issued_at`
- `issued_by`
- `total_minor`
- `currency_code`
- `snapshot_json`
- `pdf_storage_path`
- `pdf_hash`
- `status` → `issued | adjusted | voided`
- `adjusts_receipt_id` nullable

Kapanmış receipt satırı update edilmemeli; düzeltme yeni adjustment kaydı oluşturmalıdır.

### 10.6 Audit ve senkronizasyon

#### `audit_events`

- `id`
- `organization_id`
- `branch_id`
- `actor_user_id`
- `device_id`
- `entity_type`
- `entity_id`
- `action`
- `before_json`
- `after_json`
- `reason`
- `created_at`
- `client_mutation_id`
- `correlation_id`

#### `client_mutations`

- `id`
- `organization_id`
- `branch_id`
- `device_id`
- `client_mutation_id`
- `mutation_type`
- `entity_id`
- `result_json`
- `committed_at`

Unique constraint:

```text
(device_id, client_mutation_id)
```

Bu constraint retry/double tap nedeniyle aynı mutation'ın iki kez uygulanmasını engeller.

### 10.7 Veri tipi kuralları

- Exposed/distributed entity ID için time-ordered UUID/UUIDv7 tercih edilecek; Supabase projesinde extension desteği doğrulanacak.
- Para `price_minor/amount_minor` integer/bigint olarak saklanacak; float kullanılmayacak.
- Currency ISO 4217 kodu olarak saklanacak.
- Bütün timestamp alanları `timestamptz` olacaktır.
- İş günü `branch.timezone` ve `business_day_cutoff` ile hesaplanacaktır.
- Her foreign key ayrıca indexlenecektir.
- Sık kullanılan tenant sorguları composite index alacaktır.
- Soft-delete kullanan aktif kayıt sorguları partial index alacaktır.
- Enum benzeri durumlar text + check constraint veya kontrollü Postgres enum ile sınırlandırılacaktır.

Örnek indexler:

```text
table_sessions(branch_id, status, opened_at desc)
order_items(branch_id, table_session_id, check_id, created_at)
payments(branch_id, created_at desc)
receipts(branch_id, business_date desc, issued_at desc)
receipts(branch_id, table_session_id)
audit_events(branch_id, entity_type, entity_id, created_at desc)
memberships(user_id, status) where deleted_at is null
menu_items(branch_id, category_id, sort_order) where deleted_at is null
```

---

## 11. Yetkilendirme ve RLS

### 11.1 Genel kurallar

- Bütün tenant verileri `organization_id` taşır.
- Şubeye özel tablolarda `branch_id` zorunludur.
- RLS bütün business tablolarında açık olacaktır.
- Frontend'de buton gizlemek yetkilendirme sayılmayacaktır.
- `service_role` key hiçbir istemci bundle'ına girmeyecektir.
- RLS helper fonksiyonları `security definer`, sabit `search_path` ve indexed membership sorgusu kullanacaktır.
- RLS'de kullanılan `organization_id`, `branch_id`, `user_id` kolonları indexlenecektir.

### 11.2 Rol matrisi

| Yetki | Garson | Yönetici |
|---|---:|---:|
| Atandığı şubenin açık masalarını görme | Evet | Evet |
| Sipariş ekleme | Evet | Evet |
| Kendi/başka garsonun masasına katkı | Evet | Evet |
| Satır iptali | Şube kuralına göre | Evet |
| Ödeme alma | Evet | Evet |
| Masa taşıma/birleştirme | Evet, audit ile | Evet |
| Geçmiş fiş görme | Atandığı şube/politika | Tüm yetkili şubeler |
| Menü değiştirme | Hayır | Evet |
| Kullanıcı davet/askıya alma | Hayır | Evet |
| Garson performans raporu | Kendi özeti opsiyonel | Evet |
| Audit detayları | Sınırlı | Evet |

### 11.3 Auth UX

- Yönetici e-posta/magic link veya güvenli kimlik yöntemiyle giriş yapar.
- Yönetici garsonu davet eder ve şubeye atar.
- Her garson ayrı Supabase Auth kullanıcısıdır.
- İlk güvenli girişten sonra session cihazda persist edilir.
- İsteğe bağlı yerel hızlı kilit PIN/biometric olabilir; Supabase hesabının yerine geçmez.
- Cihaz kaybolursa yönetici cihazı revoke edebilir.
- Şifre/token uygulama loglarına yazılmaz.

---

## 12. Local-first veri ve senkronizasyon

### 12.1 Local database

Native tabloları:

- Domain entity read modelleri
- `outbox_mutations`
- `sync_cursor`
- `sync_conflicts`
- `failed_mutations`
- `local_metadata`
- `migration_history`

Webde aynı sözleşme IndexedDB adapter ile uygulanacaktır.

Repository interface örneği:

```ts
interface OrderRepository {
  addItem(input: AddOrderItemInput): Promise<LocalMutationResult>;
  moveItem(input: MoveOrderItemInput): Promise<LocalMutationResult>;
  cancelItem(input: CancelOrderItemInput): Promise<LocalMutationResult>;
  observeSession(sessionId: string): Observable<TableSessionView>;
}
```

UI, native SQLite ve web IndexedDB farkını bilmeyecektir.

### 12.2 Mutation lifecycle

```text
1. Kullanıcı aksiyonu
2. Input/domain validation
3. Tek local transaction:
   - local entity/read model güncelle
   - outbox mutation yaz
   - provisional audit event yaz
4. UI optimistic olarak anında güncellenir
5. Sync worker batch'i server RPC'ye yollar
6. Server:
   - auth + RLS + membership doğrular
   - idempotency kontrol eder
   - business constraint doğrular
   - kısa transaction içinde mutation'ı uygular
   - canonical revision ve event üretir
7. İstemci canonical sonucu local DB'ye uygular
8. Outbox kaydı `synced` olur
9. Realtime diğer cihazları uyarır
10. Diğer cihazlar event veya pull sync ile güncellenir
```

Outbox durumları:

```text
pending → sending → acknowledged
                 ├─ retryable
                 ├─ rejected
                 └─ conflict
```

### 12.3 Retry kuralları

- Retry yalnızca timeout, bağlantı, 503 ve kontrollü rate-limit gibi geçici hatalarda yapılır.
- Exponential backoff + jitter kullanılır.
- 400/401/403/validation hataları otomatik sonsuz retry edilmez.
- Payment belirsizliğinde yeni ödeme yaratılmaz; önce idempotency key ile status sorgulanır.
- Aynı branch reconnect olduğunda bütün cihazların aynı anda sync storm yaratması jitter ile engellenir.
- Mutation batch boyutu ve maksimum payload sınırlandırılır.

### 12.4 Conflict politikaları

| İşlem | Politika |
|---|---|
| Yeni sipariş satırı ekleme | Append-only; client-generated ID + idempotency ile güvenli merge |
| Adet artır/azalt | Absolute quantity yerine delta operation; server mevcut duruma uygular |
| Satır notu düzenleme | Version check; çakışmada iki değer göster ve kullanıcı seçsin |
| Hesap adı düzenleme | Son server revision korunur; kullanıcıya conflict banner |
| Satır iptali | Append cancellation event; ikinci iptal idempotent no-op |
| Menü fiyatı | Manager update version check; açık sipariş snapshot'ı etkilenmez |
| Masa taşıma/birleştirme | Server transaction; stale source/target ise reject + güncel durum |
| Ödeme | Server-authoritative strict transaction; otomatik client merge yok |
| Receipt | Immutable; conflict yerine adjustment workflow |
| Soft delete | Tombstone bütün cihazlara sync edilir |

### 12.5 Eşzamanlı garson deneyimi

- Masa header'ında aktif garsonlar gösterilir.
- Her yeni satırda ekleyen garson görünür.
- Realtime ile gelen satır kısa bir “Ayşe ekledi” feedback'i üretir.
- Presence yalnızca “kim bu masada” sinyali için kullanılabilir; yetki veya kayıt kaynağı değildir.
- İki garson aynı ürünü eklerse iki event korunur; sistem sessizce birini silmez.
- Aynı hesabın kritik alanı başka cihazda değişmişse küçük “güncellendi” etiketi gösterilir.

### 12.6 Offline UX

Global banner:

```text
Çevrimdışısın. 4 işlem cihazda güvende; bağlantı gelince senkronize edilecek.
```

Durumlar:

- `Offline — local kayıt güvenli`
- `Syncing — 4 işlem`
- `Synced`
- `Action required — 1 conflict`

Kurallar:

- Offline olmak sipariş eklemeyi engellemez.
- Ödeme offline alınacaksa işletme politikası açıkça seçilmelidir. İlk pilotta ödeme kaydı local kabul edilip “cloud confirmation pending” gösterilebilir; riskli şubeler offline ödemeyi kapatabilir.
- PWA depolaması boşalırsa cloud-confirmed kayıtlar geri çekilebilir.
- Unsynced mutation'lar export/kurtarma paketine alınabilir.
- Infinite spinner kullanılmaz.

---

## 13. Finansal ve audit değişmezleri

Aşağıdaki kurallar hem domain testlerinde hem database constraint/RPC testlerinde doğrulanacaktır:

1. Cancelled item ciroya dahil edilmez.
2. `unit_price_minor` sipariş anında snapshot alınır.
3. Modifier fiyatları ayrı snapshot olarak saklanır.
4. Check total yalnızca server fonksiyonu veya paylaşılan saf domain fonksiyonuyla hesaplanır.
5. Payment allocation toplamı payment amount'a eşit olmalıdır.
6. Bir order item'a ayrılan ödeme, ödenebilir tutarı aşamaz.
7. Check remaining sıfır olmadan `paid` olamaz.
8. Receipt numarası branch içinde unique olmalıdır.
9. Confirmed payment hard-delete edilemez.
10. Issued receipt mutate edilemez.
11. Düzeltme, original kaydı silmek yerine adjustment üretir.
12. Her iptal/değişiklik actor, device ve timestamp taşır.
13. Masa/hall/menu kaydı aktif ilişki varken hard-delete edilemez.
14. Business day, cihaz timezone'una göre değil branch timezone'una göre hesaplanır.
15. Aynı idempotency key aynı sonucu döndürür.
16. Payment ve merge transaction'ları kısa tutulur; dış API çağrısı transaction içinde yapılmaz.
17. Birden fazla row lock her zaman deterministik ID sırasıyla alınır.

---

## 14. AI menü asistanı

### 14.1 Amaç

AI, yöneticinin menü oluşturma süresini azaltır. Garson sipariş akışı AI çağrısına bağlı olmayacaktır.

Örnek giriş:

```text
patates kızartması - 4 euro
```

Örnek taslak:

- Düzeltilmiş ad: `Patates Kızartması`
- Fiyat: `4,00 EUR`
- Önerilen kategori: `Atıştırmalıklar`
- Önerilen boyutlar: `Küçük / Orta / Büyük`
- Önerilen seçenekler: `Peynirsiz / Peynirli / Ekstra Peynir`
- Sos seçenekleri: `Ketçap / Mayonez / Sossuz`
- Kısa açıklama taslağı
- Hazırlama süresi önerisi
- Alerjen: `Bilinmiyor — reçete veya tedarikçi bilgisi gerekli`

### 14.2 AI kullanım akışı

1. Yönetici doğal dil, fotoğraf/OCR sonucu veya toplu metin girer.
2. Edge Function input'u normalize eder.
3. Model strict JSON schema'ya uygun taslak döndürür.
4. Deterministik validator para, kategori, modifier limitleri ve uzunlukları kontrol eder.
5. Yönetici diff/review ekranında her alanı onaylar veya değiştirir.
6. Onaylanan taslak normal menu mutation akışından geçer.
7. AI çıktısı audit metadata'da “suggested” olarak işaretlenir.

### 14.3 AI'ın yapabilecekleri

- Ürün adı ve yazım normalizasyonu
- Kategori önerisi
- Açıklama taslağı
- Modifier group/option önerisi
- Porsiyon ve fiyat farkı taslağı
- Menüde benzer ürün/duplicate uyarısı
- TR/BG/EN çeviri taslağı
- Eksik alan kontrolü
- Toplu menü metnini yapılandırma

### 14.4 Güvenlik sınırları

- AI hiçbir kaydı otomatik publish etmez.
- API anahtarı istemcide bulunmaz; yalnızca Edge Function secret olarak tutulur.
- Alerjen “contains/free_from” bilgisi yalnızca yönetici, reçete veya tedarikçi doğrulamasıyla kesinleşir.
- AI “alerjen yok” iddiası üretemez; emin değilse `unknown` döndürür.
- Fiyat önerisi varsa açıkça öneri etiketi taşır.
- Prompt injection içerebilecek ithal menü metni data olarak işlenir.
- Output JSON schema, allow-list ve server validation uygulanır.
- Rate limit, per-organization kota ve maliyet takibi eklenir.
- AI servisi kapalıyken menü CRUD tam çalışır.
- PII ve müşteri sipariş geçmişi gereksiz yere modele gönderilmez.

### 14.5 AI rollout

1. Tek ürün taslağı
2. Modifier önerileri
3. Çeviri taslakları
4. Toplu menu import
5. Duplicate ve tutarlılık denetimi

Alerjen çıkarımı ilk rollout kapsamına kesin bilgi olarak alınmayacaktır.

---

## 15. PWA ve Android teslimatı

### 15.1 Android

- Expo EAS ile development, preview APK ve production AAB profilleri
- Secure storage içinde auth session
- SQLite local database
- App lifecycle'da sync pause/resume
- Background sync yalnızca platformun izin verdiği güvenilir aralıklarda; foreground sync temel kabul edilir
- Deep link ile branch/session/receipt açma
- Crash reporting ve release version tagging
- Update kullanıcı aktif hesap üzerindeyken zorla uygulanmaz

### 15.2 iPhone Safari/Home Screen PWA

- Web App Manifest
- Uygun icon seti ve `apple-touch-icon`
- `display: standalone`
- Theme/background color
- Safe-area CSS
- Service worker ile versioned app-shell cache
- IndexedDB local business data
- Network-first/static asset stratejileri ayrı tutulur
- API cevapları ve mutation'lar bilinçsizce service-worker cache'e alınmaz
- Offline fallback route
- Install guidance
- Storage health ve sync-age görünürlüğü

iOS/iPadOS Home Screen web push, kullanıcı etkileşimiyle izin istemelidir. Push kritik sipariş kaydının garantisi olarak kullanılmayacak, yalnızca yardımcı bildirim olacaktır.

### 15.3 Service worker update politikası

- Yeni worker `waiting` durumuna alınır.
- Aktif mutation/outbox veya açık ödeme adımı varsa reload önerilmez.
- “Yeni sürüm hazır — güvenli zamanda yenile” bildirimi gösterilir.
- Kullanıcı idle olduğunda veya vardiya sonunda update uygulanır.
- Schema migration app version ile uyumlu ve rollback planlıdır.

### 15.4 Web deployment

- Staging ve production ayrı environment
- HTTPS zorunlu
- Custom domain
- Immutable hashed asset cache
- `index.html`, manifest ve service worker kontrollü kısa cache
- CSP, security headers ve source map erişim politikası
- Deploy sonrası smoke test

---

## 16. Eski veriden geçiş

Mevcut kullanıcı verisi silinmeyecektir.

### 16.1 Migration yaklaşımı

1. Mevcut AsyncStorage snapshot'ı read-only export edilir.
2. Snapshot schema validator'dan geçer.
3. Kullanıcı bir organization ve branch oluşturur/seçer.
4. Legacy hall/table/menu/ticket/history ID'leri mapping tablosuna yazılır.
5. Açık ticket'lar `table_session + check + order_items` yapısına çevrilir.
6. Kapanmış ticket'lar receipt/history snapshot olarak import edilir.
7. Eski category/menu bilgisi bulunamayan satırlar snapshot adıyla korunur.
8. Cancelled satırlar finansal toplamdan ayrılır.
9. Import server transaction/batch süreçleriyle ve idempotency key ile yürür.
10. Entity count ve financial total reconciliation yapılır.
11. Kullanıcı özet ekranında eski/yeni toplamları görür.
12. Başarıdan sonra eski snapshot belirli süre recovery için saklanır.

### 16.2 Migration guardrail'leri

- Migration öncesi zorunlu yedek
- Versiyonlu import formatı
- Dry-run ve hata raporu
- Aynı yedeğin iki kez import edilmesini engelleyen hash
- Partial import durumunda güvenli resume
- Rollback/branch cleanup
- Finansal toplam farkı varsa otomatik tamamlandı saymama

### 16.3 Legacy özel durumları

- Orphan ticket
- Silinmiş table/menu item
- Aynı ID'nin çakışması
- Eksik `activeTicketIds`
- Cancelled satırın history total'a dahil edilmiş olması
- Float/yuvarlama farkı
- Yanlış local timezone tarih anahtarı
- Birden fazla ticket'ın ayrı hesap olarak yorumlanması

Bu kayıtlar sessizce atılmayacak; migration raporunda gösterilecektir.

---

## 17. Uygulama fazları

Tahminler “ideal mühendis-gün” değil, relative efor ve bağımlılık sırasını ifade eder. Bir geliştiriciyle güvenli pilot yaklaşık 14–18 hafta; deneyimli 2–3 kişilik küçük ekiple paralel çalışma sonucu 8–12 hafta bandında planlanabilir. Kapsam veya kalite kriterleri kesilmeden kesin tarih verilmemelidir.

### Faz 0 — Baseline, test harness ve karar kayıtları

Efor: M
Amaç: Yeniden yazım sırasında mevcut davranışı ölçmek ve regresyonu görünür yapmak.

İşler:

- Mevcut ana akışlar için characterization testleri
- Money, history ve analytics hataları için failing testler
- ESLint, Prettier, Jest/Vitest ve React Native Testing Library
- Playwright web E2E
- Supabase CLI local development
- CI temel pipeline
- Environment şeması ve secret kuralları
- ADR: local DB adapter, navigation migration, UUID stratejisi, offline payment politikası
- Feature flag altyapısı

Çıkış kriteri:

- Install, lint, typecheck, unit test ve web build CI'da çalışıyor.
- Mevcut P0/P1 mantık hataları testlerle kanıtlı.
- Mimari kararlar ADR olarak kaydedilmiş.

### Faz 1 — Domain modeli ve local database

Efor: L
Amaç: AsyncStorage store'larından transaction destekli local-first temele geçmek.

İşler:

- Domain entity/value object'leri
- Integer money modülü
- Branch timezone/business day modülü
- Native SQLite schema/migration
- Web IndexedDB adapter
- Repository interface'leri
- Outbox ve sync state tabloları
- Zustand'ı yalnızca UI state'e daraltma
- Legacy read adapter
- Boot state machine

Çıkış kriteri:

- Masa aç → ürün ekle → uygulamayı kapat/aç akışı veri kaybetmiyor.
- Local transaction ortasında simulated crash tutarsız entity bırakmıyor.
- Native ve web repository contract testleri aynı suite'i geçiyor.

### Faz 2 — Supabase SaaS temeli

Efor: L
Amaç: Çok tenant/şube, kullanıcı ve güvenli cloud kayıt.

İşler:

- Organization, branch, profile, membership, device migration'ları
- Auth davet ve session restore
- Waiter/manager RLS
- RLS performance indexleri
- Branch switch
- Device revoke
- Seed ve local Supabase testleri
- Tenant isolation testleri

Çıkış kriteri:

- Garson yalnızca atandığı şubeyi görür.
- Yönetici yetkili şubeler arasında geçebilir.
- Cross-tenant erişim testlerinin tamamı reddedilir.
- Offline session restore kontrollü çalışır.

### Faz 3 — Sync engine ve eşzamanlı çalışma

Efor: XL
Amaç: Aynı masada çok cihaz ve bağlantı kesintisi altında güvenilir çalışma.

İşler:

- Mutation envelope ve idempotency
- Push batch RPC
- Cursor pull sync
- Realtime Broadcast/private channel
- Retry/backoff/jitter
- Conflict store ve resolution UI
- Tombstone/soft-delete sync
- Active waiter presence
- Sync diagnostics ekranı
- Airplane mode ve network flapping testleri

Çıkış kriteri:

- İki cihaz aynı masaya eşzamanlı ürün eklediğinde iki kayıt da korunur.
- Aynı mutation 10 kez gönderildiğinde server'da tek kez uygulanır.
- Realtime olayı kaçıran cihaz pull sync ile aynı duruma gelir.
- 30 dakika offline çalışma sonrası veri kaybetmeden reconcile olur.

### Faz 3.5 — Tam UI/UX tasarımı ve prototype onayı

Efor: L
Amaç: Yeni arayüzü koddan önce bütün kritik akışlarıyla doğrulamak.

İşler:

- Legacy UI envanteri ve kaldırılacak pattern listesi
- Garson ve yönetici için ayrı site map
- Kritik user flow diyagramları
- Mobile-first low-fidelity wireframe seti
- Android ve iPhone Safari high-fidelity tasarımları
- Geniş web yönetici tasarımı
- Light/dark operational theme
- Design token ve component state library
- Offline/loading/error/conflict/permission state'leri
- Interactive prototype
- 3–5 gerçek garsonla task-based usability test
- Test bulgularına göre en az bir tasarım iterasyonu
- Engineering handoff ve visual QA checklist

Çıkış kriteri:

- Mevcut ekranlardan hiçbirinin layout'u yeni tasarım diye yeniden sunulmuyor.
- Ana garson görevleri renk uygulanmadan wireframe üzerinde anlaşılabiliyor.
- Sık ürün ekleme tek dokunuş olarak prototipte çalışıyor.
- Yanlış sipariş, ayrı hesap ve split payment akışları prototipte tamamlanabiliyor.
- Android telefon, iPhone Safari ve expanded web frame'leri onaylı.
- Bütün kritik component'lerin state ve accessibility sözleşmesi hazır.
- Garson testinde Severity 3–4 kullanılabilirlik problemi kalmamış.

### Faz 4 — Yeni Shift Mode ve hızlı sipariş UX

Efor: XL
Amaç: Onaylı yeni “Orderia Service Console” tasarımını üretim kalitesinde uygulamak.

İşler:

- Onaylı design token'ların native/web implementasyonu
- Legacy inline style ve eski visual component'lerin kaldırılması
- Garson AppShell ve yeni bottom navigation
- Yönetici AppShell ve responsive side rail
- Core component library ve Storybook/eşdeğer component playground
- Servis Panosu
- Masa Çalışma Alanı
- Ayrı hesap chip'leri
- Favorite/recent/frequent ürünler
- Arama ve kategori paleti
- Sticky order summary
- Modifier sheet
- Büyük quantity controls
- Undo ve cancellation reason
- Waiter attribution
- Offline/sync feedback
- TR/BG/EN typed translations
- Reduced-motion, font scaling ve screen reader davranışları
- Prototype ile side-by-side visual QA
- Compact/medium/expanded responsive doğrulama

Çıkış kriteri:

- Production UI eski Orderia yerleşimlerinden görsel olarak bağımsız.
- Sık ürün açık hesaba tek dokunuşla ekleniyor.
- Ana aksiyonlarda minimum 48 px touch target.
- Ürün ekleme ekranı her ürün sonrası kapanmıyor.
- Garson başka garsonun eklediği satırı ayırt edebiliyor.
- Light/dark operational theme aynı hiyerarşiyi koruyor.
- Offline/loading/error/conflict state'leri implement edilmiş.
- Görsel regresyon testleri onaylı tasarımın kritik frame'lerini koruyor.
- Android ve iPhone Safari gerçek cihaz usability testi tamamlanıyor.

### Faz 5 — Esnek hesap, ödeme ve masa işlemleri

Efor: XL
Amaç: Gerçek restoran düzeltme ve ödeme senaryolarını güvenli desteklemek.

İşler:

- Named checks
- Item/quantity/tutar/eşit split
- Partial ve mixed payment
- Payment allocations
- Server payment RPC
- Row lock ve idempotency
- Table transfer/merge RPC
- Stale conflict UX
- Manager approval policy
- Financial audit timeline

Çıkış kriteri:

- Split allocation invariants property-based testlerle geçiyor.
- İki cihaz aynı kalan tutarı kapatamıyor.
- Masa merge işlemi yarım durumda kalmıyor.
- Confirmed payment/receipt istemciden mutate edilemiyor.

### Faz 6 — Receipt, arşiv ve geçmiş migration

Efor: L
Amaç: Her kapanan hesabın güvenilir, aranabilir ve tekrar indirilebilir olması.

İşler:

- Receipt numbering
- Immutable snapshot
- PDF render Edge Function/job
- Private Storage policy
- Receipt search indexes
- Cursor pagination
- Tarih/saat/masa/garson/tutar filtreleri
- Download/share
- Legacy history import ve reconciliation

Çıkış kriteri:

- Bir hafta önce belirli saat ve masadaki fiş bulunup indirilebiliyor.
- Menü değişikliği eski fişi değiştirmiyor.
- Yetkisiz şube receipt dosyası indirilemiyor.
- PDF hash ve snapshot tutarlılığı doğrulanıyor.

### Faz 7 — Yönetici canlı görünüm ve garson raporu

Efor: L
Amaç: Operasyonu ve performansı güvenilir server verisiyle görünür yapmak.

İşler:

- Live branch dashboard
- Server-confirmed daily totals
- Waiter attribution query/read model
- Date/branch/waiter filters
- Cancellation context
- Export
- Büyük veri için materialized/read model değerlendirmesi

Çıkış kriteri:

- Cancelled item ciroya girmiyor.
- Silinen/değişen menü ürünü eski raporu bozmuyor.
- Aynı masaya katkı yapan garsonlar satır bazlı doğru hesaplanıyor.

### Faz 8 — Menü yönetimi ve AI asistanı

Efor: L
Amaç: Menü ekleme ve seçenek modellemeyi hızlandırmak.

İşler:

- Category/item/modifier CRUD
- Availability
- Bulk edit
- Duplicate detection
- AI Edge Function
- Strict output schema
- Review/diff ekranı
- Allergen unknown/confirmation flow
- Usage quota ve cost metrics

Çıkış kriteri:

- “Patates kızartması - 4 euro” girişi düzenlenebilir taslak üretiyor.
- Yönetici onayı olmadan hiçbir AI çıktısı publish edilmiyor.
- AI unavailable olduğunda normal menu CRUD etkilenmiyor.
- Doğrulanmamış alerjen kesin bilgi olarak gösterilmiyor.

### Faz 9 — PWA, Android release ve production hardening

Efor: L
Amaç: Güvenli pilot ve genel kullanıma çıkış.

İşler:

- Manifest/service worker/install UX
- iOS safe-area ve Home Screen testleri
- Android EAS profiles
- Bundle splitting/lazy loading
- Performance budgets
- Sentry, logs, metrics ve alerts
- Backup/PITR politikası
- Security review
- Load/concurrency test
- Migration dry-run
- Pilot runbook ve rollback

Çıkış kriteri:

- Android preview ve production build başarılı.
- PWA offline app-shell ve local order flow çalışıyor.
- Kritik E2E matrisi gerçek cihazlarda geçiyor.
- Rollback ve data recovery denendi.
- P0/P1 açık hata yok.

---

## 18. Test stratejisi

### 18.1 Unit test

- Money arithmetic
- Tax/total calculation
- Business day/timezone
- Check remaining
- Split allocation
- Modifier pricing
- Cancellation exclusion
- Waiter attribution
- Receipt snapshot
- Conflict reducers
- Retry classification

### 18.2 Property-based test

- Rastgele split işlemlerinde toplam korunur.
- Payment allocations hiçbir zaman due miktarını aşmaz.
- Merge/transfer sonrası item sayısı ve toplam değişmez.
- Aynı idempotency mutation N kez uygulanınca sonuç değişmez.
- Delta quantity işlemleri geçerli sırada negatif quantity üretmez.

### 18.3 Local adapter contract test

Aynı test suite:

- Native SQLite adapter
- Web IndexedDB adapter
- In-memory test adapter

### 18.4 Database ve RLS test

- Waiter başka organization verisini okuyamaz.
- Waiter başka branch'e yazamaz.
- Manager yalnızca membership kapsamını görür.
- Service role dışındaki kullanıcı receipt snapshot mutate edemez.
- Foreign key ve check constraint'ler invalid state'i reddeder.
- Payment/merge RPC rollback testi.
- RLS query plan ve index testi.

### 18.5 Sync ve concurrency test matrisi

| Senaryo | Beklenen |
|---|---|
| Offline ürün ekle, app kill, aç | Ürün localde ve outbox'ta kalır |
| Aynı ürüne iki kez hızlı dokun | Politika gereği quantity +2; duplicate request oluşmaz |
| Mutation cevabı kaybolur, retry olur | Idempotency aynı server sonucu döndürür |
| İki cihaz aynı masaya ürün ekler | İki satır ve iki actor korunur |
| İki cihaz aynı note'u değiştirir | Conflict görünür; sessiz veri ezme yok |
| İki cihaz kalan hesabı öder | Yalnızca ilk transaction kabul edilir |
| Masa merge sırasında bağlantı gider | Server ya tamamen commit eder ya hiç etmez |
| Realtime event kaçırılır | Cursor pull eksik değişikliği getirir |
| Kullanıcı branch yetkisi iptal edilir | Yeni mutation reddedilir; local kayıt kurtarma bilgisi gösterir |

### 18.6 E2E kritik akışlar

1. Login → branch → masa aç → ürün ekle → hesap kapat → receipt indir
2. Aynı masada iki isimli hesap
3. Ürünleri iki hesaba böl
4. Kısmi nakit + kart ödeme
5. Yanlış ürünü iptal et ve audit'i doğrula
6. Masayı taşı
7. İki masayı birleştir
8. Offline sipariş al, yeniden bağlan
9. İkinci cihazda realtime güncelleme
10. Geçmiş receipt tarih/saat/masa araması
11. Manager menu CRUD
12. AI taslağı → edit → confirm → publish
13. Tenant isolation

### 18.7 UX saha testi

En az 3–5 gerçek garsonla:

- Tek el testi
- Eldiven/ıslak el olmasa bile acele tap testi
- Gürültülü/loş ortam simülasyonu
- 20 ürün arka arkaya giriş
- Yanlış masa kurtarma
- Müşteri itirazı açıklama
- Split payment
- iPhone Safari keyboard/safe-area

Ölçülecek:

- Task completion time
- Yanlış dokunma
- Geri dönme sayısı
- Yardım isteme
- NASA-TLX benzeri algılanan yük

### 18.8 Performans test

- 1.000 masa değil, gerçekçi yoğun branch datası ve uzun tarihçe
- 100+ eşzamanlı cihaz/branch simulasyonu
- Çok garsonlu aynı masa hot-row testi
- Receipt search EXPLAIN ANALYZE
- p95/p99 RPC
- Web initial JS ve route chunk boyutu
- List virtualization ve render count
- SQLite/IndexedDB migration süresi

---

## 19. Güvenlik, gizlilik ve operasyon

### 19.1 Güvenlik

- RLS zorunlu
- Server-side input validation
- Secret manager/environment secrets
- Service role yalnızca güvenli server runtime
- Rate limit: auth, AI, export, receipt render
- Audit log erişimi yetkili role özel
- Signed/private receipt download
- Sensitive log redaction
- Dependency/security scan
- CSP ve secure headers
- Device revoke
- Session expiry ve refresh lock

### 19.2 Gizlilik

- Garson performans verisinin amacı ve görünürlüğü işletme politikasında açık olmalı.
- Gereksiz müşteri kişisel verisi tutulmamalı.
- Receipt/adisyon notlarında hassas veri girilmemesi için copy ve eğitim eklenmeli.
- Data retention organization bazında konfigüre edilebilir olmalı.
- Hesap silme/export talepleri için runbook hazırlanmalı.

### 19.3 Gözlemlenebilirlik

Log context:

- request/correlation ID
- organization/branch ID
- anonymized user/device ID
- app version
- platform
- mutation type
- sync attempt
- error class

Metrikler:

- Auth success/failure
- Sync queue depth/age
- Conflict rate
- Mutation reject rate
- Payment RPC latency/failure
- Receipt render failure
- Realtime reconnect
- Local DB migration failure
- Crash-free sessions
- AI latency/token/cost/validation failure

Alert örnekleri:

- Payment failure rate eşiği
- 10 dakikadan yaşlı outbox mutation
- Receipt render backlog
- Tenant/RLS security test failure
- Migration error spike
- Crash-free session düşüşü

---

## 20. CI/CD ve ortamlar

### 20.1 Ortamlar

- Local Supabase
- Development
- Staging
- Production

Her ortam:

- Ayrı Supabase project
- Ayrı auth config
- Ayrı storage bucket
- Ayrı secrets
- Görünür environment badge

### 20.2 Pull request pipeline

1. Install lockfile
2. Format check
3. Lint
4. Typecheck
5. Unit/property tests
6. Local adapter contract tests
7. Supabase migration lint
8. Database/RLS tests
9. Web build
10. E2E smoke
11. Dependency/security scan

### 20.3 Release pipeline

- Version ve changelog
- Migration dry-run
- Staging deploy
- Staging E2E
- Web production deploy
- Android preview/production build
- Feature flags
- Post-deploy smoke
- Metrics watch window
- Rollback command/runbook

Database migration'ları backward compatible expand/migrate/contract yaklaşımıyla yapılmalıdır. Eski client sürümü kullanımdayken kolon/tablo hemen kaldırılmamalıdır.

---

## 21. Riskler ve azaltma planı

| Risk | Olasılık/Etki | Azaltma |
|---|---|---|
| Offline sync kapsamının küçümsenmesi | Yüksek/Yüksek | Sync engine'i UI'dan önce Faz 3'te tamamlama |
| Aynı masada hot-row conflict | Orta/Yüksek | Append event, delta mutation, kısa transaction |
| Payment çift yazımı | Orta/Kritik | Idempotency, unique constraint, server lock |
| PWA local storage kaybı | Orta/Yüksek | Hızlı cloud sync, outbox health, export recovery |
| iOS background kısıtları | Yüksek/Orta | Foreground/reconnect sync'i ana yol kabul etme |
| Tenant veri sızıntısı | Düşük/Kritik | RLS, policy test, index ve security review |
| Eski local verinin bozuk olması | Yüksek/Orta | Dry-run validator, reconciliation, rollback |
| UI yeniden yazımı sırasında scope creep | Yüksek/Yüksek | Faz bazlı acceptance criteria ve feature flags |
| AI'ın yanlış alerjen üretmesi | Orta/Kritik | Unknown-by-default, human confirmation, source |
| Raporların yanlış attribution yapması | Orta/Yüksek | Satır/ödeme bazlı açık attribution tanımı |
| Receipt'in mali fiş sanılması | Orta/Yüksek | Hukuki kapsam, açık ibare, fiscal integration ayrı epic |
| Web bundle büyümesi | Yüksek/Orta | Route lazy loading, bundle budget ve ölçüm |

---

## 22. Önceliklendirilmiş backlog

### P0 — Pilot bloklayan

- Tenant/branch/auth/RLS
- Local DB ve migration
- Outbox/idempotency/cursor sync
- Masa/check/order item temel akışı
- Eşzamanlı garson attribution
- Payment transaction
- Receipt immutable snapshot
- Legacy data güvenli migration
- Kritik test/observability

### P1 — Genel kullanıma çıkış için gerekli

- Yeni Shift Mode UI
- Split/partial payment
- Masa transfer/merge
- Receipt PDF ve arşiv araması
- Garson performans raporu
- PWA install/offline/update
- Android release pipeline
- AI single-item assistant
- TR/BG/EN tutarlılığı

### P2 — Pilot sonrası hızlandırıcı

- Akıllı favoriler ve kişisel ürün sıralaması
- Toplu AI menu import
- Gelişmiş performans karşılaştırmaları
- Saved receipt filters
- Manager approval push
- İşletme bazlı shortcut özelleştirme

---

## 23. İlk issue/iş paketi sırası

1. `chore/quality-baseline` — test, lint, typecheck ve CI
2. `fix/financial-characterization` — cancelled total, historical snapshot ve today total testleri
3. `feat/domain-model-v2` — organization/branch/session/check/payment modeli
4. `feat/local-database-contract` — repository interface ve adapter contract testleri
5. `feat/native-sqlite-adapter`
6. `feat/web-indexeddb-adapter`
7. `feat/supabase-auth-tenancy`
8. `feat/supabase-rls-policies`
9. `feat/sync-outbox-idempotency`
10. `feat/sync-pull-realtime`
11. `design/orderia-service-console` — wireframe, high-fidelity UI ve garson prototype testi
12. `feat/design-system-foundation`
13. `feat/shift-board`
14. `feat/table-workspace`
15. `feat/concurrent-waiter-attribution`
16. `feat/split-payment`
17. `feat/table-transfer-merge`
18. `feat/receipt-snapshot-render`
19. `feat/receipt-archive-search`
20. `feat/waiter-performance`
21. `feat/menu-ai-assistant`
22. `feat/pwa-shell-update`
23. `release/pilot-hardening`

Her issue:

- Tek bir ölçülebilir outcome'a sahip olmalı.
- Database/API/UI değişikliklerini açıkça listelemeli.
- Migration ve rollback notu taşımalı.
- Unit/integration/E2E kabul testlerini belirtmeli.
- Gözlemlenebilirlik event/metric gereksinimini içermeli.

---

## 24. Pilot ve rollout

### 24.1 İç test

- Seed restoran
- Simulated 2 şube
- 10 garson
- 2 cihaz aynı kullanıcı ve farklı kullanıcı senaryoları
- Network throttling/airplane mode

### 24.2 Tek şube pilotu

- Mevcut data export
- Migration dry-run
- 2–3 garsonla düşük riskli vardiya
- Eski sürüm read-only recovery olarak hazır
- Gün sonunda total ve receipt reconciliation

### 24.3 Geniş pilot

- Yoğun vardiya
- Birden fazla cihaz
- Manager report doğrulaması
- Support runbook
- Günlük sync/error review

### 24.4 Genel kullanım

Şartlar:

- P0/P1 açık hata yok
- Finansal reconciliation farkı yok
- RLS güvenlik suite'i yeşil
- Crash/sync SLO hedefte
- Migration ve rollback denenmiş
- Gerçek garson UX görevleri hedef sürelerde

---

## 25. Definition of Done

Bir özellik yalnızca UI'da görünmesiyle tamamlanmış sayılmaz.

Tamamlanma şartları:

- Domain kuralı tanımlı
- Native ve web davranışı tanımlı
- Offline davranışı tanımlı
- Conflict davranışı tanımlı
- Loading/empty/error/permission state'leri var
- Erişilebilirlik kontrolü geçti
- Unit/integration testleri var
- Kritikse E2E testi var
- RLS/server validation var
- Audit event'i var
- Metric/log var
- Migration/rollback notu var
- TR/BG/EN copy tamam
- Gerçek cihaz doğrulaması yapıldı

---

## 26. Varsayımlar ve doğrulanacak kararlar

### Kabul edilen varsayımlar

- İlk ödeme yöntemleri nakit ve kart kaydıdır; gerçek kart sağlayıcısı entegrasyonu yoktur.
- Garsonlar kendi şubelerindeki bütün açık masalara yardım edebilir.
- Yönetici menu ve kullanıcı yönetimini yapar.
- Para birimi branch seviyesinde sabittir.
- Receipt işletme adisyon özetidir; mali fiş uyumluluğu ayrı çalışmadır.
- Android native uygulama ana garson deneyimidir.
- iPhone kullanıcısı Safari veya Home Screen PWA kullanacaktır.

### Faz 0'da kesinleştirilecekler

- Offline ödeme açık mı, branch bazında kapatılabilir mi?
- Garson geçmişteki bütün branch fişlerini mi, yalnızca kendi işlemlerini mi görür?
- Hangi iptal nedenleri manager onayı ister?
- Receipt numaralandırma ve yerel mali gereksinimler
- Şube business-day cutoff saati
- UUIDv7 extension availability veya alternatif ID stratejisi
- Expo Router migrasyonunun route-by-route sınırı
- Garson performans verisinin garsona gösterilip gösterilmeyeceği

---

## 27. Teknik referanslar

- Expo PWA rehberi: https://docs.expo.dev/guides/progressive-web-apps/
- Expo web yayınlama: https://docs.expo.dev/guides/publishing-websites/
- Supabase + Expo React Native: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase Auth + React Native: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime database changes: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- WebKit iOS/iPadOS Home Screen Web Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

---

## 28. Son karar

Orderia 2.0 için doğru yol, mevcut ekranları tek tek boyamak değildir. Önce transaction destekli local database, tenant-safe cloud modeli ve idempotent sync kurulmalı; ardından garsonun ana ekranı bu güvenilir omurganın üzerine yeniden yapılmalıdır.

Başarı ölçüsü “kaç özellik eklendi” değil:

- Garsonun ne kadar az düşündüğü,
- ne kadar az yanlış dokunduğu,
- bağlantı kesilince çalışmaya devam edip etmediği,
- aynı masadaki ortak çalışmanın veri ezmeden ilerleyip ilerlemediği,
- müşteri itirazında bütün geçmişin açıklanabilip açıklanamadığıdır.
