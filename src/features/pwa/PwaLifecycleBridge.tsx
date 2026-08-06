import { useEffect } from 'react';
import { Platform } from 'react-native';
import { initializePwaLifecycle } from './pwaLifecycle';

/**
 * Service worker kaydını kimlik doğrulamadan bağımsız olarak başlatır.
 *
 * Kurulum ve güncelleme afişini taşıyan `PwaLifecycleBanner`, `useOrderiaData`'ya
 * bağlı olduğu için `AuthGate`'in altında duruyor. Sonuç şuydu: henüz giriş yapmamış
 * bir kullanıcıda service worker hiç kaydolmuyor, yani uygulama kabuğu önbelleğe
 * alınmadan kalıyor ve çevrimdışı ilk açılış çalışmıyordu.
 *
 * `initializePwaLifecycle` referans sayar ve iki kez çağrılmaya dayanıklı; bu yüzden
 * afiş de kendi başlatmasını yapmaya devam edebilir.
 */
export function PwaLifecycleBridge(): null {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    return initializePwaLifecycle();
  }, []);

  return null;
}
