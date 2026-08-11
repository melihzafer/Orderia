// Test çatısı kurulduktan SONRA çalışır. `@testing-library/react-native`
// yüklenirken `expect`'i genişletiyor, dolayısıyla `setupFiles` içinde
// (henüz `expect` yokken) içe aktarılamıyor.

// Ekran testleri açılışta gerçek bir bellek içi veritabanından yükleme yapıyor;
// varsayılan 1 sn'lik `findBy*` penceresi yavaş bir CI makinesinde yetmiyor ve
// testler gerçek bir hata değil, zaman aşımı yüzünden düşüyor.
require('@testing-library/react-native').configure({ asyncUtilTimeout: 5000 });
