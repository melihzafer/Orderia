export interface Translation {
  // Common
  add: string;
  edit: string;
  delete: string;
  cancel: string;
  save: string;
  update: string;
  confirm: string;
  confirmDelete: string;
  yes: string;
  no: string;
  back: string;
  next: string;
  done: string;
  loading: string;
  error: string;
  success: string;
  genericError: string;
  all: string;
  close: string;
  
  // Navigation
  tables: string;
  menu: string;
  orders: string;
  history: string;
  settings: string;
  
  // Navigation titles
  tablesTitle: string;
  menuManagement: string;
  salesHistory: string;
  addMenuItem: string;
  
  // Tables
  addHall: string;
  addTable: string;
  addTableConfirm: string;
  editHall: string;
  editTable: string;
  deleteTable: string;
  deleteTableConfirm: string;
  deleteHall: string;
  deleteHallConfirm: string;
  hallDeleted: string;
    hallName: string;
  hallNameHint: string;
  hallExamples: string;
  tableName: string;
  openTables: string;
  tableDetail: string;
  noHalls: string;
  noTables: string;
  addFirstHall: string;
  addNewHall: string;
  tableLabel: string;
  enterTableLabel: string;
  enterHallName: string;
  enterNewHallName: string;
  enterNewTableName: string;
  hallUpdated: string;
  tableUpdated: string;
  tableNameHint: string;
  tableDeleted: string;
  
  // Menu & Categories
  addCategory: string;
  editCategory: string;
  editMenuItem: string;
  categoryName: string;
  enterCategoryName: string;
  enterNewCategoryName: string;
  categoryAdded: string;
  categoryUpdated: string;
  deleteCategory: string;
  deleteCategoryConfirm: string;
  categoryDeleted: string;
  selectCategoryFirst: string;
  deleteItem: string;
  deleteItemConfirm: string;
  searchItems: string;
  noCategoriesYet: string;
  addFirstCategory: string;
  noItemsFound: string;
  noCategoryItems: string;
  addFirstItem: string;
  itemAddError: string;
  addNewItem: string;
  
  // Orders & Tables
  newOrder: string;
  addItem: string;
  orderTotal: string;
  paymentComplete: string;
  orderStatus: string;
  quantity: string;
  notes: string;
  orderNotes: string;
  addNote: string;
  addNoteHint: string;
  deliverAll: string;
  deliverAllConfirm: string;
  deliver: string;
  makePayment: string;
  paymentConfirm: string;
  tableNotFound: string;
  tableNotOpened: string;
  openTable: string;
  noOrdersYet: string;
  addFirstOrder: string;
  addOrder: string;
  deliverAllOrders: string;
  deleteOrder: string;
  deleteOrderConfirm: string;
  deleteOrderWarning: string;
  total: string;
  note: string;
  orderNote: string;
  
  // Status
  open: string;
  preparing: string;
  ready: string;
  served: string;
  paid: string;
  pending: string;
  delivered: string;
  cancelled: string;
  
  // History & Reports
  dailyTotal: string;
  totalOrders: string;
  totalSales: string;
  noHistory: string;
  exportReport: string;
  backupData: string;
  dataManagement: string;
  dataExport: string;
  dataImport: string;
  featureInDevelopment: string;
  ok: string;
  restorePreviousData: string;
  appInfo: string;
  version: string;
  orderBill: string;
  askForOrderBill: string;
  orderBillGenerated: string;
  table: string;
  date: string;
  time: string;
  item: string;
  unitPrice: string;
  
  // Payment & Billing
  payment: string;
  totalAmount: string;
  amountReceived: string;
  change: string;
  cash: string;
  card: string;
  insufficientFunds: string;
  orderName: string;
  paymentMethod: string;
  thankYouNote: string;
  shareBill: string;
  sharingNotAvailable: string;
  itemTotal: string;
  orderId: string;
  thank_you_for_your_visit: string;
  productNameRequired: string;
  priceRequired: string;
  categoryRequired: string;
  validPriceRequired: string;
  productName: string;
  priceLabel: string;
  description: string;
  category: string;
  enterProductName: string;
  productDescription: string;
  ordersCount: string;
  noSalesHistory: string;
  exportCSV: string;
  exportPDF: string;
  
  // Settings
  language: string;
  currency: string;
  theme: string;
  lightMode: string;
  darkMode: string;
  
  // Currencies
  turkish_lira: string;
  bulgarian_lev: string;
  euro: string;
  
  // Messages
  hallAdded: string;
  tableAdded: string;
  orderAdded: string;
  itemAdded: string;
  reportExported: string;
  
  // Data Import/Export
  dataExported: string;
  exportFailed: string;
  importWarning: string;
  import: string;
  importFailed: string;
  dataImported: string;
  importProcessingFailed: string;
  
  // Analytics
  analytics: string;
  salesAnalytics: string;
  totalRevenue: string;
  averageOrder: string;
  topSellingItems: string;
  noItemsSold: string;
  salesChart: string;
  revenue: string;
  categories: string;
  peakHours: string;
  noDataAvailable: string;
  noCategoryData: string;
  today: string;
  thisWeek: string;
  thisMonth: string;
  thisYear: string;
  custom: string;
  
  // QR Menu
  qrMenu: string;
  qrMenuManagement: string;
  qrMenuSettings: string;
  enableQRMenu: string;
  enableQRMenuDescription: string;
  allowDirectOrdering: string;
  allowDirectOrderingDescription: string;
  showPrices: string;
  showPricesDescription: string;
  selectTable: string;
  qrCode: string;
  share: string;
  regenerate: string;
  bulkActions: string;
  shareAllQRCodes: string;
  exportQRPDF: string;
  qrMenuDisabled: string;
  qrMenuDisabledDescription: string;
  qrGenerationError: string;
  shareError: string;
  shareAllError: string;
  pdfExported: string;
  pdfExportError: string;
  
  // Notifications
  notificationPermission: string;
  notificationPermissionMessage: string;
  orderReady: string;
  orderReadyMessage: string;
  kitchenDisplay: string;
  readyForPickup: string;
  kitchenAlert: string;
  pendingOrders: string;
  awaitingPreparation: string;
  statusUpdate: string;
  tableStatus: string;
  occupied: string;
  available: string;
  cleaning: string;
  reserved: string;
  preparationReminder: string;
  orderShouldBeReady: string;
  minutes: string;
  sold: string;
  
  // Search & Product Selection
  searchProducts: string;
  searchProductsHint: string;
  selectProduct: string;
  allCategories: string;
  clearSearch: string;
  noSearchResults: string;
  noProductsInCategory: string;
  noProducts: string;
  tryDifferentSearch: string;
  selectDifferentCategory: string;
  itemsFound: string;
  tapToAddItem: string;
  
  // Timer & Notifications
  notifications: string;
  activeTimers: string;
  recentUpdates: string;
  noActiveTimers: string;
  noRecentUpdates: string;
  startTimerToTrack: string;
  cancelTimer: string;
  cancelTimerConfirm: string;
  pause: string;
  resume: string;
  complete: string;
  markAsComplete: string;
  
  // PDF Export
  poweredBy: string;
  smartOrderPad: string;
  generatedOn: string;
  scanForMore: string;
  
  // QR Codes
  qrCodes: string;
  generateQR: string;
  shareQRCodes: string;
  exportQRCodes: string;
}

