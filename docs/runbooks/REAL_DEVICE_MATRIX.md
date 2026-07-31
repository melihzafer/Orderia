# Gerçek Cihaz Doğrulama Matrisi

Durum: çalıştırılmadı. Bu belge simülatör veya Playwright sonucu ile “geçti” yapılamaz.

## Zorunlu cihazlar

| Platform | Minimum | Build | Durum | Kanıt |
|---|---|---|---|---|
| Android düşük/orta seviye, Android 10–12 | 1 | Preview APK | Bekliyor | — |
| Android güncel, Android 14+ | 1 | Preview APK | Bekliyor | — |
| iPhone Safari, iOS 16.4+ | 1 | Production PWA | Bekliyor | — |
| iPhone Home Screen PWA | aynı cihaz | Production PWA | Bekliyor | — |

## Her cihazda akış

1. Temiz kurulum/ilk açılış, login ve doğru branch seçimi
2. Warm start ve masa ekranı kullanılabilirlik süresi
3. Hızlı ürün arama, modifier, not, ayrı hesap ve gönderme
4. Uçak modunda sipariş, force-close, yeniden açma ve local kayıt
5. Online dönüş, tek mutation, başka cihazda görünme
6. Aynı masaya iki cihazdan eşzamanlı ekleme ve garson attribution
7. Yanlış ürün iptali, audit kimliği ve toplam
8. Kısmi nakit/kart ödeme ve kalan tutar
9. Masa taşıma/birleştirme
10. Eski receipt arama, PDF üretme ve paylaşma
11. Manager device revocation sonrası erişimin kesilmesi
12. PWA update’in pending outbox/ödeme sırasında zorla reload yapmaması

## Kabul

- Veri kaybı, çift sipariş ve çift ödeme: `0`
- Kritik dokunma hedefi veya safe-area engeli: `0`
- Offline mental model yanlış yönlendirmesi: `0`
- Android crash/ANR: `0`
- iPhone install, offline shell ve IndexedDB recovery: başarılı

Model/OS/build SHA, süreler ve ekran kaydı bağlantısı kanıt sütununa yazılır. Gerçek misafir veya kart
verisi kullanılmaz.
