export interface Translation {
  // Common
  add: string;
  edit: string;
  delete: string;
  cancel: string;
  save: string;
  confirm: string;
  yes: string;
  no: string;
  back: string;
  next: string;
  done: string;
  loading: string;
  error: string;
  success: string;
  genericError: string;
  
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
  categoryName: string;
  enterCategoryName: string;
  enterNewCategoryName: string;
  categoryAdded: string;
  categoryUpdated: string;
  deleteCategory: string;
  deleteCategoryConfirm: string;
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
  total: string;
  note: string;
  orderNote: string;
  
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
  generateOrderBill: string;
  orderBillGenerated: string;
  table: string;
  date: string;
  time: string;
  item: string;
  unitPrice: string;
  thank_you_for_your_visit: string;
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
    yes: 'Evet',
    no: 'Hayır',
    back: 'Geri',
    next: 'İleri',
    done: 'Tamam',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    genericError: 'Bir hata oluştu',
    
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
    editTable: 'Masa Düzenle',
    deleteTable: 'Masa Sil',
    deleteTableConfirm: 'Bu masayı silmek istediğinizden emin misiniz?',
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
    categoryName: 'Kategori Adı',
    enterCategoryName: 'Kategori adını girin:',
    enterNewCategoryName: 'Yeni kategori adını girin:',
    categoryAdded: 'Kategori başarıyla eklendi',
    categoryUpdated: 'Kategori başarıyla güncellendi',
    deleteCategory: 'Kategori Sil',
    deleteCategoryConfirm: 'Bu kategoriyi silmek istediğinizden emin misiniz?',
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
    total: 'Toplam',
    note: 'Not',
    orderNote: 'Sipariş notu (opsiyonel)...',
    
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
    generateOrderBill: 'Müşteri sipariş faturası istiyor mu?',
    orderBillGenerated: 'Sipariş faturası oluşturuldu',
    table: 'Masa',
    date: 'Tarih',
    time: 'Saat',
    item: 'Ürün',
    unitPrice: 'Birim Fiyat',
    thank_you_for_your_visit: 'Ziyaretiniz için teşekkürler',
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
    yes: 'Да',
    no: 'Не',
    back: 'Назад',
    next: 'Напред',
    done: 'Готово',
    loading: 'Зареждане...',
    error: 'Грешка',
    success: 'Успешно',
    genericError: 'Възникна грешка',
    
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
    categoryName: 'Име на Категорията',
    enterCategoryName: 'Въведете име на категорията:',
    enterNewCategoryName: 'Въведете ново име на категорията:',
    categoryAdded: 'Категорията е добавена успешно',
    categoryUpdated: 'Категорията е обновена успешно',
    deleteCategory: 'Изтрий Категория',
    deleteCategoryConfirm: 'Сигурни ли сте, че искате да изтриете тази категория?',
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
    total: 'Общо',
    note: 'Бележка',
    orderNote: 'Бележка за поръчката (незадължително)...',
    
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
    generateOrderBill: 'Клиентът иска ли фактура за поръчката?',
    orderBillGenerated: 'Фактурата за поръчката е генерирана',
    table: 'Маса',
    date: 'Дата',
    time: 'Час',
    item: 'Артикул',
    unitPrice: 'Единична Цена',
    thank_you_for_your_visit: 'Благодарим ви за посещението',
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
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    genericError: 'An error occurred',
    
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
    categoryName: 'Category Name',
    enterCategoryName: 'Enter category name:',
    enterNewCategoryName: 'Enter new category name:',
    categoryAdded: 'Category added successfully',
    categoryUpdated: 'Category updated successfully',
    deleteCategory: 'Delete Category',
    deleteCategoryConfirm: 'Are you sure you want to delete this category?',
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
    total: 'Total',
    note: 'Note',
    orderNote: 'Order note (optional)...',
    
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
    generateOrderBill: 'Does the customer need an order bill?',
    orderBillGenerated: 'Order bill has been generated',
    table: 'Table',
    date: 'Date',
    time: 'Time',
    item: 'Item',
    unitPrice: 'Unit Price',
    thank_you_for_your_visit: 'Thank you for your visit',
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
