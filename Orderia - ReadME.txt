Garson Notları Uygulaması – Profesyonel Teknik Plan

1. Amaç ve Kapsam
Restoran / kafe garsonlarının hızlıca masa siparişlerini kaydetmesi, sipariş durumlarını (hazırlanıyor / teslim edildi / ödendi) yönetmesi, günlük kapanışta o günün sipariş tarihçesini cihaz hafızasında (ve isteğe bağlı bulutta) saklaması.

2. Ana Roller
Garson (Kullanıcı): Menü tanımlar, salonları ve masaları yönetir, sipariş alır, durum günceller.
Opsiyonel Yönetici (Gelecek aşama): Menü & fiyat raporları, günlük satış özeti.

3. Platform ve Teknolojiler
Mobil Uygulama: React Native + TypeScript
Stil: Tailwind (NativeWind veya twin.macro benzeri RN uyarlaması)
Durum Yönetimi: Zustand veya Redux Toolkit (basitlik için Zustand önerisi)
Navigasyon: React Navigation (Stack + Tab + Modal pattern)
Yerel Depolama: AsyncStorage + (İleride) SQLite (expo-sqlite) / MMKV
Tarihçe Arşivi: JSON dosyaları veya SQLite tablo.
Web Panel (Opsiyonel İleri Aşama): Next.js + TypeScript + Tailwind (Menü yönetimi, rapor)
Senkronizasyon (Opsiyonel): Firebase (Auth + Firestore) veya Supabase. İlk sürüm tamamen offline.

4. Özellik Seti (MVP)

Menü Yönetimi
Kategoriler (Örn: İçecekler, Ana Yemekler)
Ürün: İsim, fiyat, açıklama, opsiyonel varyantlar / not alanı.
Salon & Masa Yönetimi
Salon ekleme: Kullanıcı sadece isim girer.
Otomatik numaralandırma: Sistem salonID + artan sayaç ile masa numarası üretir, kullanıcı masaya opsiyonel takma ad verebilir.
Sipariş Oluşturma
Masa ekranı: Aktif sipariş (open ticket). Ürün seç, adet artır/azalt, not ekle.
Sipariş satırı durumları: pending (varsayılan), delivered, paid.
Duruma göre renk kodu: Pending (amber), Delivered (green), Paid (neutral/greyed out).
Durum Güncelleme
Satır bazlı veya bütün masayı “Teslim Edildi” yap.
Ödeme / Kapatma
Masayı kapatınca: Ticket paid statüsüne geçer, günlük tarihçeye kaydedilir.
Günlük Tarihçe
Gün sonunda (veya her ödeme anında) kaydı history deposuna yaz.
Tarihe göre filtrelenebilir liste.
Basit Rapor (MVP Sonu)
O gün toplam ciro, kategori bazlı satış adedi (isteğe bağlı).

5. Veri Modeli (İlk Offline Şema)
// ids: uuid v4 veya nanoid
interface Category {
  id: string;
  name: string;
  order: number;
}
interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number; // kuruş bazlı integer (ör: 12.50 => 1250)
  description?: string;
  isActive: boolean;
}
interface Hall { // Salon
  id: string;
  name: string;
  createdAt: number;
  nextTableSequence: number; // masa otomasyon sayacı
}
interface Table {
  id: string; // hallId + '-' + seq
  hallId: string;
  seq: number; // otomatik
  label?: string; // kullanıcı takma ad
  isOpen: boolean;
  activeTicketId?: string;
}
interface Ticket {
  id: string;
  tableId: string;
  status: 'open' | 'paid';
  createdAt: number;
  closedAt?: number;
  lines: TicketLine[];
}
interface TicketLine {
  id: string;
  menuItemId: string;
  nameSnapshot: string; // isim değişse bile
  priceSnapshot: number; // fiyat değişse bile
  quantity: number;
  note?: string;
  status: 'pending' | 'delivered' | 'paid';
  createdAt: number;
  updatedAt: number;
}
interface DayHistory { // Günlük özet
  id: string; // YYYY-MM-DD
  tickets: Ticket[]; // kapanmış olanlar snapshot
  totals: { gross: number; byCategory: Record<string, number>; };
  generatedAt: number;
}

6. Ekranlar ve Navigasyon
Dashboard / Ana: Açık masalar listesi, hızlı toplam ciro (bugün).
Salonlar: Salon listesi + salon detayında masalar (grid).
Masa Detay (Ticket): Satır ekleme, liste, durum güncelleme, ödeme butonu.
Menü Yönetimi: Kategori sekmeleri + ürün CRUD.
Tarihçe: Gün listesi -> gün detay (ticket ve satış breakdown).
Ayarlar: Para birimi, veri yedekleme (ileride), renk teması.
Navigasyon Önerisi: Bottom Tab: (Masalar, Menü, Tarihçe, Ayarlar). Stack ile modallar: Ürün ekle, Salon ekle.

