import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * İşletim sistemindeki "hareketi azalt" tercihini okur ve değiştiğinde günceller.
 *
 * Animasyon süresi seçen her bileşen buna danışır: tercih açıksa süre sıfırlanır,
 * yani geçiş anında tamamlanır — kaldırılmaz, sadece hareket etmez. Böylece
 * bileşenlerin iki ayrı kod yolu tutması gerekmez.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduced(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduced(enabled);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/**
 * Hareket azaltma açıkken süreyi sıfırlar. `useReducedMotion` ile birlikte kullanılır:
 * `motionDuration(tokens.motion.panel, reduced)`.
 */
export function motionDuration(duration: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : duration;
}
