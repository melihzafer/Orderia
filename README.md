# 🍽️ Orderia - Restoran Yönetim Sistemi

**Orderia**, modern restoranlar için geliştirilmiş kapsamlı bir mobil yönetim sistemidir. React Native, Expo ve TypeScript kullanılarak geliştirilmiş olan bu uygulama, restoran işletmecilerinin günlük operasyonlarını kolayca yönetmelerini sağlar.

## 📱 Özellikler

### 🏪 Masa Yönetimi
- **Salon Bazlı Organizasyon**: Restoranınızı farklı salonlara bölebilir ve her salon için ayrı masa düzenleri oluşturabilirsiniz
- **Dinamik Masa Durumu**: Masaların açık/kapalı durumlarını gerçek zamanlı olarak takip edin
- **Görsel Masa Haritası**: Her salonun masalarını grid layout ile görsel olarak yönetin
- **Masa Etiketleme**: Her masaya özel isim veya numara atayabilirsiniz
- **Kapasite Yönetimi**: Masa başına müşteri kapasitesi belirleme

### 🍕 Menü Yönetimi
- **Kategori Bazlı Düzenleme**: Yemekleri kategorilere ayırarak düzenli bir menü oluşturun
- **Dinamik Fiyatlandırma**: Ürün fiyatlarını kolayca güncelleyin
- **Stok Takibi**: Ürünlerin mevcut durumlarını aktif/pasif olarak yönetin
- **Detaylı Ürün Bilgileri**: Her ürün için açıklama, fiyat ve kategori bilgileri
- **Hızlı Arama ve Filtreleme**: Kategori bazlı ürün filtreleme

### 📊 Sipariş Takibi
- **Gerçek Zamanlı Sipariş Yönetimi**: Açık masaların siparişlerini anlık olarak takip edin
- **Sipariş Durumu Takibi**: Beklemede, hazırlanıyor, hazır, teslim edildi durumları
- **Detaylı Sipariş Geçmişi**: Tüm siparişlerin tarihli kayıtları
- **Masa Bazlı Hesap Toplama**: Her masa için ayrı hesap tutma ve toplam hesaplama

### 📈 Raporlama ve İstatistikler
- **Günlük Satış Raporları**: Her gün için detaylı satış verileri
- **Kategori Bazlı Analiz**: Hangi kategorilerin ne kadar satıldığının analizi
- **Tarih Aralığı Raporları**: İstediğiniz tarih aralığı için kapsamlı raporlar
- **Grafik Görselleştirme**: Satış verilerinin grafik halinde sunumu

## 🎨 Tasarım ve Kullanıcı Deneyimi

### Renk Paleti
Orderia, modern ve şık bir görünüm için özel olarak tasarlanmış renk paleti kullanır:

#### Açık Tema (Light Mode)
- **Ana Renk (Primary)**: `#2563EB` - Güven veren mavi ton
- **Vurgu Rengi (Accent)**: `#DC2626` - Dikkat çekici kırmızı
- **Arkaplan (Background)**: `#F8FAFC` - Temiz beyaz ton
- **Yüzey (Surface)**: `#FFFFFF` - Saf beyaz
- **Alternatif Yüzey**: `#F1F5F9` - Hafif gri ton
- **Kenarlık (Border)**: `#E2E8F0` - Yumuşak gri kenarlık
- **Metin (Text)**: `#1E293B` - Koyu metin rengi
- **İkincil Metin**: `#64748B` - Açık gri metin

#### Koyu Tema (Dark Mode)
- **Ana Renk**: `#3B82F6` - Parlak mavi
- **Vurgu Rengi**: `#EF4444` - Canlı kırmızı
- **Arkaplan**: `#0F172A` - Derin koyu ton
- **Yüzey**: `#1E293B` - Koyu gri yüzey
- **Alternatif Yüzey**: `#334155` - Orta gri ton
- **Kenarlık**: `#475569` - Koyu kenarlık
- **Metin**: `#F1F5F9` - Açık metin
- **İkincil Metin**: `#94A3B8` - Gri metin

### Durum Renkleri
- **Beklemede**: `#F59E0B` (Amber) - Sarı/turuncu ton
- **Hazırlanıyor**: `#3B82F6` (Blue) - Mavi ton  
- **Hazır**: `#10B981` (Emerald) - Yeşil ton
- **Teslim Edildi**: `#6B7280` (Gray) - Gri ton

### Typography (Yazı Tipi)
- **Başlıklar**: System font, ağırlık 600-700
- **Gövde Metni**: System font, ağırlık 400
- **Alt Metinler**: System font, ağırlık 300
- **Buton Metinleri**: System font, ağırlık 500

## 🧩 Bileşenler (Components)

### PrimaryButton
Ana buton bileşeni, üç farklı varyant sunar:
- **Primary**: Ana eylemler için mavi arka planlı buton
- **Secondary**: İkincil eylemler için şeffaf arka planlı buton  
- **Outline**: Kenarlıklı, şeffaf arka planlı buton

