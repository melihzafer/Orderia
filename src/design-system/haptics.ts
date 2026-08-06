import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Uygulamanın dokunsal geri bildirim sözlüğü. Ham `expo-haptics` çağrısı yerine
 * bunlar kullanılır ki "hangi olay hangi titreşimi hak ediyor" kararı tek yerde dursun.
 *
 * - `selection`: segment/sekme değişimi gibi ayrık seçimler
 * - `activate`: uzun basış menüyü açtığında, sürükleme başladığında
 * - `commit`: kaydırma eşiği aşıldığında, yani işlem artık gerçekleşecek
 * - `success` / `warning` / `error`: işlem sonucu
 */
export type HapticEvent = 'selection' | 'activate' | 'commit' | 'success' | 'warning' | 'error';

/**
 * Web'de Haptics API'si yok; native'de de kullanıcı titreşimi kapatmış olabilir ya da
 * cihazda motor bulunmayabilir. Hiçbir durumda dokunsal geri bildirim eksikliği
 * asıl işlemi düşürmemeli — bu yüzden her çağrı sessizce yutulur.
 */
export function haptic(event: HapticEvent): void {
  if (Platform.OS === 'web') return;

  try {
    switch (event) {
      case 'selection':
        void Haptics.selectionAsync().catch(() => undefined);
        return;
      case 'activate':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        return;
      case 'commit':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        return;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        return;
      case 'warning':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => undefined,
        );
        return;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
          () => undefined,
        );
        return;
    }
  } catch {
    // Titreşim modülü hiç yüklenmemiş olabilir; sessizce geç.
  }
}
