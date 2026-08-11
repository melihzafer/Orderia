import type { Ionicons } from '@expo/vector-icons';
import type { OperationsPreferences, QuickActionId, ServiceMode } from '../../stores/settingsStore';

/**
 * Ayarlar ekranının metinleri burada yaşar.
 * `src/i18n/languages.ts` uygulama geneline yayılmış ortak sözlüktür; bu ekranın
 * sözlüğü ise yalnızca burada kullanıldığı için — TableDetailScreen'deki gibi —
 * ekranın yanında tutulur. Böylece ortak sözlük yüzlerce tek kullanımlık anahtarla
 * şişmez.
 */
export interface SettingsCopy {
  readonly settingsTitle: string;
  readonly settingsSubtitle: string;

  readonly signedInAs: string;
  readonly switchBranch: string;
  readonly signOut: string;
  readonly deviceOnlyProfile: string;
  readonly deviceOnlyHint: string;

  readonly serviceModeSection: string;
  readonly serviceModeCaption: string;
  readonly restaurantMode: string;
  readonly restaurantModeBody: string;
  readonly festivalMode: string;
  readonly festivalModeBody: string;
  readonly modeIsAPreset: string;

  readonly workflowSection: string;
  readonly workflowCaption: string;
  readonly resetToModeDefaults: string;

  readonly quickActionsSection: string;
  readonly quickActionsCaption: string;

  readonly appearanceSection: string;
  readonly appearanceCaption: string;
  readonly darkMode: string;
  readonly darkModeBody: string;
  readonly darkModeFollowsSystemBody: string;
  readonly followSystemTheme: string;
  readonly followSystemThemeBody: string;
  readonly compactDensity: string;
  readonly compactDensityBody: string;
  readonly showItemPhotos: string;
  readonly showItemPhotosBody: string;
  readonly allowPhotoUpload: string;
  readonly allowPhotoUploadBody: string;
  readonly languageLabel: string;
  readonly currencyLabel: string;

  readonly managementSection: string;
  readonly managementCaption: string;
  readonly menuManagement: string;
  readonly menuManagementBody: string;
  readonly qrMenu: string;
  readonly qrMenuBody: string;
  readonly reports: string;
  readonly reportsBody: string;
  readonly devices: string;
  readonly devicesBody: string;
  readonly approvals: string;
  readonly approvalsBody: string;
  readonly cancellationReasons: string;
  readonly cancellationReasonsBody: string;
  readonly managerPin: string;
  readonly managerPinBody: string;
  readonly managerPinPlaceholder: string;
  readonly saveManagerPin: string;
  readonly managerPinSaved: string;
  readonly managerPinFailed: string;

  readonly dataSection: string;
  readonly dataCaption: string;
  readonly exportBackup: string;
  readonly exportBackupBody: string;
  readonly resetLocalData: string;
  readonly resetLocalDataBody: string;
  readonly resetLocalDataConfirm: string;
  readonly resetLocalDataDone: string;
  readonly legacyMigrationReveal: string;

  readonly aboutSection: string;
  readonly versionLabel: string;

  readonly operations: Readonly<Record<keyof OperationsPreferences, OperationCopy>>;
  readonly quickActions: Readonly<Record<QuickActionId, QuickActionCopy>>;
  readonly modeSummary: (mode: ServiceMode) => string;

  readonly cancellationReasonsTitle: string;
  readonly cancellationReasonsAccessRequired: string;
  readonly cancellationReasonsEmpty: string;
  readonly reasonNameLabel: string;
  readonly reasonNamePlaceholder: string;
  readonly requiresManagerLabel: string;
  readonly requiresManagerBody: string;
  readonly addReason: string;
  readonly reasonAdded: string;
  readonly reasonUpdated: string;
  readonly enterReasonName: string;
  readonly reasonActive: string;
  readonly reasonInactive: string;
}

export interface OperationCopy {
  readonly title: string;
  readonly body: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
}