**Özellikler:**
- Loading state (yükleniyor durumu)
- Disabled state (devre dışı durum)
- Üç farklı boyut (small, medium, large)
- Full width seçeneği
- Özelleştirilebilir renkler

```tsx
<PrimaryButton
  title="Sipariş Ver"
  variant="primary"
  size="medium"
  loading={false}
  onPress={handleOrder}
/>
```

### SurfaceCard
İçerik kartları için kullanılan temel bileşen:
- **Default**: Standart kart görünümü
- **Elevated**: Gölgeli, yükseltilmiş görünüm
- **Outlined**: Kenarlıklı, düz görünüm

**Padding Seçenekleri:**
- None, Small, Medium, Large

### StatusBadge
Sipariş durumlarını göstermek için kullanılan badge bileşeni:
- Durum rengine göre otomatik renklendirme
- İkon destegi (opsiyonel)
- Üç farklı boyut seçeneği

## 🗄️ Veri Yönetimi (State Management)

Orderia, **Zustand** state management kütüphanesi kullanarak modüler bir veri yönetimi sistemi sunar:

### MenuStore
Menü ve kategori yönetimi:
```typescript
- categories: Kategori listesi
- menuItems: Ürün listesi
- addCategory(): Yeni kategori ekleme
- updateCategory(): Kategori güncelleme
- deleteCategory(): Kategori silme
- addMenuItem(): Ürün ekleme
- updateMenuItem(): Ürün güncelleme
- deleteMenuItem(): Ürün silme
- getCategoriesWithItems(): Kategorileri ürünleriyle birlikte getirme
```

### LayoutStore
Salon ve masa yönetimi:
```typescript
- halls: Salon listesi
- tables: Masa listesi
- addHall(): Salon ekleme
- updateHall(): Salon güncelleme
- deleteHall(): Salon silme
- addTable(): Masa ekleme
- updateTable(): Masa güncelleme
- deleteTable(): Masa silme
- getHallsWithTables(): Salonları masalarıyla birlikte getirme
```

### OrderStore
Sipariş yönetimi:
```typescript
- openTickets: Açık siparişler
- createTicket(): Yeni sipariş oluşturma
- addItemToTicket(): Siparişe ürün ekleme
- updateTicketLine(): Sipariş kalemi güncelleme
- removeTicketLine(): Sipariş kalemi silme
- submitTicket(): Siparişi gönderme
- calculateTicketTotal(): Sipariş toplam hesaplama
```

### HistoryStore
Geçmiş ve raporlama:
```typescript
- dailyHistory: Günlük satış verileri
- addCompletedTicket(): Tamamlanan sipariş ekleme
- getDayRevenue(): Günlük gelir hesaplama
- getCategoryBreakdown(): Kategori bazlı analiz
- getDateRangeRevenue(): Tarih aralığı gelir hesaplama
```

## 🏗️ Proje Yapısı

```
src/
├── components/          # Yeniden kullanılabilir UI bileşenleri
│   ├── PrimaryButton.tsx
│   ├── SurfaceCard.tsx
│   ├── StatusBadge.tsx
│   └── index.ts
├── screens/            # Uygulama ekranları
│   ├── TablesScreen.tsx    # Ana masa görünümü
│   ├── MenuScreen.tsx      # Menü yönetimi
│   ├── HistoryScreen.tsx   # Satış geçmişi
│   ├── SettingsScreen.tsx  # Ayarlar
│   ├── TableDetailScreen.tsx # Masa detay
│   ├── AddMenuItemScreen.tsx # Ürün ekleme
│   └── AddHallScreen.tsx   # Salon ekleme
├── stores/             # State management
│   ├── menuStore.ts
│   ├── layoutStore.ts
│   ├── orderStore.ts
│   ├── historyStore.ts
│   └── index.ts
├── contexts/           # React Context'ler
│   └── ThemeContext.tsx
├── navigation/         # Navigasyon yapısı
│   └── AppNavigator.tsx
├── constants/          # Sabitler ve yardımcı fonksiyonlar
│   └── branding.ts
├── types/             # TypeScript tip tanımları
│   └── index.ts
└── utils/             # Yardımcı fonksiyonlar
    └── sampleData.ts
```

## 🚀 Teknoloji Stack'i

### Ana Teknolojiler
- **React Native 0.79.5**: Cross-platform mobil uygulama geliştirme
- **Expo ~53.0.0**: Hızlı geliştirme ve deployment platform
- **TypeScript**: Tip güvenli JavaScript geliştirme
- **React 18.3.1**: Modern React özellikleri

### State Management
- **Zustand 5.0.2**: Hafif ve performanslı state management
- **AsyncStorage**: Kalıcı veri depolama

