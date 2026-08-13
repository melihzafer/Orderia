import type { Language } from '../../i18n';

/**
 * Masa çalışma alanının bütün arayüz metinleri.
 *
 * Ekran dosyasından ayrıldı: dörtyüz satırlık üç dilli bir sözlük, ekranın
 * davranışını okumaya çalışan birinin arasından geçmek zorunda kaldığı bir
 * duvardı. Metin değişikliği artık ekrana hiç dokunmadan yapılır.
 */

export interface WorkspaceCopy {
  readonly loading: string;
  readonly loadFailed: string;
  readonly tableNotFound: string;
  readonly back: string;
  readonly workspaceActions: string;
  readonly couldNotOpen: string;
  readonly queued: string;
  readonly synced: string;
  readonly offline: string;
  readonly check: string;
  readonly newCheck: string;
  readonly checkName: string;
  readonly checkExample: string;
  readonly create: string;
  readonly close: string;
  readonly order: string;
  readonly products: string;
  readonly lines: string;
  readonly firstOrder: string;
  readonly additionalOrder: string;
  readonly noOrders: string;
  readonly tapProduct: string;
  readonly unknownWaiter: string;
  readonly note: string;
  readonly cancelled: string;
  readonly cancelItem: string;
  readonly search: string;
  readonly all: string;
  readonly allItems: string;
  readonly kitchen: string;
  readonly drinks: string;
  readonly newItems: string;
  readonly drinksReminder: string;
  readonly drinksDelivered: string;
  readonly drinksDeliveryFailed: string;
  /** Kısmi servis paneli. `queued` sync anlamında kullanıldığı için ayrı anahtar. */
  readonly serveStatus: string;
  readonly served: string;
  readonly outstanding: string;
  readonly markAllServed: string;
  readonly clearServed: string;
  readonly saveServed: string;
  readonly servedCountLabel: (served: number, total: number) => string;
  readonly increaseServed: string;
  readonly decreaseServed: string;
  readonly serveFailed: string;
  readonly cannotReduceBelowServed: string;
  readonly favorites: string;
  readonly recents: string;
  readonly favorite: string;
  readonly longPress: string;
  readonly noProducts: string;
  readonly changeFilter: string;
  readonly undo: string;
  readonly clearDraft: string;
  readonly sendOrder: string;
  readonly sendDone: string;
  readonly sendFailed: string;
  readonly cancelFailed: string;
  readonly tryAgain: string;
  readonly required: string;
  readonly noteExample: string;
  readonly addToDraft: string;
  readonly chooseReason: string;
  readonly noReasons: string;
  readonly askManagerReasons: string;
  readonly manager: string;
  readonly localSafe: string;
  readonly incomingItems: string;
  readonly locationNote: string;
  readonly locationNoteExample: string;
  readonly saveLocationNote: string;
  readonly locationNoteSaveFailed: string;
  readonly editNote: string;
  readonly saveNote: string;
  readonly noteSaveFailed: string;
  readonly noteConflict: string;
  readonly yourNote: string;
  readonly cloudNote: string;
  readonly noNote: string;
  readonly useCloudNote: string;
  readonly keepMyNote: string;
  readonly conflictFailed: string;
  readonly takePayment: string;
  readonly paymentConfirmed: string;
  readonly paymentFailed: string;
  readonly paymentChanged: string;
  readonly remaining: string;
  readonly moveTable: string;
  readonly tableMoved: string;
  readonly tablesMerged: string;
  readonly tableChanged: string;
  readonly receiptSyncing: string;
  readonly pdfFailed: string;
  readonly decrease: string;
  readonly increase: string;
  readonly editDraft: string;
  readonly draftEmpty: string;
  readonly repeatLastOrder: string;
  readonly quickNotes: string;
  readonly quantityChangeFailed: string;
  readonly cancel: string;
  readonly soldOut: string;
  readonly soldOutHint: string;
  readonly soldOutTitle: string;
  readonly markSoldOut: string;
  readonly restoreProductTitle: string;
  readonly restoreProduct: string;
  readonly availabilityFailed: string;
  readonly splitCheck: string;
  readonly splitFailed: string;
  readonly splitDone: string;
  readonly voidQuantityTitle: string;
  readonly voidQuantityLabel: string;
  readonly notePresets: readonly string[];
  readonly addProduct: string;
  readonly addProductTo: (tableLabel: string) => string;
  readonly renameCheck: string;
  readonly renameCheckSave: string;
  readonly renameCheckFailed: string;
  /** Hesap çipine uzun basınca açılan hızlı eylemler için erişilebilirlik ipucu. */
  readonly checkActionsHint: string;
  readonly deleteCheck: string;
  readonly deleteCheckConfirmBody: string;
  readonly deleteCheckFailed: string;
  readonly deleteCheckHasPayments: string;
}