export interface QuickActionCopy {
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
}

const operationIcons: Readonly<
  Record<keyof OperationsPreferences, keyof typeof Ionicons.glyphMap>
> = {
  namedOrders: 'pricetag-outline',
  locationNotes: 'location-outline',
  personAccounts: 'people-outline',
  orderBatches: 'layers-outline',
  fulfillmentSplit: 'restaurant-outline',
  drinksReminder: 'cafe-outline',
  requireVoidReason: 'shield-checkmark-outline',
  quickCash: 'cash-outline',
  confirmBeforeClose: 'lock-closed-outline',
};

const quickActionIcons: Readonly<Record<QuickActionId, keyof typeof Ionicons.glyphMap>> = {
  new_order: 'add-circle-outline',
  last_order: 'time-outline',
  find_by_name: 'search-outline',
  open_checks: 'receipt-outline',
  take_payment: 'card-outline',
  day_summary: 'stats-chart-outline',
};

const tr: SettingsCopy = {
  settingsTitle: 'Ayarlar',
  settingsSubtitle: 'Servis akışını kendi işletmene göre ayarla',

  signedInAs: 'Oturum',
  switchBranch: 'Şube değiştir',
  signOut: 'Oturumu kapat',
  deviceOnlyProfile: 'Yalnız bu cihaz',
  deviceOnlyHint: 'Kayıtlar bu cihazda tutuluyor. Bulut hesabı bağlı değil.',

  serviceModeSection: 'Servis modu',
  serviceModeCaption: 'Uygulamanın hangi ritimde çalışacağını seç',
  restaurantMode: 'Restoran',
  restaurantModeBody: 'Masa merkezli, oturmuş servis. Varsayılan çalışma şekli.',
  festivalMode: 'Festival',
  festivalModeBody: 'Masa düzeninin gevşek, hızın belirleyici olduğu açık hava servisi.',
  modeIsAPreset:
    'Mod yalnızca bir başlangıç ayarıdır. Aşağıdaki her özelliği modundan bağımsız açıp kapatabilirsin.',

  workflowSection: 'Servis akışı',
  workflowCaption: 'Sipariş alırken hangi adımların görüneceğini belirler',
  resetToModeDefaults: 'Varsayılana dön',

  quickActionsSection: 'Ana ekran kısayolları',
  quickActionsCaption: 'Ana ekranda görünecek hızlı işlemler',

  appearanceSection: 'Görünüm',
  appearanceCaption: 'Tema, yoğunluk, fotoğraf, dil ve para birimi',
  darkMode: 'Koyu tema',
  darkModeBody: 'Akşam servisinde gözü yormaz.',
  darkModeFollowsSystemBody: 'Cihaz temasını takip ederken kapalı; önce onu kapatın.',
  followSystemTheme: 'Cihaz temasını takip et',
  followSystemThemeBody: 'Telefonun açık/koyu ayarına uy.',
  compactDensity: 'Sıkışık liste',
  compactDensityBody: 'Küçük ekranda tek bakışta daha çok satır.',
  showItemPhotos: 'Ürün fotoğraflarını göster',
  showItemPhotosBody: 'Menü ve sipariş paletinde küçük görseller çıkar.',
  allowPhotoUpload: 'Fotoğraf eklemeye izin ver',
  allowPhotoUploadBody: 'Menü ürünü düzenlenirken cihazdan görsel seçilebilir.',
  languageLabel: 'Dil',
  currencyLabel: 'Para birimi',

  managementSection: 'Yönetim',
  managementCaption: 'Yalnızca yöneticiler görür',
  menuManagement: 'Menü yönetimi',
  menuManagementBody: 'Kategoriler, ürünler ve fiyatlar',
  qrMenu: 'QR menü',
  qrMenuBody: 'Müşteriye açılan menü bağlantısı',
  reports: 'Raporlar',
  reportsBody: 'Günlük satış, ürün ve garson dökümü',
  devices: 'Yetkili cihazlar',
  devicesBody: 'Bu şubeye bağlı telefon ve tabletler',
  approvals: 'Personel onayları',
  approvalsBody: 'Katılmayı bekleyen kullanıcılar',
  cancellationReasons: 'İptal sebepleri',
  cancellationReasonsBody: 'Ürün veya hesap iptal edilirken seçilecek sebep listesi',
  managerPin: 'Yönetici PIN’i',
  managerPinBody: 'Kapalı siparişi yeniden açarken 4 veya 6 haneli PIN iste.',
  managerPinPlaceholder: '4 veya 6 hane',
  saveManagerPin: 'PIN’i kaydet',
  managerPinSaved: 'Yönetici PIN’i kaydedildi',
  managerPinFailed: 'Yönetici PIN’i kaydedilemedi',

  dataSection: 'Veri ve yedek',
  dataCaption: 'Kayıtları dışa aktar, taşı ve çevrimdışı durumu izle',
  exportBackup: 'Yedek al',
  exportBackupBody: 'Tüm masaları, menüyü ve geçmişi JSON olarak dışa aktar',
  resetLocalData: 'Cihaz verilerini sıfırla',
  resetLocalDataBody:
    'Bu cihazdaki salon, masa, menü ve yerel siparişleri temizler. Supabase verilerine dokunmaz.',
  resetLocalDataConfirm: 'Bu cihazdaki tüm yerel veriler silinsin mi?',
  resetLocalDataDone: 'Cihaz verileri sıfırlandı',
  legacyMigrationReveal: 'Eski yedekten veri aktar',

  aboutSection: 'Uygulama',
  versionLabel: 'Sürüm',

  operations: {
    namedOrders: {
      title: 'Siparişe isim ver',
      body: 'Masa yerine "Mehmet Ağa" ya da "Çardak Altı" gibi bir adla bul.',
      icon: operationIcons.namedOrders,
    },
    locationNotes: {
      title: 'Konum notu',
      body: 'Alan ve masa dışında serbest bir yer açıklaması tut.',
      icon: operationIcons.locationNotes,
    },
    personAccounts: {
      title: 'Kişi ve ortak hesap',
      body: 'Aynı masadaki kişilerin hesabını ayrı ayrı takip et.',
      icon: operationIcons.personAccounts,
    },
    orderBatches: {
      title: 'Ek sipariş ayrımı',
      body: 'Sonradan eklenen ürünler ilk siparişten ayrı görünür.',
      icon: operationIcons.orderBatches,
    },
    fulfillmentSplit: {
      title: 'Mutfak / içecek özeti',
      body: 'Kaydettikten sonra mutfağa söylenecekler ve götürülecek içecekler ayrı listelenir.',
      icon: operationIcons.fulfillmentSplit,
    },
    drinksReminder: {
      title: 'İçecek hatırlatıcısı',
      body: 'İçecekler götürülene kadar sipariş kartında uyarı kalır.',
      icon: operationIcons.drinksReminder,
    },
    requireVoidReason: {
      title: 'İptalde sebep zorunlu',
      body: 'Ürün iptal edilirken neden seçilmeden işlem tamamlanmaz.',
      icon: operationIcons.requireVoidReason,
    },
    quickCash: {
      title: 'Hızlı nakit ve para üstü',
      body: 'Ödeme ekranında yuvarlak tutar butonları ve para üstü hesabı çıkar.',
      icon: operationIcons.quickCash,
    },
    confirmBeforeClose: {
      title: 'Kapatmadan önce özet',
      body: 'Toplam, ödenen ve kalan gösterilmeden sipariş kapanmaz.',
      icon: operationIcons.confirmBeforeClose,
    },
  },

  quickActions: {
    new_order: { label: 'Yeni sipariş', icon: quickActionIcons.new_order },
    last_order: { label: 'Son sipariş', icon: quickActionIcons.last_order },
    find_by_name: { label: 'İsimle ara', icon: quickActionIcons.find_by_name },
    open_checks: { label: 'Açık hesaplar', icon: quickActionIcons.open_checks },
    take_payment: { label: 'Ödeme al', icon: quickActionIcons.take_payment },
    day_summary: { label: 'Gün özeti', icon: quickActionIcons.day_summary },
  },

  modeSummary: (mode) => (mode === 'festival' ? 'Festival modu açık' : 'Restoran modu açık'),

  cancellationReasonsTitle: 'İptal sebepleri',
  cancellationReasonsAccessRequired: 'Bu ekran yalnızca yöneticiler içindir.',
  cancellationReasonsEmpty: 'Henüz sebep eklenmedi. Aşağıdan ilkini ekle.',
  reasonNameLabel: 'Sebep adı',
  reasonNamePlaceholder: 'Örn. Müşteri vazgeçti',
  requiresManagerLabel: 'Yönetici onayı gerektirir',
  requiresManagerBody: 'İkram veya personel yemeği gibi mali etkisi olan sebepler için',
  addReason: 'Sebep ekle',
  reasonAdded: 'Sebep eklendi',
  reasonUpdated: 'Sebep güncellendi',
  enterReasonName: 'Bir sebep adı girin',
  reasonActive: 'Aktif',
  reasonInactive: 'Pasif',
};