### UI ve Styling
- **NativeWind 4.1.23**: Tailwind CSS benzeri utility-first styling
- **React Navigation**: Navigasyon yönetimi
- **Ionicons**: Modern ikon seti

### Geliştirme Araçları
- **Metro Bundler**: React Native bundling
- **Babel**: JavaScript transpiling
- **ESLint**: Kod kalitesi kontrolü

## 📋 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Expo CLI
- Android Studio (Android için)
- Xcode (iOS için)

### Kurulum Adımları

1. **Proje Klonlama**
```bash
git clone [repository-url]
cd Orderia
```

2. **Bağımlılıkları Yükleme**
```bash
npm install
```

3. **Uygulamayı Çalıştırma**
```bash
npx expo start
```

4. **Platform Seçimi**
- Android: `a` tuşuna basın
- iOS: `i` tuşuna basın  
- Web: `w` tuşuna basın

## 🔧 Yapılandırma

### Metro Configuration
Proje, path alias desteği için özel Metro yapılandırması kullanır:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

module.exports = config;
```

### Babel Configuration
```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
    ],
  };
};
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 🎯 Kullanım Kılavuzu

### 1. İlk Kurulum
Uygulama ilk açıldığında otomatik olarak örnek veriler yüklenir:
- 3 ana kategori (Ana Yemekler, İçecekler, Tatlılar)
- Her kategoride örnek ürünler
- Varsayılan salon ve masa düzeni

### 2. Masa Yönetimi
- **Ana Ekran**: Tüm salonları ve masaları görüntüleyin
- **Yeni Salon Ekleme**: Sağ üst köşedeki "+" butonunu kullanın
- **Masa Ekleme**: Salon detayında "Masa Ekle" butonunu kullanın
- **Masa Durumu**: Masaların rengine göre durumlarını takip edin

### 3. Sipariş Alma
- Masaya tıklayarak sipariş ekranına geçin
- Kategorilerden ürün seçin
- Miktarları ayarlayın
- "Sipariş Ver" ile siparişi onaylayın

### 4. Menü Yönetimi
- **Menü sekmesi**nden kategori ve ürün yönetimi
- Yeni kategori ekleyin
- Kategori başına ürün ekleyin
- Fiyat ve stok durumlarını güncelleyin

### 5. Raporlama
- **Geçmiş sekmesi**nden satış raporlarını görüntüleyin
- Günlük, haftalık, aylık raporlar
- Kategori bazlı satış analizleri

## 🔄 Solved Issues (Çözülen Sorunlar)

### Path Alias Çözümü
**Problem**: Metro bundler ve Hermes engine ile path alias uyumsuzluğu
**Çözüm**: Tüm `@/` import'ları relative path'lere dönüştürüldü

### Dosyalar:
- `src/navigation/AppNavigator.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/stores/*.ts` (tüm store dosyaları)
- `src/constants/branding.ts`
- `src/utils/sampleData.ts`
- `src/screens/*.tsx` (tüm ekran dosyaları)
- `src/components/*.tsx` (tüm component dosyaları)

### BOM Character Temizliği
**Problem**: package.json dosyasında BOM karakterleri
**Çözüm**: PowerShell ile UTF-8 encoding (BOM'suz) kullanılarak dosya yeniden kaydedildi

### Metro ve Babel Koordinasyonu
**Problem**: Module resolver çakışmaları
**Çözüm**: Babel module-resolver plugin'i kaldırıldı, sadece Metro alias kullanıldı

## 🔮 Gelecek Özellikler

### Planlanan Geliştirmeler
- **🔐 Kullanıcı Yönetimi**: Çoklu kullanıcı desteği ve yetki yönetimi
- **💳 Ödeme Entegrasyonu**: Kredi kartı ve mobil ödeme sistemleri
- **📱 QR Menü**: Müşteriler için QR kod ile dijital menü
- **🖨️ Fiş Yazdırma**: Termal yazıcı entegrasyonu
- **☁️ Cloud Sync**: Bulut tabanlı veri senkronizasyonu
- **📊 Advanced Analytics**: Gelişmiş raporlama ve analizler
- **🔔 Push Notifications**: Sipariş durumu bildirimleri
- **🎨 Theme Customization**: Özelleştirilebilir tema seçenekleri

## 🤝 Katkıda Bulunma

Orderia açık kaynak bir projedir ve katkılarınızı bekliyoruz:

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'e push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasını inceleyebilirsiniz.

## 📞 Destek ve İletişim

- **📧 Email**: support@orderia.app
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/orderia/orderia/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/orderia/orderia/discussions)

## 🙏 Teşekkürler

Orderia'nın geliştirilmesinde emeği geçen herkese teşekkür ederiz:
- React Native Community
- Expo Team
- Zustand Maintainers
- All Contributors

---

**🍽️ Orderia ile restoran yönetiminizi dijitalleştirin!**

*Made with ❤️ by OMNI Tech Solutions*