function buildWorkspaceCopy(language: Language): WorkspaceCopy {
  if (language === 'tr') {
    return {
      loading: 'Masa hazırlanıyor…',
      loadFailed: 'Masa verileri okunamadı.',
      tableNotFound: 'Bu masa bu şubede bulunamadı.',
      back: 'Geri dön',
      workspaceActions: 'İşlemler',
      couldNotOpen: 'Masa açılamadı',
      queued: 'değişiklik sırada',
      synced: 'Senkron',
      offline: 'Çevrimdışı',
      check: 'Hesap',
      newCheck: 'Yeni hesap',
      checkName: 'Hesap adı',
      checkExample: 'Örn. Pencere tarafı',
      create: 'Oluştur',
      close: 'Kapat',
      order: 'Sipariş',
      products: 'Ürün',
      lines: 'satır',
      firstOrder: 'İlk sipariş',
      additionalOrder: 'Ek sipariş',
      noOrders: 'Bu hesapta sipariş yok',
      tapProduct: 'Sağdaki paletten ürüne dokun. Ürün taslağa anında eklenir.',
      unknownWaiter: 'Bilinmeyen garson',
      note: 'Not',
      cancelled: 'İptal',
      cancelItem: 'Satırı iptal et',
      search: 'Ürün ara',
      all: 'Tümü',
      allItems: 'Tüm ürünler',
      kitchen: 'Mutfak',
      drinks: 'İçecekler',
      newItems: 'Yeni eklenenler',
      drinksReminder: 'İçecekler hâlâ götürülmeyi bekliyor.',
      drinksDelivered: 'Tüm içecekler götürüldü',
      drinksDeliveryFailed: 'İçecek durumu kaydedilemedi',
      serveStatus: 'Servis durumu',
      served: 'Servis edildi',
      outstanding: 'Bekliyor',
      markAllServed: 'Tümünü servis edildi işaretle',
      clearServed: 'Servis işaretini kaldır',
      saveServed: 'Kaydet',
      servedCountLabel: (served, total) => `Servis ${served}/${total}`,
      increaseServed: 'Servis adedini artır',
      decreaseServed: 'Servis adedini azalt',
      serveFailed: 'Servis durumu kaydedilemedi',
      cannotReduceBelowServed: 'Adet, servis edilenin altına inemez. Önce servis adedini azaltın.',
      favorites: 'Favoriler',
      recents: 'Son kullanılan',
      favorite: 'Favori',
      longPress: 'Modifier ve not için basılı tut',
      noProducts: 'Ürün bulunamadı',
      changeFilter: 'Aramayı veya kategoriyi değiştir.',
      undo: 'Son işlemi geri al',
      clearDraft: 'Taslağı temizle',
      sendOrder: 'Siparişi gönder',
      sendDone: 'Sipariş mutfağa gönderildi',
      sendFailed: 'Sipariş gönderilemedi',
      cancelFailed: 'Satır iptal edilemedi',
      tryAgain: 'Tekrar deneyin.',
      required: 'zorunlu',
      noteExample: 'Örn. az tuzlu, sos ayrı',
      addToDraft: 'Taslağa ekle',
      chooseReason: 'Gönderilmiş sipariş silinmez. Bir iptal nedeni seçin.',
      noReasons: 'İptal nedeni tanımlı değil',
      askManagerReasons: 'Yöneticiden şube için iptal nedenlerini tanımlamasını isteyin.',
      manager: 'Yönetici',
      localSafe: 'Bulut yenilenemedi. Yerel siparişler cihazda güvende.',
      incomingItems: 'yeni ürün ekledi',
      locationNote: 'Konum notu',
      locationNoteExample: 'Örn. girişin yanında, mavi çadır',
      saveLocationNote: 'Konum notunu kaydet',
      locationNoteSaveFailed: 'Konum notu kaydedilemedi',
      editNote: 'Notu düzenle',
      saveNote: 'Notu kaydet',
      noteSaveFailed: 'Not kaydedilemedi',
      noteConflict: 'Not başka bir cihazda değişti',
      yourNote: 'Senin notun',
      cloudNote: 'Buluttaki not',
      noNote: 'Not yok',
      useCloudNote: 'Buluttakini kullan',
      keepMyNote: 'Benim notumu uygula',
      conflictFailed: 'Çakışma çözülemedi',
      takePayment: 'Ödeme al',
      paymentConfirmed: 'Ödeme kesinleşti',
      paymentFailed: 'Ödeme kesinleştirilemedi',
      paymentChanged: 'Hesap başka bir cihazda değişti. Güncel kalan tutarı kontrol edin.',
      remaining: 'Kalan',
      moveTable: 'Masayı taşı veya birleştir',
      tableMoved: 'Masa taşındı',
      tablesMerged: 'Masalar birleştirildi',
      tableChanged: 'Kaynak veya hedef masa başka bir cihazda değişti. Güncel durumu kontrol edin.',
      receiptSyncing: 'Fiş oluşturuldu ve arşive senkronize ediliyor.',
      pdfFailed: 'Fiş PDF’i hazırlanamadı',
      decrease: 'Azalt',
      increase: 'Artır',
      editDraft: 'Taslağı düzenle',
      draftEmpty: 'Taslak boş',
      repeatLastOrder: 'Son siparişi tekrarla',
      quickNotes: 'Hızlı notlar',
      quantityChangeFailed: 'Adet değiştirilemedi',
      cancel: 'Vazgeç',
      soldOut: 'Tükendi',
      soldOutHint: 'Stoğa geri almak için dokun',
      soldOutTitle: 'Bugünlük tükendi mi?',
      markSoldOut: 'Tükendi olarak işaretle',
      restoreProductTitle: 'Tekrar satışa açılsın mı?',
      restoreProduct: 'Satışa aç',
      availabilityFailed: 'Ürün durumu değiştirilemedi',
      splitCheck: 'Hesabı böl',
      splitFailed: 'Hesap bölünemedi',
      splitDone: 'Hesap bölündü',
      voidQuantityTitle: 'Kaç adet iptal edilsin?',
      voidQuantityLabel: 'İptal edilecek adet',
      notePresets: ['Acil', 'Soğansız', 'Az pişmiş', 'İyi pişmiş', 'Acılı', 'Sos ayrıda'],
      addProduct: 'Ürün ekle',
      addProductTo: (tableLabel) => `Ürün ekle: ${tableLabel}`,
      renameCheck: 'Hesabı yeniden adlandır',
      renameCheckSave: 'Kaydet',
      renameCheckFailed: 'Hesap adı değiştirilemedi',
      checkActionsHint: 'Hesap eylemleri için basılı tut',
      deleteCheck: 'Hesabı sil',
      deleteCheckConfirmBody:
        'Hesaptaki tüm ürünler iptal edilir ve hesap kapanır. Gönderilmiş sipariş silinmez, iptal olarak işaretlenir. Bir neden seçin.',
      deleteCheckFailed: 'Hesap silinemedi',
      deleteCheckHasPayments: 'Onaylanmış ödemesi olan bir hesap silinemez',
    };
  }
  if (language === 'bg') {
    return {
      loading: 'Масата се зарежда…',
      loadFailed: 'Данните за масата не могат да се прочетат.',
      tableNotFound: 'Масата не е намерена в този обект.',
      back: 'Назад',
      workspaceActions: 'Действия',
      couldNotOpen: 'Масата не може да се отвори',
      queued: 'промени на опашка',
      synced: 'Синхронизирано',
      offline: 'Офлайн',
      check: 'Сметка',
      newCheck: 'Нова сметка',
      checkName: 'Име на сметката',
      checkExample: 'Напр. До прозореца',
      create: 'Създай',
      close: 'Затвори',
      order: 'Поръчка',
      products: 'продукта',
      lines: 'реда',
      firstOrder: 'Първа поръчка',
      additionalOrder: 'Допълнителна поръчка',
      noOrders: 'Няма поръчки в тази сметка',
      tapProduct: 'Докоснете продукт от палитрата, за да го добавите веднага.',
      unknownWaiter: 'Неизвестен сервитьор',
      note: 'Бележка',
      cancelled: 'Отказано',
      cancelItem: 'Откажи реда',
      search: 'Търси продукт',
      all: 'Всички',
      allItems: 'Всички продукти',
      kitchen: 'Кухня',
      drinks: 'Напитки',
      newItems: 'Нови',
      drinksReminder: 'Напитките още чакат да бъдат занесени.',
      drinksDelivered: 'Всички напитки са занесени',
      drinksDeliveryFailed: 'Статусът на напитките не е запазен',
      serveStatus: 'Статус на сервиране',
      served: 'Сервирано',
      outstanding: 'Чака',
      markAllServed: 'Отбележи всички като сервирани',
      clearServed: 'Премахни отметката за сервиране',
      saveServed: 'Запази',
      servedCountLabel: (served, total) => `Сервирани ${served}/${total}`,
      increaseServed: 'Увеличи сервираното количество',
      decreaseServed: 'Намали сервираното количество',
      serveFailed: 'Статусът на сервиране не е запазен',
      cannotReduceBelowServed:
        'Количеството не може да падне под вече сервираното. Първо намалете сервираното.',
      favorites: 'Любими',
      recents: 'Последни',
      favorite: 'Любим',
      longPress: 'Задръжте за опции и бележка',
      noProducts: 'Няма продукти',
      changeFilter: 'Променете търсенето или категорията.',
      undo: 'Отмени последното',
      clearDraft: 'Изчисти черновата',
      sendOrder: 'Изпрати поръчката',
      sendDone: 'Поръчката е изпратена към кухнята',
      sendFailed: 'Поръчката не е изпратена',
      cancelFailed: 'Редът не е отказан',
      tryAgain: 'Опитайте отново.',
      required: 'задължително',
      noteExample: 'Напр. по-малко сол, сос отделно',
      addToDraft: 'Добави',
      chooseReason: 'Изпратена поръчка не се изтрива. Изберете причина.',
      noReasons: 'Няма причини за отказ',
      askManagerReasons: 'Помолете управителя да добави причини за този обект.',
      manager: 'Управител',
      localSafe: 'Облакът не се обнови. Локалните поръчки са запазени.',
      incomingItems: 'добави нови продукта',
      locationNote: 'Бележка за място',
      locationNoteExample: 'Напр. до входа, синята палатка',
      saveLocationNote: 'Запази бележката за място',
      locationNoteSaveFailed: 'Бележката за място не е запазена',
      editNote: 'Редактирай бележката',
      saveNote: 'Запази бележката',
      noteSaveFailed: 'Бележката не е запазена',
      noteConflict: 'Бележката е променена на друго устройство',
      yourNote: 'Вашата бележка',
      cloudNote: 'Бележката в облака',
      noNote: 'Няма бележка',
      useCloudNote: 'Използвай облачната',
      keepMyNote: 'Запази моята',
      conflictFailed: 'Конфликтът не е разрешен',
      takePayment: 'Плащане',
      paymentConfirmed: 'Плащането е потвърдено',
      paymentFailed: 'Плащането не бе потвърдено',
      paymentChanged: 'Сметката е променена на друго устройство. Проверете остатъка.',
      remaining: 'Остава',
      moveTable: 'Премести или обедини маса',
      tableMoved: 'Масата е преместена',
      tablesMerged: 'Масите са обединени',
      tableChanged: 'Източникът или целта са променени. Проверете текущото състояние.',
      receiptSyncing: 'Разписката е създадена и се синхронизира с архива.',
      pdfFailed: 'PDF файлът не бе подготвен',
      decrease: 'Намали',
      increase: 'Увеличи',
      editDraft: 'Редакция на черновата',
      draftEmpty: 'Черновата е празна',
      repeatLastOrder: 'Повтори последната поръчка',
      quickNotes: 'Бързи бележки',
      quantityChangeFailed: 'Количеството не е променено',
      cancel: 'Отказ',
      soldOut: 'Изчерпан',
      soldOutHint: 'Докоснете, за да го върнете в наличност',
      soldOutTitle: 'Изчерпан ли е за днес?',
      markSoldOut: 'Отбележи като изчерпан',
      restoreProductTitle: 'Да се върне ли в продажба?',
      restoreProduct: 'Върни в продажба',
      availabilityFailed: 'Наличността не беше променена',
      splitCheck: 'Раздели сметката',
      splitFailed: 'Сметката не беше разделена',
      splitDone: 'Сметката е разделена',
      voidQuantityTitle: 'Колко бройки да се откажат?',
      voidQuantityLabel: 'Бройки за отказ',
      notePresets: [
        'Спешно',
        'Без лук',
        'По-малко печено',
        'Добре изпечено',
        'Пикантно',
        'Сосът отделно',
      ],
      addProduct: 'Добави продукт',
      addProductTo: (tableLabel) => `Добави продукт към ${tableLabel}`,
      renameCheck: 'Преименувай сметката',
      renameCheckSave: 'Запази',
      renameCheckFailed: 'Името на сметката не бе променено',
      checkActionsHint: 'Задръж за действия със сметката',
      deleteCheck: 'Изтрий сметката',
      deleteCheckConfirmBody:
        'Всички продукти в сметката ще бъдат отказани и сметката ще се затвори. Изпратената поръчка не се изтрива, а се маркира като отказана. Изберете причина.',
      deleteCheckFailed: 'Сметката не бе изтрита',
      deleteCheckHasPayments: 'Сметка с потвърдено плащане не може да бъде изтрита',
    };
  }
  return {
    loading: 'Loading table…',
    loadFailed: 'Table data could not be read.',
    tableNotFound: 'This table was not found in the branch.',
    back: 'Go back',
    workspaceActions: 'Actions',
    couldNotOpen: 'Could not open table',
    queued: 'changes queued',
    synced: 'Synced',
    offline: 'Offline',
    check: 'Check',
    newCheck: 'New check',
    checkName: 'Check name',
    checkExample: 'E.g. Window side',
    create: 'Create',
    close: 'Close',
    order: 'Order',
    products: 'items',
    lines: 'lines',
    firstOrder: 'First order',
    additionalOrder: 'Additional order',
    noOrders: 'No orders on this check',
    tapProduct: 'Tap a product in the palette to add it to the draft immediately.',
    unknownWaiter: 'Unknown waiter',
    note: 'Note',
    cancelled: 'Cancelled',
    cancelItem: 'Cancel line',
    search: 'Search products',
    all: 'All',
    allItems: 'All items',
    kitchen: 'Kitchen',
    drinks: 'Drinks',
    newItems: 'New items',
    drinksReminder: 'Drinks are still waiting to be carried out.',
    drinksDelivered: 'All drinks carried out',
    drinksDeliveryFailed: 'Drink delivery status could not be saved',
    serveStatus: 'Serving status',
    served: 'Served',
    outstanding: 'Outstanding',
    markAllServed: 'Mark all served',
    clearServed: 'Clear served mark',
    saveServed: 'Save',
    servedCountLabel: (served, total) => `Served ${served}/${total}`,
    increaseServed: 'Increase served count',
    decreaseServed: 'Decrease served count',
    serveFailed: 'Serving status could not be saved',
    cannotReduceBelowServed:
      'Quantity cannot drop below what is already served. Reduce the served count first.',
    favorites: 'Favorites',
    recents: 'Recent',
    favorite: 'Favorite',
    longPress: 'Long press for modifiers and notes',
    noProducts: 'No products found',
    changeFilter: 'Change the search or category.',
    undo: 'Undo last action',
    clearDraft: 'Clear draft',
    sendOrder: 'Send order',
    sendDone: 'Order sent to the kitchen',
    sendFailed: 'Order could not be sent',
    cancelFailed: 'Line could not be cancelled',
    tryAgain: 'Try again.',
    required: 'required',
    noteExample: 'E.g. less salt, sauce on side',
    addToDraft: 'Add to draft',
    chooseReason: 'A sent order is never deleted. Choose a cancellation reason.',
    noReasons: 'No cancellation reasons',
    askManagerReasons: 'Ask a manager to configure cancellation reasons for this branch.',
    manager: 'Manager',
    localSafe: 'Cloud refresh failed. Local orders remain safe on this device.',
    incomingItems: 'added new items',
    locationNote: 'Location note',
    locationNoteExample: 'E.g. beside the entrance, blue tent',
    saveLocationNote: 'Save location note',
    locationNoteSaveFailed: 'Location note could not be saved',
    editNote: 'Edit note',
    saveNote: 'Save note',
    noteSaveFailed: 'Note could not be saved',
    noteConflict: 'The note changed on another device',
    yourNote: 'Your note',
    cloudNote: 'Cloud note',
    noNote: 'No note',
    useCloudNote: 'Use cloud note',
    keepMyNote: 'Keep my note',
    conflictFailed: 'Conflict could not be resolved',
    takePayment: 'Take payment',
    paymentConfirmed: 'Payment confirmed',
    paymentFailed: 'Payment could not be confirmed',
    paymentChanged: 'The check changed on another device. Review the current balance.',
    remaining: 'Remaining',
    moveTable: 'Move or merge table',
    tableMoved: 'Table moved',
    tablesMerged: 'Tables merged',
    tableChanged: 'The source or target changed on another device. Review the current state.',
    receiptSyncing: 'The receipt was issued and is syncing to the archive.',
    pdfFailed: 'Receipt PDF could not be prepared',
    decrease: 'Decrease',
    increase: 'Increase',
    editDraft: 'Edit draft',
    draftEmpty: 'Draft is empty',
    repeatLastOrder: 'Repeat last order',
    quickNotes: 'Quick notes',
    quantityChangeFailed: 'Quantity could not be changed',
    cancel: 'Cancel',
    soldOut: 'Sold out',
    soldOutHint: 'Tap to put it back in stock',
    soldOutTitle: 'Sold out for today?',
    markSoldOut: 'Mark sold out',
    restoreProductTitle: 'Put it back on sale?',
    restoreProduct: 'Back on sale',
    availabilityFailed: 'Availability could not be changed',
    splitCheck: 'Split check',
    splitFailed: 'The check could not be split',
    splitDone: 'Check split',
    voidQuantityTitle: 'How many should be voided?',
    voidQuantityLabel: 'Units to void',
    notePresets: ['Rush', 'No onion', 'Rare', 'Well done', 'Spicy', 'Sauce on the side'],
    addProduct: 'Add product',
    addProductTo: (tableLabel) => `Add product to ${tableLabel}`,
    renameCheck: 'Rename check',
    renameCheckSave: 'Save',
    renameCheckFailed: 'Check name could not be changed',
    checkActionsHint: 'Hold for check actions',
    deleteCheck: 'Delete check',
    deleteCheckConfirmBody:
      'Every item on this check will be cancelled and the check will close. A sent order is never deleted, only marked cancelled. Choose a reason.',
    deleteCheckFailed: 'Check could not be deleted',
    deleteCheckHasPayments: 'A check with a confirmed payment cannot be deleted',
  };
}

/**
 * Dil başına tek örnek.
 *
 * `workspaceCopy(language)` ekranın her render'ında çağrılıyordu ve her seferinde
 * 100'den fazla anahtarlı yeni bir nesne üretiyordu. Asıl maliyet ayırma değil,
 * kimliğin sürekli değişmesiydi: `copy` alt bileşenlerin hepsine prop olarak
 * gidiyor, dolayısıyla arama kutusundaki her tuş vuruşu bütün listeyi yeniden
 * çizdiriyordu. Sözlük saf ve dil sayısı üç; önbellek burada, çağıranların
 * `useMemo` yazmasını beklemeden çözer.
 */
const cache = new Map<Language, WorkspaceCopy>();

export function workspaceCopy(language: Language): WorkspaceCopy {
  let copy = cache.get(language);
  if (!copy) {
    copy = buildWorkspaceCopy(language);
    cache.set(language, copy);
  }
  return copy;
}