const bg: SettingsCopy = {
  settingsTitle: 'Настройки',
  settingsSubtitle: 'Настрой работния поток според своя обект',

  signedInAs: 'Сесия',
  switchBranch: 'Смени обект',
  signOut: 'Изход',
  deviceOnlyProfile: 'Само това устройство',
  deviceOnlyHint: 'Данните се пазят на устройството. Няма свързан облачен акаунт.',

  serviceModeSection: 'Режим на обслужване',
  serviceModeCaption: 'Избери с какъв ритъм да работи приложението',
  restaurantMode: 'Ресторант',
  restaurantModeBody: 'Обслужване около масите. Това е основният режим.',
  festivalMode: 'Фестивал',
  festivalModeBody: 'Обслужване на открито, където скоростта е по-важна от плана на залата.',
  modeIsAPreset:
    'Режимът е само начална настройка. Всяка функция по-долу може да се включи независимо от него.',

  workflowSection: 'Работен поток',
  workflowCaption: 'Кои стъпки се показват при приемане на поръчка',
  resetToModeDefaults: 'Върни по подразбиране',

  quickActionsSection: 'Бързи действия',
  quickActionsCaption: 'Бързи действия на началния екран',

  appearanceSection: 'Изглед',
  appearanceCaption: 'Тема, плътност, снимки, език и валута',
  darkMode: 'Тъмна тема',
  darkModeBody: 'По-щадяща за очите вечер.',
  darkModeFollowsSystemBody: 'Изключено, докато следвате системната тема; изключете я първо.',
  followSystemTheme: 'Следвай темата на устройството',
  followSystemThemeBody: 'Използвай светло/тъмно според телефона.',
  compactDensity: 'Плътен списък',
  compactDensityBody: 'Повече редове на малък екран.',
  showItemPhotos: 'Показвай снимки на продукти',
  showItemPhotosBody: 'Малки изображения в менюто и палитрата за поръчки.',
  allowPhotoUpload: 'Разреши добавяне на снимки',
  allowPhotoUploadBody: 'При редакция на продукт може да се избере изображение.',
  languageLabel: 'Език',
  currencyLabel: 'Валута',

  managementSection: 'Управление',
  managementCaption: 'Вижда се само от мениджъри',
  menuManagement: 'Управление на менюто',
  menuManagementBody: 'Категории, продукти и цени',
  qrMenu: 'QR меню',
  qrMenuBody: 'Връзка към менюто за клиенти',
  reports: 'Отчети',
  reportsBody: 'Дневни продажби по продукт и сервитьор',
  devices: 'Оторизирани устройства',
  devicesBody: 'Телефони и таблети към този обект',
  approvals: 'Одобрения на персонал',
  approvalsBody: 'Чакащи потребители',
  cancellationReasons: 'Причини за отказ',
  cancellationReasonsBody: 'Списък с причини при отказ на продукт или сметка',
  managerPin: 'PIN на управителя',
  managerPinBody: 'Изисквай 4 или 6 цифри при повторно отваряне на сметка.',
  managerPinPlaceholder: '4 или 6 цифри',
  saveManagerPin: 'Запази PIN',
  managerPinSaved: 'PIN кодът е запазен',
  managerPinFailed: 'PIN кодът не бе запазен',

  dataSection: 'Данни и резервно копие',
  dataCaption: 'Експорт, миграция и състояние офлайн',
  exportBackup: 'Направи резервно копие',
  exportBackupBody: 'Експортирай маси, меню и история като JSON',
  resetLocalData: 'Изчисти данните на устройството',
  resetLocalDataBody:
    'Изчиства залите, масите, менюто и локалните поръчки. Данните в Supabase не се променят.',
  resetLocalDataConfirm: 'Да се изтрият ли всички локални данни от това устройство?',
  resetLocalDataDone: 'Данните на устройството са изчистени',
  legacyMigrationReveal: 'Импортирай от стар архив',

  aboutSection: 'Приложение',
  versionLabel: 'Версия',

  operations: {
    namedOrders: {
      title: 'Име на поръчката',
      body: 'Намирай поръчката по име, а не само по маса.',
      icon: operationIcons.namedOrders,
    },
    locationNotes: {
      title: 'Бележка за мястото',
      body: 'Свободно описание извън зала и маса.',
      icon: operationIcons.locationNotes,
    },
    personAccounts: {
      title: 'Лични и общи сметки',
      body: 'Следи сметката на всеки човек на масата поотделно.',
      icon: operationIcons.personAccounts,
    },
    orderBatches: {
      title: 'Отделяне на допоръчки',
      body: 'Добавените по-късно продукти се показват отделно.',
      icon: operationIcons.orderBatches,
    },
    fulfillmentSplit: {
      title: 'Кухня / напитки',
      body: 'След записване се разделя какво отива в кухнята и какво се носи.',
      icon: operationIcons.fulfillmentSplit,
    },
    drinksReminder: {
      title: 'Напомняне за напитки',
      body: 'Картата остава маркирана, докато напитките не бъдат занесени.',
      icon: operationIcons.drinksReminder,
    },
    requireVoidReason: {
      title: 'Задължителна причина при анулиране',
      body: 'Продукт не се анулира без избрана причина.',
      icon: operationIcons.requireVoidReason,
    },
    quickCash: {
      title: 'Бързи суми и ресто',
      body: 'Кръгли суми и изчисление на ресто на екрана за плащане.',
      icon: operationIcons.quickCash,
    },
    confirmBeforeClose: {
      title: 'Обобщение преди затваряне',
      body: 'Поръчката не се затваря без преглед на общо, платено и остатък.',
      icon: operationIcons.confirmBeforeClose,
    },
  },

  quickActions: {
    new_order: { label: 'Нова поръчка', icon: quickActionIcons.new_order },
    last_order: { label: 'Последна поръчка', icon: quickActionIcons.last_order },
    find_by_name: { label: 'Търси по име', icon: quickActionIcons.find_by_name },
    open_checks: { label: 'Отворени сметки', icon: quickActionIcons.open_checks },
    take_payment: { label: 'Приеми плащане', icon: quickActionIcons.take_payment },
    day_summary: { label: 'Обобщение за деня', icon: quickActionIcons.day_summary },
  },

  modeSummary: (mode) =>
    mode === 'festival' ? 'Фестивален режим е включен' : 'Ресторантски режим е включен',

  cancellationReasonsTitle: 'Причини за отказ',
  cancellationReasonsAccessRequired: 'Този екран е само за мениджъри.',
  cancellationReasonsEmpty: 'Все още няма причини. Добавете първата по-долу.',
  reasonNameLabel: 'Име на причината',
  reasonNamePlaceholder: 'Напр. Клиентът се отказа',
  requiresManagerLabel: 'Изисква одобрение от мениджър',
  requiresManagerBody: 'За причини с финансов ефект — ikram, храна за персонала',
  addReason: 'Добави причина',
  reasonAdded: 'Причината е добавена',
  reasonUpdated: 'Причината е обновена',
  enterReasonName: 'Въведете име на причината',
  reasonActive: 'Активна',
  reasonInactive: 'Неактивна',
};

