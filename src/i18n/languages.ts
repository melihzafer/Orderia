export interface Translation {
  // Common
  add: string;
  edit: string;
  delete: string;
  cancel: string;
  save: string;
  confirm: string;
  back: string;
  next: string;
  done: string;
  loading: string;
  error: string;
  success: string;
  
  // Navigation
  tables: string;
  menu: string;
  orders: string;
  history: string;
  settings: string;
  
  // Tables
  addHall: string;
  addTable: string;
  hallName: string;
  tableName: string;
  openTables: string;
  tableDetail: string;
  noHalls: string;
  noTables: string;
  addFirstHall: string;
  addNewHall: string;
  tableLabel: string;
  enterTableLabel: string;
  
  // Orders
  newOrder: string;
  addItem: string;
  orderTotal: string;
  paymentComplete: string;
  orderStatus: string;
  quantity: string;
  notes: string;
  orderNotes: string;
  
  // Status
  open: string;
  preparing: string;
  ready: string;
  served: string;
  paid: string;
  
  // History & Reports
  dailyTotal: string;
  totalOrders: string;
  totalSales: string;
  noHistory: string;
  exportReport: string;
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
}

export const translations: Record<string, Translation> = {
  tr: {
    // Common
    add: 'Ekle',
    edit: 'Düzenle',
    delete: 'Sil',
    cancel: 'İptal',
    save: 'Kaydet',
    confirm: 'Onayla',
    back: 'Geri',
    next: 'İleri',
    done: 'Tamam',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    
    // Navigation
    tables: 'Masalar',
    menu: 'Menü',
    orders: 'Siparişler',
    history: 'Geçmiş',
    settings: 'Ayarlar',
    
    // Tables
    addHall: 'Salon Ekle',
    addTable: 'Masa Ekle',
    hallName: 'Salon Adı',
    tableName: 'Masa Adı',
    openTables: 'Açık Masalar',
    tableDetail: 'Masa Detayı',
    noHalls: 'Henüz salon eklenmemiş',
    noTables: 'Bu salonda henüz masa yok',
    addFirstHall: 'İlk Salonu Ekle',
    addNewHall: 'Yeni Salon Ekle',
    tableLabel: 'Masa Etiketi',
    enterTableLabel: 'Masa için bir takma ad girin (opsiyonel):',
    
    // Orders
    newOrder: 'Yeni Sipariş',
    addItem: 'Ürün Ekle',
    orderTotal: 'Sipariş Toplamı',
    paymentComplete: 'Ödeme Tamamlandı',
    orderStatus: 'Sipariş Durumu',
    quantity: 'Adet',
    notes: 'Notlar',
    orderNotes: 'Sipariş Notları',
    
    // Status
    open: 'AÇIK',
    preparing: 'HAZIRLANIYOR',
    ready: 'HAZIR',
    served: 'SERVİS EDİLDİ',
    paid: 'ÖDENDİ',
    
    // History & Reports
    dailyTotal: 'Bugünkü Toplam',
    totalOrders: 'sipariş',
    totalSales: 'Toplam Satış',
    noHistory: 'Henüz satış tarihçesi yok',
    exportReport: 'Raporu Dışa Aktar',
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
  },
  
  bg: {
    // Common
    add: 'Добави',
    edit: 'Редактирай',
    delete: 'Изтрий',
    cancel: 'Отказ',
    save: 'Запази',
    confirm: 'Потвърди',
    back: 'Назад',
    next: 'Напред',
    done: 'Готово',
    loading: 'Зареждане...',
    error: 'Грешка',
    success: 'Успешно',
    
    // Navigation
    tables: 'Маси',
    menu: 'Меню',
    orders: 'Поръчки',
    history: 'История',
    settings: 'Настройки',
    
    // Tables
    addHall: 'Добави Зала',
    addTable: 'Добави Маса',
    hallName: 'Име на Залата',
    tableName: 'Име на Масата',
    openTables: 'Отворени Маси',
    tableDetail: 'Детайли за Масата',
    noHalls: 'Все още няма добавени зали',
    noTables: 'В тази зала все още няма маси',
    addFirstHall: 'Добави Първата Зала',
    addNewHall: 'Добави Нова Зала',
    tableLabel: 'Етикет на Масата',
    enterTableLabel: 'Въведете прякор за масата (по избор):',
    
    // Orders
    newOrder: 'Нова Поръчка',
    addItem: 'Добави Артикул',
    orderTotal: 'Общо Поръчка',
    paymentComplete: 'Плащането е Завършено',
    orderStatus: 'Статус на Поръчката',
    quantity: 'Количество',
    notes: 'Бележки',
    orderNotes: 'Бележки за Поръчката',
    
    // Status
    open: 'ОТВОРЕНА',
    preparing: 'ПОДГОТВЯ СЕ',
    ready: 'ГОТОВА',
    served: 'СЕРВИРАНА',
    paid: 'ПЛАТЕНА',
    
    // History & Reports
    dailyTotal: 'Дневен Общ Оборот',
    totalOrders: 'поръчки',
    totalSales: 'Общи Продажби',
    noHistory: 'Все още няма история на продажбите',
    exportReport: 'Експортиране на Отчет',
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
  },
  
  en: {
    // Common
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Navigation
    tables: 'Tables',
    menu: 'Menu',
    orders: 'Orders',
    history: 'History',
    settings: 'Settings',
    
    // Tables
    addHall: 'Add Hall',
    addTable: 'Add Table',
    hallName: 'Hall Name',
    tableName: 'Table Name',
    openTables: 'Open Tables',
    tableDetail: 'Table Detail',
    noHalls: 'No halls added yet',
    noTables: 'No tables in this hall yet',
    addFirstHall: 'Add First Hall',
    addNewHall: 'Add New Hall',
    tableLabel: 'Table Label',
    enterTableLabel: 'Enter a nickname for the table (optional):',
    
    // Orders
    newOrder: 'New Order',
    addItem: 'Add Item',
    orderTotal: 'Order Total',
    paymentComplete: 'Payment Complete',
    orderStatus: 'Order Status',
    quantity: 'Quantity',
    notes: 'Notes',
    orderNotes: 'Order Notes',
    
    // Status
    open: 'OPEN',
    preparing: 'PREPARING',
    ready: 'READY',
    served: 'SERVED',
    paid: 'PAID',
    
    // History & Reports
    dailyTotal: 'Daily Total',
    totalOrders: 'orders',
    totalSales: 'Total Sales',
    noHistory: 'No sales history yet',
    exportReport: 'Export Report',
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
  },
};