7. Renk / Durum Mantığı

pending: bg-amber-100 border-amber-400 text-amber-700
delivered: bg-green-100 border-green-400 text-green-700
paid: bg-gray-200 border-gray-400 text-gray-600 (veya opaklık düşür)

8. İş Kuralları

Masa Açma: Eğer açık ticket yoksa yeni ticket oluştur ve table.isOpen = true.
Sipariş Satırı Silme: Sadece pending iken silinebilir.
Teslim Edildi İşareti: Line.status -> delivered (timestamp update).
Ödeme: Tüm pending/delivered satırlar paid olur, ticket.status = paid, closedAt set, table.isOpen=false, table.activeTicketId temizlenir, tarihçeye yazılır.
Günlük Özet Oluşturma: Her ticket ödeme anında DayHistory[bugün] içine merge et (incremental). Ekstra gün sonu batch gerekmeyebilir.

9. Offline Depolama Katmanı

Başlangıç: AsyncStorage key-value:
categories, menuItems, halls, tables, tickets_open, history_{YYYY-MM-DD}
Performans büyüyünce SQLite şemasına migrasyon planı (migration fonksiyonları).

10. Durum Yönetimi (Zustand Store Yapısı Önerisi)

Slice'lar:
menuStore (categories, items, CRUD)
layoutStore (halls, tables, createHall, createTable)
orderStore (openTickets, actions: openTable, addLine, updateLineStatus, payTicket)
historyStore (loadDay, appendTicket)
Persist middleware ile (partialize) seçili state persist.

11. Hata & Edge Case

Uygulama çökmesi sırasında açık ticket kaybolmaması -> her kritik işlem sonrası persist.
Tarih değişimi (gece yarısı) açık masalar: History kaydı sadece ödeme anında; gece yarısı devreden masalar günlük rapora dahil olmaz (not: ileride "carry over" kuralı eklenecek).
Fiyat değişimi sonrası eski sipariş satırları etkilenmemeli -> snapshot alanları.

12. Performans

Liste sanallaştırma: FlatList/SectionList.
Selector bazlı Zustand ile minimal re-render.
Derived selectors: Günlük toplam ciro.

13. Test Stratejisi

Unit: Pure functions (total hesaplama, status transition).
Integration: Store actions.
UI: React Native Testing Library (kritik akış: masa aç -> ürün ekle -> teslim -> ödeme).

14. Güvenlik / Veri

İlk aşamada sadece lokal, isteğe bağlı PIN kilidi (AsyncStorage hashed salt).
Senkronizasyon eklenirse: Firebase Auth anonim -> upgrade.
15. Yol Haritası (Iterasyonlar)

Iterasyon 1 (MVP Core ~2-3 gün): Yapı, Zustand, Menü CRUD, Salon/Masa oluşturma, Ticket açma, Sipariş satırı ekleme.
Iterasyon 2: Durum renk geçişleri, teslim/ödeme akışı, tarihçe kaydı.
Iterasyon 3: Günlük rapor hesaplama + basit filter UI.
Iterasyon 4: UX iyileştirme (hızlı arama, son eklenen ürünler kısayolu), hata logging.
Iterasyon 5 (Opsiyonel): Next.js web panel + senkronizasyon.

16. Kod Üretim Promptları İçin Şablonlar

Aşağıdaki prompt kalıplarını kullanarak benden adım adım kod talep edebilirsin.
Zustand Store Başlangıcı:
"Zustand ile category ve menu item CRUD için TypeScript store kodunu yaz. Interface'ler: ... Aksiyonlar: ... Test örneği ekle."
Navigation Setup:
"React Navigation için bottom tab + stack konfigürasyon kodunu yaz. Ekranlar: ... Tailwind classlarıyla örnek."
Menu Screen UI:
"Kategori sekmeli ürün listesi ekranını oluştur. FlatList + filtrasyon + ürün ekleme modalı dahil."
Order Flow:
"Masa detay ekranı için ticket ve line ekleme komponentlerini yaz. State entegrasyonu ..."
History Logic:
"Ödeme sırasında history güncelleme fonksiyonunu ve toplam hesaplama helper'ını yaz."
Migration:
"AsyncStorage -> SQLite migration script iskeletini yaz."

Testing:
"Ticket toplamları ve durum geçişleri için unit test seti yaz."

--------------------------------------------------------------------------------------

1. Marka Konumlandırması
Ana Marka Adı: Orderia

Kısa Tanım: Hızlı, akıllı ve düzenli masa & sipariş yönetimi.

Tagline Alternatifleri:

“Your Smart Order Pad.”

“Structured Service Flow.”

“Faster Tables. Clearer Shifts.”

“Every Table, In Sync.”