const en: SettingsCopy = {
  settingsTitle: 'Settings',
  settingsSubtitle: 'Tune the service flow to your own venue',

  signedInAs: 'Session',
  switchBranch: 'Switch branch',
  signOut: 'Sign out',
  deviceOnlyProfile: 'This device only',
  deviceOnlyHint: 'Records stay on this device. No cloud account is connected.',

  serviceModeSection: 'Service mode',
  serviceModeCaption: 'Pick the rhythm the app should follow',
  restaurantMode: 'Restaurant',
  restaurantModeBody: 'Table-centred, seated service. This is the default way to work.',
  festivalMode: 'Festival',
  festivalModeBody: 'Open-air service where speed matters more than the floor plan.',
  modeIsAPreset:
    'The mode is only a starting point. Every feature below can be switched on independently of it.',

  workflowSection: 'Service flow',
  workflowCaption: 'Which steps appear while an order is being taken',
  resetToModeDefaults: 'Reset to defaults',

  quickActionsSection: 'Home quick actions',
  quickActionsCaption: 'Quick actions shown on the home screen',

  appearanceSection: 'Appearance',
  appearanceCaption: 'Theme, density, photos, language and currency',
  darkMode: 'Dark theme',
  darkModeBody: 'Easier on the eyes during evening service.',
  darkModeFollowsSystemBody: 'Off while following the device theme; turn that off first.',
  followSystemTheme: 'Follow device theme',
  followSystemThemeBody: 'Match the phone light/dark setting.',
  compactDensity: 'Compact lists',
  compactDensityBody: 'More rows at a glance on a small screen.',
  showItemPhotos: 'Show product photos',
  showItemPhotosBody: 'Small images appear in the menu and the order palette.',
  allowPhotoUpload: 'Allow adding photos',
  allowPhotoUploadBody: 'Staff can pick an image while editing a menu item.',
  languageLabel: 'Language',
  currencyLabel: 'Currency',

  managementSection: 'Management',
  managementCaption: 'Visible to managers only',
  menuManagement: 'Menu management',
  menuManagementBody: 'Categories, products and prices',
  qrMenu: 'QR menu',
  qrMenuBody: 'The menu link guests open',
  reports: 'Reports',
  reportsBody: 'Daily sales by product and waiter',
  devices: 'Authorized devices',
  devicesBody: 'Phones and tablets bound to this branch',
  approvals: 'Staff approvals',
  approvalsBody: 'People waiting to join',
  cancellationReasons: 'Cancellation reasons',
  cancellationReasonsBody: 'Reasons staff can pick when voiding an item or check',
  managerPin: 'Manager PIN',
  managerPinBody: 'Require a 4 or 6 digit PIN before reopening a closed order.',
  managerPinPlaceholder: '4 or 6 digits',
  saveManagerPin: 'Save PIN',
  managerPinSaved: 'Manager PIN saved',
  managerPinFailed: 'Manager PIN could not be saved',

  dataSection: 'Data and backup',
  dataCaption: 'Export records, migrate and watch the offline state',
  exportBackup: 'Create a backup',
  exportBackupBody: 'Export tables, menu and history as JSON',
  resetLocalData: 'Reset device data',
  resetLocalDataBody:
    'Clears halls, tables, menu and local orders on this device. Supabase data is untouched.',
  resetLocalDataConfirm: 'Reset all local data on this device?',
  resetLocalDataDone: 'Device data reset',
  legacyMigrationReveal: 'Import from an old backup',

  aboutSection: 'Application',
  versionLabel: 'Version',

  operations: {
    namedOrders: {
      title: 'Name the order',
      body: 'Find an order by a name instead of a table number.',
      icon: operationIcons.namedOrders,
    },
    locationNotes: {
      title: 'Location note',
      body: 'Keep a free-text place description beyond hall and table.',
      icon: operationIcons.locationNotes,
    },
    personAccounts: {
      title: 'Person and shared checks',
      body: 'Track each guest at the table on a separate check.',
      icon: operationIcons.personAccounts,
    },
    orderBatches: {
      title: 'Separate follow-up rounds',
      body: 'Items added later stay visually apart from the first round.',
      icon: operationIcons.orderBatches,
    },
    fulfillmentSplit: {
      title: 'Kitchen / drinks summary',
      body: 'After saving, kitchen items and drinks to carry are listed apart.',
      icon: operationIcons.fulfillmentSplit,
    },
    drinksReminder: {
      title: 'Drinks reminder',
      body: 'The order card stays flagged until the drinks are delivered.',
      icon: operationIcons.drinksReminder,
    },
    requireVoidReason: {
      title: 'Reason required to void',
      body: 'An item cannot be voided without picking a reason.',
      icon: operationIcons.requireVoidReason,
    },
    quickCash: {
      title: 'Quick cash and change',
      body: 'Rounded amount buttons and change calculation on the payment screen.',
      icon: operationIcons.quickCash,
    },
    confirmBeforeClose: {
      title: 'Summary before closing',
      body: 'An order will not close before total, paid and balance are shown.',
      icon: operationIcons.confirmBeforeClose,
    },
  },

  quickActions: {
    new_order: { label: 'New order', icon: quickActionIcons.new_order },
    last_order: { label: 'Last order', icon: quickActionIcons.last_order },
    find_by_name: { label: 'Find by name', icon: quickActionIcons.find_by_name },
    open_checks: { label: 'Open checks', icon: quickActionIcons.open_checks },
    take_payment: { label: 'Take payment', icon: quickActionIcons.take_payment },
    day_summary: { label: 'Day summary', icon: quickActionIcons.day_summary },
  },

  modeSummary: (mode) => (mode === 'festival' ? 'Festival mode is on' : 'Restaurant mode is on'),

  cancellationReasonsTitle: 'Cancellation reasons',
  cancellationReasonsAccessRequired: 'This screen is for managers only.',
  cancellationReasonsEmpty: 'No reasons yet. Add the first one below.',
  reasonNameLabel: 'Reason name',
  reasonNamePlaceholder: 'e.g. Customer changed their mind',
  requiresManagerLabel: 'Requires manager approval',
  requiresManagerBody: 'For reasons with a financial impact — comps, staff meals',
  addReason: 'Add reason',
  reasonAdded: 'Reason added',
  reasonUpdated: 'Reason updated',
  enterReasonName: 'Enter a reason name',
  reasonActive: 'Active',
  reasonInactive: 'Inactive',
};

const dictionaries: Readonly<Record<string, SettingsCopy>> = { tr, bg, en };

export function settingsCopy(language: string): SettingsCopy {
  return dictionaries[language] ?? en;
}

/** Ayar ekranında ve ana ekranda aynı sırayı korumak için tek kaynak. */
export const operationsOrder: readonly (keyof OperationsPreferences)[] = [
  'namedOrders',
  'locationNotes',
  'personAccounts',
  'orderBatches',
  'fulfillmentSplit',
  'drinksReminder',
  'requireVoidReason',
  'quickCash',
  'confirmBeforeClose',
];