export const translations: Record<string, Translation> = {
  tr: {
    // Common
    add: 'Ekle',
    edit: 'Düzenle',
    delete: 'Sil',
    cancel: 'İptal',
    save: 'Kaydet',
    update: 'Güncelle',
    confirm: 'Onayla',
    confirmDelete: 'Silmeyi Onayla',
    yes: 'Evet',
    no: 'Hayır',
    back: 'Geri',
    next: 'İleri',
    done: 'Tamam',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    genericError: 'Bir hata oluştu',
    all: 'Tümü',
    close: 'Kapat',
    
    // Navigation
    tables: 'Masalar',
    menu: 'Menü',
    orders: 'Siparişler',
    history: 'Geçmiş',
    settings: 'Ayarlar',
    
    // Navigation titles
    tablesTitle: 'Orderia - Masalar',
    menuManagement: 'Menü Yönetimi',
    salesHistory: 'Satış Tarihçesi',
    addMenuItem: 'Ürün Ekle',
    
    // Tables
    addHall: 'Salon Ekle',
    addTable: 'Masa Ekle',
    addTableConfirm: 'Yeni masa eklensin mi?',
    editHall: 'Salon Düzenle',
    editTable: 'Masayı Düzenle',
    deleteTable: 'Masa Sil',
    deleteTableConfirm: 'Bu masayı silmek istediğinizden emin misiniz?',
    deleteHall: 'Salon Sil',
    deleteHallConfirm: 'Bu salonu silmek istediğinizden emin misiniz? Salondaki tüm masalar da silinecektir.',
    hallDeleted: 'Salon silindi',
    hallName: 'Salon Adı',
    hallNameHint: 'Salon oluşturduktan sonra masalar ekleyebilirsiniz.',
    hallExamples: 'Örnekler: "Ana Salon", "Teras", "Üst Kat", "Bahçe"',
    tableName: 'Masa Adı',
    openTables: 'Açık Masalar',
    tableDetail: 'Masa Detayı',
    noHalls: 'Henüz salon eklenmemiş',
    noTables: 'Bu salonda henüz masa yok',
    addFirstHall: 'İlk Salonu Ekle',
    addNewHall: 'Yeni Salon Ekle',
    tableLabel: 'Masa Etiketi',
    enterTableLabel: 'Masa için bir takma ad girin (opsiyonel):',
    enterHallName: 'Salon adını girin:',
    enterNewHallName: 'Yeni salon adını girin:',
    enterNewTableName: 'Yeni masa adını girin:',
    hallUpdated: 'Salon başarıyla güncellendi',
    tableUpdated: 'Masa başarıyla güncellendi',
    tableNameHint: 'Boş bırakırsanız "Masa {seq}" kullanılır',
    tableDeleted: 'Masa başarıyla silindi',
    
    // Menu & Categories
    addCategory: 'Kategori Ekle',
    editCategory: 'Kategori Düzenle',
    editMenuItem: 'Ürünü Düzenle',
    categoryName: 'Kategori Adı',
    enterCategoryName: 'Kategori adını girin:',
    enterNewCategoryName: 'Yeni kategori adını girin:',
    categoryAdded: 'Kategori başarıyla eklendi',
    categoryUpdated: 'Kategori başarıyla güncellendi',
    deleteCategory: 'Kategori Sil',
    deleteCategoryConfirm: 'Bu kategoriyi silmek istediğinizden emin misiniz?',
    categoryDeleted: 'Kategori silindi',
    selectCategoryFirst: 'Önce bir kategori seçin veya oluşturun',
    deleteItem: 'Ürünü Sil',
    deleteItemConfirm: 'ürününü silmek istediğinizden emin misiniz?',
    searchItems: 'Ürün ara...',
    noCategoriesYet: 'Henüz kategori eklenmemiş',
    addFirstCategory: 'İlk Kategoriyi Ekle',
    noItemsFound: 'Arama sonucu bulunamadı',
    noCategoryItems: 'Bu kategoride henüz ürün yok',
    addFirstItem: 'İlk Ürünü Ekle',
    itemAddError: 'Ürün eklenirken bir hata oluştu.',
    addNewItem: 'Yeni Ürün Ekle',
    
    // Orders & Tables
    newOrder: 'Yeni Sipariş',
    addItem: 'Ürün Ekle',
    orderTotal: 'Sipariş Toplamı',
    paymentComplete: 'Ödeme Tamamlandı',
    orderStatus: 'Sipariş Durumu',
    quantity: 'Adet',
    notes: 'Notlar',
    orderNotes: 'Sipariş Notları',
    deliverAll: 'Hepsini Teslim Et',
    deliverAllConfirm: 'Tüm bekleyen siparişleri teslim edildi olarak işaretlemek istediğinizden emin misiniz?',
    deliver: 'Teslim Et',
    makePayment: 'Ödeme Al',
    paymentConfirm: 'Ödeme almak istediğinizden emin misiniz?',
    tableNotFound: 'Masa bulunamadı',
    tableNotOpened: 'Bu masa henüz açılmamış',
    openTable: 'Masayı Aç',
    noOrdersYet: 'Henüz sipariş alınmamış',
    addFirstOrder: 'İlk Siparişi Ekle',
    addOrder: 'Sipariş Ekle',
    deliverAllOrders: 'Tüm Siparişleri Teslim Et',
    deleteOrder: 'Siparişi Sil',
    deleteOrderConfirm: 'siparişini silmek istediğinizden emin misiniz',
    deleteOrderWarning: 'Bu işlem geri alınamaz.',
    total: 'Toplam',
    note: 'Not',
    orderNote: 'Sipariş notu (opsiyonel)...',
    addNote: 'Not Ekle',
    addNoteHint: 'Özel talimatlar veya notlar ekleyin...',
    
    // Status
    open: 'AÇIK',
    preparing: 'HAZIRLANIYOR',
    ready: 'HAZIR',
    served: 'SERVİS EDİLDİ',
    paid: 'ÖDENDİ',
    pending: 'Bekliyor',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    
    // History & Reports
    dailyTotal: 'Bugünkü Toplam',
    totalOrders: 'sipariş',
    totalSales: 'Toplam Satış',
    noHistory: 'Henüz satış tarihçesi yok',
    exportReport: 'Raporu Dışa Aktar',
    backupData: 'Verilerinizi yedekleyin',
    dataManagement: 'Veri Yönetimi',
    dataExport: 'Veri Dışa Aktarma',
    dataImport: 'Veri İçe Aktarma',
    featureInDevelopment: 'Bu özellik henüz geliştirilme aşamasında.',
    ok: 'Tamam',
    restorePreviousData: 'Önceki verilerinizi geri yükleyin',
    appInfo: 'Uygulama Bilgileri',
    version: 'Sürüm',
    orderBill: 'Sipariş Faturası',
    askForOrderBill: 'Sipariş faturasını oluşturup paylaşmak ister misiniz?',
    orderBillGenerated: 'Sipariş faturası başarıyla oluşturuldu',
    table: 'Masa',
    date: 'Tarih',
    time: 'Saat',
    item: 'Ürün',
    unitPrice: 'Birim Fiyat',
    
    // Payment & Billing
    payment: 'Ödeme',
    totalAmount: 'Toplam Tutar',
    amountReceived: 'Alınan Miktar',
    change: 'Para Üstü',
    cash: 'Nakit',
    card: 'Kart',
    insufficientFunds: 'Yetersiz bakiye',
    orderName: 'Sipariş Adı',
    paymentMethod: 'Ödeme Yöntemi',
    thankYouNote: 'Ziyaretiniz için teşekkür ederiz!',
    shareBill: 'Faturayı Paylaş',
    sharingNotAvailable: 'Paylaşım bu cihazda mevcut değil.',
    itemTotal: 'Ürün Toplamı',
    orderId: 'Sipariş ID',
    thank_you_for_your_visit: 'Ziyaretiniz için teşekkürler',
    productNameRequired: 'Ürün adı gereklidir.',
    priceRequired: 'Fiyat gereklidir.',
    categoryRequired: 'Kategori seçmelisiniz.',
    validPriceRequired: 'Geçerli bir fiyat girin.',
    productName: 'Ürün Adı',
    priceLabel: 'Fiyat',
    description: 'Açıklama',
    category: 'Kategori',
    enterProductName: 'Ürün adını girin...',
    productDescription: 'Ürün açıklaması (opsiyonel)...',
    ordersCount: 'sipariş',
    noSalesHistory: 'Henüz satış tarihçesi yok',
    exportCSV: 'CSV Olarak Dışa Aktar',
    exportPDF: 'PDF Olarak Dışa Aktar',
    
    // Settings
    language: 'Dil',
    currency: 'Para Birimi',
    theme: 'Tema',
    lightMode: 'Açık Mod',
    darkMode: 'Koyu Mod',
    
    // Currencies
    turkish_lira: 'Türk Lirası (₺)',
    bulgarian_lev: 'Bulgar Levası (лв)',
    euro: 'Euro (€)',
    
    // Messages
    hallAdded: 'Salon başarıyla eklendi',
    tableAdded: 'Masa başarıyla eklendi',
    orderAdded: 'Sipariş başarıyla eklendi',
    itemAdded: 'Ürün sepete eklendi',
    reportExported: 'Rapor başarıyla dışa aktarıldı',
    
    // Data Import/Export
    dataExported: 'Veriler başarıyla dışa aktarıldı',
    exportFailed: 'Veri dışa aktarma başarısız oldu',
    importWarning: 'Bu işlem mevcut tüm verileri siler ve yedek dosyasından verileri geri yükler. Devam etmek istediğinizden emin misiniz?',
    import: 'İçe Aktar',
    importFailed: 'Veri içe aktarma başarısız oldu',
    dataImported: 'Veriler başarıyla içe aktarıldı',
    importProcessingFailed: 'Verileri işlerken hata oluştu',
    
    // Analytics
    analytics: 'Analitik',
    salesAnalytics: 'Satış Analitiği',
    totalRevenue: 'Toplam Gelir',
    averageOrder: 'Ortalama Sipariş',
    topSellingItems: 'En Çok Satan Ürünler',
    noItemsSold: 'Bu dönemde satılan ürün yok',
    salesChart: 'Satış Grafiği',
    revenue: 'Gelir',
    categories: 'Kategoriler',
    peakHours: 'Yoğun Saatler',
    noDataAvailable: 'Veri bulunmuyor',
    noCategoryData: 'Kategori verisi bulunmuyor',
    today: 'Bugün',
    thisWeek: 'Bu Hafta',
    thisMonth: 'Bu Ay',
    thisYear: 'Bu Yıl',
    custom: 'Özel',
    
    // QR Menu
    qrMenu: 'QR Menü',
    qrMenuManagement: 'QR Menü Yönetimi',
    qrMenuSettings: 'QR Menü Ayarları',
    enableQRMenu: 'QR Menüyü Etkinleştir',
    enableQRMenuDescription: 'Müşterilerin QR kod ile menüyü görüntülemesini sağla',
    allowDirectOrdering: 'Direkt Sipariş Ver',
    allowDirectOrderingDescription: 'Müşteriler direkt sipariş verebilir',
    showPrices: 'Fiyatları Göster',
    showPricesDescription: 'QR menüde ürün fiyatlarını göster',
    selectTable: 'Masa Seç',
    qrCode: 'QR Kod',
    share: 'Paylaş',
    regenerate: 'Yeniden Oluştur',
    bulkActions: 'Toplu İşlemler',
    shareAllQRCodes: 'Tüm QR Kodları Paylaş',
    exportQRPDF: 'PDF Olarak Dışa Aktar',
    qrMenuDisabled: 'QR Menü Devre Dışı',
    qrMenuDisabledDescription: 'Masalarınız için QR kodları oluşturmak ve müşterilerin menünüzü dijital olarak görmesini sağlamak için QR Menüyü etkinleştirin.',
    qrGenerationError: 'QR kod oluşturulamadı',
    shareError: 'QR kod paylaşılamadı',
    shareAllError: 'Tüm QR kodları paylaşılamadı',
    pdfExported: 'PDF başarıyla dışa aktarıldı',
    pdfExportError: 'PDF dışa aktarılamadı',
    
    // Notifications
    notificationPermission: 'Bildirim İzni',
    notificationPermissionMessage: 'Sipariş güncellemelerini almak için lütfen bildirimleri etkinleştirin',
    orderReady: 'Sipariş Hazır',
    orderReadyMessage: 'Sipariş teslime hazır:',
    kitchenDisplay: 'Mutfak Ekranı',
    readyForPickup: 'Teslime hazır',
    kitchenAlert: 'Mutfak Uyarısı',
    pendingOrders: 'bekleyen sipariş',
    awaitingPreparation: 'hazırlanmayı bekliyor',
    statusUpdate: 'Durum Güncellemesi',
    tableStatus: 'Masa durumu değişti:',
    occupied: 'Dolu',
    available: 'Müsait',
    cleaning: 'Temizleniyor',
    reserved: 'Rezerve',
    preparationReminder: 'Hazırlık Hatırlatıcısı',
    orderShouldBeReady: 'Sipariş hazır olması gereken süre:',
    minutes: 'dakika',
    sold: 'satıldı',
    
    // Search & Product Selection
    searchProducts: 'Ürün ara...',
    searchProductsHint: 'Ürün aramak için yazın, ok tuşları ile gezinin, Enter ile seçin',
    selectProduct: 'Ürün Seç',
    allCategories: 'Tüm Kategoriler',
    clearSearch: 'Aramayı temizle',
    noSearchResults: 'Hiçbir ürün bulunamadı',
    noProductsInCategory: 'Bu kategoride ürün yok',
    noProducts: 'Hiçbir ürün mevcut değil',
    tryDifferentSearch: 'Farklı bir arama terimi deneyin veya kategorilere göz atın',
    selectDifferentCategory: 'Farklı bir kategori seçin veya ürün ekleyin',
    itemsFound: 'ürün bulundu',
    tapToAddItem: 'Bu ürünü eklemek için dokunun',
    
    // Timer & Notifications
    notifications: 'Bildirimler',
    activeTimers: 'Aktif Zamanlayıcılar',
    recentUpdates: 'Son Güncellemeler',
    noActiveTimers: 'Aktif zamanlayıcı yok',
    noRecentUpdates: 'Son güncelleme yok',
    startTimerToTrack: 'Pişirme ilerlemesini takip etmek için zamanlayıcı başlatın',
    cancelTimer: 'Zamanlayıcıyı İptal Et',
    cancelTimerConfirm: 'şu ürün için zamanlayıcıyı iptal etmek istediğinizden emin misiniz',
    pause: 'Duraklat',
    resume: 'Devam Et',
    complete: 'Tamamla',
    markAsComplete: 'Tamamlandı olarak işaretle',
    
    // PDF Export
    poweredBy: 'Destekleyen',
    smartOrderPad: 'Akıllı Sipariş Defteriniz',
    generatedOn: 'Oluşturulma tarihi',
    scanForMore: 'Daha fazla bilgi için tarayın',
    
    // QR Codes
    qrCodes: 'QR Kodları',
    generateQR: 'QR Kodu Oluştur',
    shareQRCodes: 'QR Kodlarını Paylaş',
    exportQRCodes: 'QR Kodlarını Dışa Aktar',
  },
  
  bg: {
    // Common
    add: 'Добави',
    edit: 'Редактирай',
    delete: 'Изтрий',
    cancel: 'Отказ',
    save: 'Запази',
    update: 'Обнови',
    confirm: 'Потвърди',
    confirmDelete: 'Потвърди изтриването',
    yes: 'Да',
    no: 'Не',
    back: 'Назад',
    next: 'Напред',
    done: 'Готово',
    loading: 'Зареждане...',
    error: 'Грешка',
    success: 'Успешно',
    genericError: 'Възникна грешка',
    all: 'Всички',
    close: 'Затвори',
    
    // Navigation
    tables: 'Маси',
    menu: 'Меню',
    orders: 'Поръчки',
    history: 'История',
    settings: 'Настройки',
    
    // Navigation titles
    tablesTitle: 'Orderia - Маси',
    menuManagement: 'Управление на Меню',
    salesHistory: 'История на Продажбите',
    addMenuItem: 'Добави Артикул',
    
    // Tables
    addHall: 'Добави Зала',
    addTable: 'Добави Маса',
    addTableConfirm: 'Искате ли да добавите нова маса?',
    editHall: 'Редактирай Зала',
    editTable: 'Редактирай Маса',
    deleteTable: 'Изтрий Маса',
    deleteTableConfirm: 'Сигурни ли сте, че искате да изтриете тази маса?',
    deleteHall: 'Изтрий Зала',
    deleteHallConfirm: 'Сигурни ли сте, че искате да изтриете тази зала? Всички маси в залата също ще бъдат изтрити.',
    hallDeleted: 'Залата е изтрита',
    hallName: 'Име на Залата',
    hallNameHint: 'След създаване на залата можете да добавите маси.',
    hallExamples: 'Примери: "Основна Зала", "Тераса", "Горен Етаж", "Градина"',
    tableName: 'Име на Масата',
    openTables: 'Отворени Маси',
    tableDetail: 'Детайли за Масата',
    noHalls: 'Все още няма добавени зали',
    noTables: 'В тази зала все още няма маси',
    addFirstHall: 'Добави Първата Зала',
    addNewHall: 'Добави Нова Зала',
    tableLabel: 'Етикет на Масата',
    enterTableLabel: 'Въведете прякор за масата (по избор):',
    enterHallName: 'Въведете име на залата:',
    enterNewHallName: 'Въведете ново име на залата:',
    enterNewTableName: 'Въведете ново име на масата:',
    hallUpdated: 'Залата е успешно обновена',
    tableUpdated: 'Масата е успешно обновена',
    tableNameHint: 'Ако оставите празно ще се използва "Маса {seq}"',
    tableDeleted: 'Масата е успешно изтрита',
    
    // Menu & Categories
    addCategory: 'Добави Категория',
    editCategory: 'Редактирай Категория',
    editMenuItem: 'Редактирай Артикул',
    categoryName: 'Име на Категорията',
    enterCategoryName: 'Въведете име на категорията:',
    enterNewCategoryName: 'Въведете ново име на категорията:',
    categoryAdded: 'Категорията е добавена успешно',
    categoryUpdated: 'Категорията е обновена успешно',
    deleteCategory: 'Изтрий Категория',
    deleteCategoryConfirm: 'Сигурни ли сте, че искате да изтриете тази категория?',
    categoryDeleted: 'Категорията е изтрита',
    selectCategoryFirst: 'Първо изберете или създайте категория',
    deleteItem: 'Изтрий Артикул',
    deleteItemConfirm: 'сигурни ли сте, че искате да изтриете артикула?',
    searchItems: 'Търси артикули...',
    noCategoriesYet: 'Все още няма добавени категории',
    addFirstCategory: 'Добави Първата Категория',
    noItemsFound: 'Няма намерени резултати',
    noCategoryItems: 'В тази категория все още няма артикули',
    addFirstItem: 'Добави Първия Артикул',
    itemAddError: 'Възникна грешка при добавяне на артикула.',
    addNewItem: 'Добави Нов Артикул',
    
    // Orders & Tables
    newOrder: 'Нова Поръчка',
    addItem: 'Добави Артикул',
    orderTotal: 'Общо Поръчка',
    paymentComplete: 'Плащането е Завършено',
    orderStatus: 'Статус на Поръчката',
    quantity: 'Количество',
    notes: 'Бележки',
    orderNotes: 'Бележки за Поръчката',
    deliverAll: 'Достави Всички',
    deliverAllConfirm: 'Сигурни ли сте, че искате да маркирате всички чакащи поръчки като доставени?',
    deliver: 'Достави',
    makePayment: 'Вземи Плащане',
    paymentConfirm: 'Сигурни ли сте, че искате да вземете плащането?',
    tableNotFound: 'Масата не е намерена',
    tableNotOpened: 'Тази маса все още не е отворена',
    openTable: 'Отвори Маса',
    noOrdersYet: 'Все още няма поръчки',
    addFirstOrder: 'Добави Първата Поръчка',
    addOrder: 'Добави Поръчка',
    deliverAllOrders: 'Достави Всички Поръчки',
    deleteOrder: 'Изтрий Поръчка',
    deleteOrderConfirm: 'сигурни ли сте, че искате да изтриете',
    deleteOrderWarning: 'Това действие не може да бъде отменено.',
    total: 'Общо',
    note: 'Бележка',
    orderNote: 'Бележка за поръчката (незадължително)...',
    addNote: 'Добави Бележка',
    addNoteHint: 'Добавете специални инструкции или бележки...',
    
    // Status
    open: 'ОТВОРЕНА',
    preparing: 'ПОДГОТВЯ СЕ',
    ready: 'ГОТОВА',
    served: 'СЕРВИРАНА',
    paid: 'ПЛАТЕНА',
    pending: 'Изчакване',
    delivered: 'Доставена',
    cancelled: 'Отказана',
    
    // History & Reports
    dailyTotal: 'Дневен Общ Оборот',
    totalOrders: 'поръчки',
    totalSales: 'Общи Продажби',
    noHistory: 'Все още няма история на продажбите',
    exportReport: 'Експортиране на Отчет',
    backupData: 'Направете резервно копие на данните',
    dataManagement: 'Управление на Данни',
    dataExport: 'Експортиране на Данни',
    dataImport: 'Импортиране на Данни',
    featureInDevelopment: 'Тази функция все още се разработва.',
    ok: 'Добре',
    restorePreviousData: 'Възстановете предишните си данни',
    appInfo: 'Информация за Приложението',
    version: 'Версия',
    orderBill: 'Фактура за Поръчка',
    askForOrderBill: 'Искате ли да генерирате и споделите фактурата за поръчката?',
    orderBillGenerated: 'Фактурата за поръчката е генерирана успешно',
    table: 'Маса',
    date: 'Дата',
    time: 'Час',
    item: 'Артикул',
    unitPrice: 'Единична Цена',
    
    // Payment & Billing
    payment: 'Плащане',
    totalAmount: 'Обща Сума',
    amountReceived: 'Получена Сума',
    change: 'Ресто',
    cash: 'В брой',
    card: 'Карта',
    insufficientFunds: 'Недостатъчни средства',
    orderName: 'Име на Поръчката',
    paymentMethod: 'Начин на Плащане',
    thankYouNote: 'Благодарим ви за посещението!',
    shareBill: 'Споделяне на Фактура',
    sharingNotAvailable: 'Споделянето не е достъпно на това устройство.',
    itemTotal: 'Сума за Артикул',
    orderId: 'ID на Поръчка',
    thank_you_for_your_visit: 'Благодарим ви за посещението',
    productNameRequired: 'Името на продукта е задължително.',
    priceRequired: 'Цената е задължителна.',
    categoryRequired: 'Трябва да изберете категория.',
    validPriceRequired: 'Въведете валидна цена.',
    productName: 'Име на Продукта',
    priceLabel: 'Цена',
    description: 'Описание',
    category: 'Категория',
    enterProductName: 'Въведете име на продукта...',
    productDescription: 'Описание на продукта (по избор)...',
    ordersCount: 'поръчки',
    noSalesHistory: 'Все още няма история на продажбите',
    exportCSV: 'Експортиране като CSV',
    exportPDF: 'Експортиране като PDF',
    
    // Settings
    language: 'Език',
    currency: 'Валута',
    theme: 'Тема',
    lightMode: 'Светъл Режим',
    darkMode: 'Тъмен Режим',
    
    // Currencies
    turkish_lira: 'Турска Лира (₺)',
    bulgarian_lev: 'Български Лев (лв)',
    euro: 'Евро (€)',
    
    // Messages
    hallAdded: 'Залата е добавена успешно',
    tableAdded: 'Масата е добавена успешно',
    orderAdded: 'Поръчката е добавена успешно',
    itemAdded: 'Артикулът е добавен в количката',
    reportExported: 'Отчетът е експортиран успешно',
    
    // Data Import/Export
    dataExported: 'Данните са експортирани успешно',
    exportFailed: 'Неуспешен експорт на данни',
    importWarning: 'Тази операция ще изтрие всички съществуващи данни и ще възстанови данните от резервния файл. Сигурни ли сте, че искате да продължите?',
    import: 'Импортиране',
    importFailed: 'Неуспешно импортиране на данни',
    dataImported: 'Данните са импортирани успешно',
    importProcessingFailed: 'Грешка при обработката на данните',
    
    // Analytics
    analytics: 'Аналитика',
    salesAnalytics: 'Анализ на продажбите',
    totalRevenue: 'Общ приход',
    averageOrder: 'Средна поръчка',
    topSellingItems: 'Най-продавани продукти',
    noItemsSold: 'Няма продадени продукти за този период',
    salesChart: 'Графика на продажбите',
    revenue: 'Приход',
    categories: 'Категории',
    peakHours: 'Пикови часове',
    noDataAvailable: 'Няма налични данни',
    noCategoryData: 'Няма данни за категорията',
    today: 'Днес',
    thisWeek: 'Тази седмица',
    thisMonth: 'Този месец',
    thisYear: 'Тази година',
    custom: 'Персонализиран',
    
    // QR Menu
    qrMenu: 'QR Меню',
    qrMenuManagement: 'Управление на QR меню',
    qrMenuSettings: 'Настройки на QR меню',
    enableQRMenu: 'Активиране на QR меню',
    enableQRMenuDescription: 'Позволете на клиентите да видят менюто чрез QR код',
    allowDirectOrdering: 'Разреши директни поръчки',
    allowDirectOrderingDescription: 'Клиентите могат да правят директни поръчки',
    showPrices: 'Покажи цени',
    showPricesDescription: 'Покажи цените на продуктите в QR менюто',
    selectTable: 'Изберете маса',
    qrCode: 'QR Код',
    share: 'Споделяне',
    regenerate: 'Възстанови',
    bulkActions: 'Групови действия',
    shareAllQRCodes: 'Споделете всички QR кодове',
    exportQRPDF: 'Експортиране като PDF',
    qrMenuDisabled: 'QR менюто е деактивирано',
    qrMenuDisabledDescription: 'Активирайте QR менюто, за да генерирате QR кодове за вашите маси и да позволите на клиентите да видят менюто ви цифрово.',
    qrGenerationError: 'QR кодът не можа да бъде генериран',
    shareError: 'QR кодът не можа да бъде споделен',
    shareAllError: 'Всички QR кодове не можаха да бъдат споделени',
    pdfExported: 'PDF файлът е експортиран успешно',
    pdfExportError: 'PDF файлът не можа да бъде експортиран',
    
    // Notifications
    notificationPermission: 'Разрешение за известяване',
    notificationPermissionMessage: 'Моля, активирайте известяванията, за да получавате актуализации за поръчките',
    orderReady: 'Поръчката е готова',
    orderReadyMessage: 'Поръчката е готова за доставка:',
    kitchenDisplay: 'Кухненски дисплей',
    readyForPickup: 'Готова за взимане',
    kitchenAlert: 'Кухненско предупреждение',
    pendingOrders: 'чакащи поръчки',
    awaitingPreparation: 'очаква приготвяне',
    statusUpdate: 'Актуализация на статуса',
    tableStatus: 'Статусът на масата се промени:',
    occupied: 'Заета',
    available: 'Свободна',
    cleaning: 'Почистване',
    reserved: 'Резервирана',
    preparationReminder: 'Напомняне за приготвяне',
    orderShouldBeReady: 'Поръчката трябва да бъде готова за:',
    minutes: 'минути',
    sold: 'продадени',
    
    // Search & Product Selection
    searchProducts: 'Търсене на продукти...',
    searchProductsHint: 'Напишете за търсене на продукти, използвайте стрелките за навигация, Enter за избор',
    selectProduct: 'Избор на продукт',
    allCategories: 'Всички категории',
    clearSearch: 'Изчистване на търсенето',
    noSearchResults: 'Няма намерени продукти',
    noProductsInCategory: 'Няма продукти в тази категория',
    noProducts: 'Няма налични продукти',
    tryDifferentSearch: 'Опитайте различен термин за търсене или прегледайте категориите',
    selectDifferentCategory: 'Изберете различна категория или добавете продукти',
    itemsFound: 'намерени артикула',
    tapToAddItem: 'Докоснете за добавяне на този артикул',
    
    // Timer & Notifications
    notifications: 'Известия',
    activeTimers: 'Активни таймери',
    recentUpdates: 'Последни актуализации',
    noActiveTimers: 'Няма активни таймери',
    noRecentUpdates: 'Няма скорошни актуализации',
    startTimerToTrack: 'Стартирайте таймер за проследяване на готвенето',
    cancelTimer: 'Отказ на таймер',
    cancelTimerConfirm: 'сигурни ли сте, че искате да отмените таймера за',
    pause: 'Пауза',
    resume: 'Продължи',
    complete: 'Завърши',
    markAsComplete: 'Маркирай като завършен',
    
    // PDF Export
    poweredBy: 'Задвижван от',
    smartOrderPad: 'Вашият умен падок за поръчки',
    generatedOn: 'Генериран на',
    scanForMore: 'Сканирайте за повече информация',
    
    // QR Codes
    qrCodes: 'QR кодове',
    generateQR: 'Генериране на QR код',
    shareQRCodes: 'Споделяне на QR кодове',
    exportQRCodes: 'Експорт на QR кодове',
  },
  
  en: {
    // Common
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    update: 'Update',
    confirm: 'Confirm',
    confirmDelete: 'Confirm Delete',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    genericError: 'An error occurred',
    all: 'All',
    close: 'Close',
    
    // Navigation
    tables: 'Tables',
    menu: 'Menu',
    orders: 'Orders',
    history: 'History',
    settings: 'Settings',
    
    // Navigation titles
    tablesTitle: 'Orderia - Tables',
    menuManagement: 'Menu Management',
    salesHistory: 'Sales History',
    addMenuItem: 'Add Item',
    
    // Tables
    addHall: 'Add Hall',
    addTable: 'Add Table',
    addTableConfirm: 'Do you want to add a new table?',
    editHall: 'Edit Hall',
    editTable: 'Edit Table',
    deleteTable: 'Delete Table',
    deleteTableConfirm: 'Are you sure you want to delete this table?',
    deleteHall: 'Delete Hall',
    deleteHallConfirm: 'Are you sure you want to delete this hall? All tables in the hall will also be deleted.',
    hallDeleted: 'Hall deleted',
    hallName: 'Hall Name',
    hallNameHint: 'After creating the hall, you can add tables.',
    hallExamples: 'Examples: "Main Hall", "Terrace", "Upper Floor", "Garden"',
    tableName: 'Table Name',
    openTables: 'Open Tables',
    tableDetail: 'Table Detail',
    noHalls: 'No halls added yet',
    noTables: 'No tables in this hall yet',
    addFirstHall: 'Add First Hall',
    addNewHall: 'Add New Hall',
    tableLabel: 'Table Label',
    enterTableLabel: 'Enter a nickname for the table (optional):',
    enterHallName: 'Enter hall name:',
    enterNewHallName: 'Enter new hall name:',
    enterNewTableName: 'Enter new table name:',
    hallUpdated: 'Hall updated successfully',
    tableUpdated: 'Table updated successfully',
    tableNameHint: 'If left empty, "Table {seq}" will be used',
    tableDeleted: 'Table deleted successfully',
    
    // Menu & Categories
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    editMenuItem: 'Edit Menu Item',
    categoryName: 'Category Name',
    enterCategoryName: 'Enter category name:',
    enterNewCategoryName: 'Enter new category name:',
    categoryAdded: 'Category added successfully',
    categoryUpdated: 'Category updated successfully',
    deleteCategory: 'Delete Category',
    deleteCategoryConfirm: 'Are you sure you want to delete this category?',
    categoryDeleted: 'Category deleted',
    selectCategoryFirst: 'Please select or create a category first',
    deleteItem: 'Delete Item',
    deleteItemConfirm: 'are you sure you want to delete the item?',
    searchItems: 'Search items...',
    noCategoriesYet: 'No categories added yet',
    addFirstCategory: 'Add First Category',
    noItemsFound: 'No search results found',
    noCategoryItems: 'No items in this category yet',
    addFirstItem: 'Add First Item',
    itemAddError: 'An error occurred while adding the item.',
    addNewItem: 'Add New Item',
    
    // Orders & Tables
    newOrder: 'New Order',
    addItem: 'Add Item',
    orderTotal: 'Order Total',
    paymentComplete: 'Payment Complete',
    orderStatus: 'Order Status',
    quantity: 'Quantity',
    notes: 'Notes',
    orderNotes: 'Order Notes',
    deliverAll: 'Deliver All',
    deliverAllConfirm: 'Are you sure you want to mark all pending orders as delivered?',
    deliver: 'Deliver',
    makePayment: 'Take Payment',
    paymentConfirm: 'Are you sure you want to take payment?',
    tableNotFound: 'Table not found',
    tableNotOpened: 'This table has not been opened yet',
    openTable: 'Open Table',
    noOrdersYet: 'No orders taken yet',
    addFirstOrder: 'Add First Order',
    addOrder: 'Add Order',
    deliverAllOrders: 'Deliver All Orders',
    deleteOrder: 'Delete Order',
    deleteOrderConfirm: 'Are you sure you want to delete',
    deleteOrderWarning: 'This action cannot be undone.',
    total: 'Total',
    note: 'Note',
    orderNote: 'Order note (optional)...',
    addNote: 'Add Note',
    addNoteHint: 'Add special instructions or notes...',
    
    // Status
    open: 'OPEN',
    preparing: 'PREPARING',
    ready: 'READY',
    served: 'SERVED',
    paid: 'PAID',
    pending: 'Pending',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    
    // History & Reports
    dailyTotal: 'Daily Total',
    totalOrders: 'orders',
    totalSales: 'Total Sales',
    noHistory: 'No sales history yet',
    exportReport: 'Export Report',
    backupData: 'Backup your data',
    dataManagement: 'Data Management',
    dataExport: 'Data Export',
    dataImport: 'Data Import',
    featureInDevelopment: 'This feature is still in development.',
    ok: 'OK',
    restorePreviousData: 'Restore your previous data',
    appInfo: 'App Information',
    version: 'Version',
    orderBill: 'Order Bill',
    askForOrderBill: 'Do you want to generate and share the order bill?',
    orderBillGenerated: 'Order bill has been generated successfully.',
    table: 'Table',
    date: 'Date',
    time: 'Time',
    item: 'Item',
    unitPrice: 'Unit Price',
    
    // Payment & Billing
    payment: 'Payment',
    totalAmount: 'Total Amount',
    amountReceived: 'Amount Received',
    change: 'Change',
    cash: 'Cash',
    card: 'Card',
    insufficientFunds: 'Insufficient funds',
    orderName: 'Order Name',
    paymentMethod: 'Payment Method',
    thankYouNote: 'Thank you for your visit!',
    shareBill: 'Share Bill',
    sharingNotAvailable: 'Sharing is not available on this device.',
    itemTotal: 'Item Total',
    orderId: 'Order ID',
    thank_you_for_your_visit: 'Thank you for your visit',
    productNameRequired: 'Product name is required.',
    priceRequired: 'Price is required.',
    categoryRequired: 'You must select a category.',
    validPriceRequired: 'Enter a valid price.',
    productName: 'Product Name',
    priceLabel: 'Price',
    description: 'Description',
    category: 'Category',
    enterProductName: 'Enter product name...',
    productDescription: 'Product description (optional)...',
    ordersCount: 'orders',
    noSalesHistory: 'No sales history yet',
    exportCSV: 'Export as CSV',
    exportPDF: 'Export as PDF',
    
    // Settings
    language: 'Language',
    currency: 'Currency',
    theme: 'Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    
    // Currencies
    turkish_lira: 'Turkish Lira (₺)',
    bulgarian_lev: 'Bulgarian Lev (лв)',
    euro: 'Euro (€)',
    
    // Messages
    hallAdded: 'Hall added successfully',
    tableAdded: 'Table added successfully',
    orderAdded: 'Order added successfully',
    itemAdded: 'Item added to cart',
    reportExported: 'Report exported successfully',
    
    // Data Import/Export
    dataExported: 'Data exported successfully',
    exportFailed: 'Data export failed',
    importWarning: 'This operation will delete all existing data and restore data from the backup file. Are you sure you want to continue?',
    import: 'Import',
    importFailed: 'Data import failed',
    dataImported: 'Data imported successfully',
    importProcessingFailed: 'Error processing data',
    
    // Analytics
    analytics: 'Analytics',
    salesAnalytics: 'Sales Analytics',
    totalRevenue: 'Total Revenue',
    averageOrder: 'Average Order',
    topSellingItems: 'Top Selling Items',
    noItemsSold: 'No items sold in this period',
    salesChart: 'Sales Chart',
    revenue: 'Revenue',
    categories: 'Categories',
    peakHours: 'Peak Hours',
    noDataAvailable: 'No data available',
    noCategoryData: 'No category data available',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    custom: 'Custom',
    
    // QR Menu
    qrMenu: 'QR Menu',
    qrMenuManagement: 'QR Menu Management',
    qrMenuSettings: 'QR Menu Settings',
    enableQRMenu: 'Enable QR Menu',
    enableQRMenuDescription: 'Allow customers to view menu via QR code',
    allowDirectOrdering: 'Allow Direct Ordering',
    allowDirectOrderingDescription: 'Customers can place orders directly',
    showPrices: 'Show Prices',
    showPricesDescription: 'Display product prices in QR menu',
    selectTable: 'Select Table',
    qrCode: 'QR Code',
    share: 'Share',
    regenerate: 'Regenerate',
    bulkActions: 'Bulk Actions',
    shareAllQRCodes: 'Share All QR Codes',
    exportQRPDF: 'Export as PDF',
    qrMenuDisabled: 'QR Menu Disabled',
    qrMenuDisabledDescription: 'Enable QR Menu to generate QR codes for your tables and allow customers to view your menu digitally.',
    qrGenerationError: 'Could not generate QR code',
    shareError: 'Could not share QR code',
    shareAllError: 'Could not share all QR codes',
    pdfExported: 'PDF exported successfully',
    pdfExportError: 'Could not export PDF',
    
    // Notifications
    notificationPermission: 'Notification Permission',
    notificationPermissionMessage: 'Please enable notifications to receive order updates',
    orderReady: 'Order Ready',
    orderReadyMessage: 'Order ready for pickup:',
    kitchenDisplay: 'Kitchen Display',
    readyForPickup: 'Ready for pickup',
    kitchenAlert: 'Kitchen Alert',
    pendingOrders: 'pending orders',
    awaitingPreparation: 'awaiting preparation',
    statusUpdate: 'Status Update',
    tableStatus: 'Table status changed:',
    occupied: 'Occupied',
    available: 'Available',
    cleaning: 'Cleaning',
    reserved: 'Reserved',
    preparationReminder: 'Preparation Reminder',
    orderShouldBeReady: 'Order should be ready in:',
    minutes: 'minutes',
    sold: 'sold',
    
    // Search & Product Selection
    searchProducts: 'Search products...',
    searchProductsHint: 'Type to search products, use arrow keys to navigate, Enter to select',
    selectProduct: 'Select Product',
    allCategories: 'All Categories',
    clearSearch: 'Clear search',
    noSearchResults: 'No products found',
    noProductsInCategory: 'No products in this category',
    noProducts: 'No products available',
    tryDifferentSearch: 'Try a different search term or browse categories',
    selectDifferentCategory: 'Try selecting a different category or add some products',
    itemsFound: 'items found',
    tapToAddItem: 'Tap to add this item',
    
    // Timer & Notifications
    notifications: 'Notifications',
    activeTimers: 'Active Timers',
    recentUpdates: 'Recent Updates',
    noActiveTimers: 'No active timers',
    noRecentUpdates: 'No recent updates',
    startTimerToTrack: 'Start a timer to track cooking progress',
    cancelTimer: 'Cancel Timer',
    cancelTimerConfirm: 'Are you sure you want to cancel the timer for',
    pause: 'Pause',
    resume: 'Resume',
    complete: 'Complete',
    markAsComplete: 'Mark as complete',
    
    // PDF Export
    poweredBy: 'Powered by',
    smartOrderPad: 'Your Smart Order Pad',
    generatedOn: 'Generated on',
    scanForMore: 'Scan for more information',
    
    // QR Codes
    qrCodes: 'QR Codes',
    generateQR: 'Generate QR Code',
    shareQRCodes: 'Share QR Codes',
    exportQRCodes: 'Export QR Codes',
  },
};