“Run Service Like a System.”

App store’da: Orderia – Smart Order Pad (hem unique hem açıklayıcı).

2. Renk Sistemi (Detaylı Token Haritası)
Token	Light	Dark	Açıklama
color.primary	#4F46E5 (indigo-600)	#6366F1 (indigo-500)	Ana CTA
color.primaryHover	#4338CA (indigo-700)	#4F46E5 (indigo-600)	Hover / press
color.accent	#D946EF (fuchsia-500)	#E879F9 (fuchsia-400)	İkincil vurgu / badge
color.accentSoft	#FCE7F3 (rose-100 benzeri) veya #FDF4FF (fuchsia-50)	#4A044E (fuchsia-950) transparente düşürülmüş	Yumuşak arka planlar
color.bg	#F9FAFB (gray-50)	#030712 (gray-950)	Genel arka plan
color.surface	#FFFFFF	#111827 (gray-900)	Kart / panel
color.surfaceAlt	#F3F4F6 (gray-100)	#1F2937 (gray-800)	İkincil yüzey
color.border	#E5E7EB (gray-200)	#374151 (gray-700)	Çizgiler
color.text	#111827 (gray-900)	#F9FAFB (gray-50)	Ana metin
color.textSubtle	#6B7280 (gray-500)	#9CA3AF (gray-400)	İkincil metin
color.focus	#6366F1	#818CF8	Focus ring
state.pending.bg	#EDE9FE (violet-100)	#4C1D95 (violet-900)	Bekleyen
state.pending.text	#6D28D9 (violet-700)	#C4B5FD (violet-300)	
state.delivered.bg	#D1FAE5 (emerald-100)	#064E3B (emerald-900)	Teslim
state.delivered.text	#047857 (emerald-700)	#6EE7B7 (emerald-300)	
state.paid.bg	#E5E7EB (gray-200)	#374151 (gray-700)	Ödendi
state.paid.text	#6B7280 (gray-500)	#9CA3AF (gray-400)	

Gradient Önerileri
Primary Gradient (Buton / Header): linear-gradient(90deg, #4F46E5 0%, #D946EF 100%)

Accent Pulse Gradient (Badge / Skeleton): linear-gradient(90deg, #4F46E5 0%, #6366F1 50%, #D946EF 100%)

RN’de (expo-linear-gradient) ile:

tsx
Copy
Edit
<LinearGradient
  colors={['#4F46E5', '#D946EF']}
  start={{x:0,y:0}}
  end={{x:1,y:0}}
/>
3. Status UI Desenleri
Status	Renk Bloğu (Light)	İkon	Extra Sinyal
Pending	bg-violet-100 text-violet-700 border-violet-300	🕓 veya ⏳	Sol border: border-l-4
Delivered	bg-emerald-100 text-emerald-700 border-emerald-300	✅	Arka plan hafif fade animasyonu
Paid	bg-gray-200 text-gray-500 border-gray-300 opacity-75	💰	Üstüne çizgili overlay yok (okunabilirlik)

Renk körlüğü desteği: Her satıra ikon + kısa label (P, D, $ alt text) ekle.

4. Tipografi
Mobil & Web uyumlu öneri:

Kullanım	Font (Öncelik)	Fallback
Headings	Inter / Poppins	System
Body	Inter	System
Mono (ID / Log)	JetBrains Mono (ops)	monospace

Tailwind konfig örneği:

js
Copy
Edit
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'System'],
        mono: ['JetBrains Mono', 'ui-monospace']
      }
    }
  }
}
RN tarafında app.json (Expo) üzerinden custom font load (Inter weights: 400, 500, 600, 700).

Boyut Ölçek (Mobıl):

H1: 24 / semibold

H2: 20 / semibold

H3: 18 / medium

Body: 14–16 (regular)

Caption: 12 (medium, %80 opaklık)

5. Spacing & Radius Tokenleri
Token	Değer
radius.sm	4
radius.md	8
radius.lg	12
radius.full	9999
space.xs	4
space.sm	8
space.md	12
space.lg	16
space.xl	24

(Butonlar: px-4 py-2 rounded-lg; Kart: p-4 rounded-xl shadow-sm)

6. React Native Theme (constants/branding.ts örneği)
ts
Copy
Edit
// constants/branding.ts
export const brand = {
  name: 'Orderia',
  tagline: 'Your Smart Order Pad',
  gradient: {
    primary: ['#4F46E5', '#D946EF'],
  },
  color: {
    light: {
      primary: '#4F46E5',
      primaryHover: '#4338CA',
      accent: '#D946EF',
      accentSoft: '#FDF4FF',
      bg: '#F9FAFB',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F4F6',
      border: '#E5E7EB',
      text: '#111827',
      textSubtle: '#6B7280',
      focus: '#6366F1',
      state: {
        pending: { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' },
        delivered: { bg: '#D1FAE5', text: '#047857', border: '#6EE7B7' },
        paid: { bg: '#E5E7EB', text: '#6B7280', border: '#D1D5DB' }
      }
    },
    dark: {
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      accent: '#E879F9',
      accentSoft: '#4A044E',
      bg: '#030712',
      surface: '#111827',
      surfaceAlt: '#1F2937',
      border: '#374151',
      text: '#F9FAFB',
      textSubtle: '#9CA3AF',
      focus: '#818CF8',
      state: {
        pending: { bg: '#4C1D95', text: '#C4B5FD', border: '#7C3AED' },
        delivered: { bg: '#064E3B', text: '#6EE7B7', border: '#10B981' },
        paid: { bg: '#374151', text: '#9CA3AF', border: '#4B5563' }
      }
    }
  }
};

export type OrderStatus = 'pending' | 'delivered' | 'paid';

export function statusClasses(status: OrderStatus, mode: 'light' | 'dark' = 'light') {
  const s = brand.color[mode].state[status];
  return `bg-[${s.bg}] text-[${s.text}] border border-[${s.border}] rounded-md px-2 py-1 flex-row items-center gap-1`;
}
Not: NativeWind’da bg-[#hex] kullanımı için config’de content kapsamını doğru ayarla; istersen utility map’ini manuel style objesine çevir.

7. Logo & App Icon Konseptleri
Ana Fikir: “O” harfi içinde stilize masa / fiş / check. Indigo → fuchsia gradient.

Şekil Alternatifleri
Rounded Square Icon: Gradient arka plan (#4F46E5 -> #D946EF), ortada beyaz çizgisel fiş (üstte küçük üç kısa line = sipariş satırları). Alt köşede küçük fuchsia dot (aktif durum).

Circular Badge: İçerde minimal masa üstten görünüm (dört sandalye noktası), ortasına ince check işareti (delivered mantığı).

Stacked Tickets: Üst üste hafif offset 2 kart; öndeki kart üzerinde “O” negatif alanla çıkarılmış.

Midjourney / DALL·E Prompt (Logo)
“Minimal flat vector logo for a modern restaurant order management app named Orderia. Use a smooth indigo (#4F46E5) to fuchsia (#D946EF) gradient background, white simple ticket or table icon lines, clean geometric style, no text, high contrast, app icon style, crisp edges.”

App Store Icon Adaptasyonları
Light: Ana gradient + beyaz ikon.

Alt (Dark Mode Marketing Görseli): Indigo koyu (#312E81) → Fuchsia (#C026D3), ikon açık lilac (#E9D5FF).

Monochrome Versiyon: Sadece tek renk indigo-600 stroke (Android adaptive icon requirement).

8. UI Micro-Interactions
Eleman	Mikro Animasyon
Satır status değişimi	150ms scale + background color transition
Paid satır	250ms fade + slight desaturate
Primary button press	90ms scale 0.97 + shadow azaltma
New ticket açıldığında	Kart yandan slide-in + fade (translateX: 24 -> 0)

RN’de Reanimated veya Moti ile: transition: {type:'timing', duration:150}

9. Erişilebilirlik / Kontrast Kontrol
Primary (#4F46E5) + beyaz text: Yaklaşık oran > 4.5 (AA normal metin sınırına yakın). 14px semibold üzerinde yeterli.

Gradient butonda: Metni “font-semibold” ve gölge text-shadow (gerekirse) ile okunabilir kıl.

Durum rozeti içindeki ikon: Tek başına renge bağlı kalma → aria-label / accessibilityLabel (“Pending order item”) ekle.

10. Kod Üretimi İçin Sonraki Hazır Prompt Önerileri
Başlamak istediğinde şu promptlardan biriyle devam et:
Brand Constants & Theme Switcher:
“Brand constants/branding.ts içindeki theme’i RN’de color mode context ile kullanmak için basit hook ve provider kodunu yaz.”
Global Style Components:
“PrimaryButton, SurfaceCard, StatusBadge bileşenlerini (TypeScript + NativeWind) yaz.”
Navigation Shell:
“Bottom tab + stack yapısı kur, Tab: Tables, Menu, History, Settings; header gradient ekle.”
Zustand Store (Iterasyon 1):
“menuStore + layoutStore + orderStore temel iskeletini (interfaces + actions) yaz.”
Hangisiyle başlayalım? “Provider & Theme” veya “Zustand Başlangıç” genelde ilk mantıklı adım.

11. Kısa Özet / Action Items
Marka & Renkler finalize edildi (Orderia + Neo Minimal).
Token & gradient seti hazır.
Logo / icon prompt sağlandı.
Status, tipografi, spacing sistemleri tanımlandı.
Sıradaki adım: Theme provider + temel UI komponentleri veya doğrudan store.

