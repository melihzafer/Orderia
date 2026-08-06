import { Platform, ViewStyle } from 'react-native';

/**
 * `:focus-visible` polyfili: son etkileşim fareyse odak halkasını bastırır.
 * Tab tuşuyla gezinme klavye modunu açar, herhangi bir pointerdown kapatır.
 * Web dışında kullanılmaz — native'de zaten yalnızca gerçek odak olayı var.
 */
let keyboardModeActive = false;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') keyboardModeActive = true;
    },
    true,
  );
  window.addEventListener(
    'pointerdown',
    () => {
      keyboardModeActive = false;
    },
    true,
  );
}

/**
 * Klavye odağı halkası.
 *
 * Web'de gerçek bir `outline` kullanılır: kenarlığı 1px'ten 3px'e çıkarmak odak
 * her gezindiğinde düzeni 2px oynatıyordu, `outline` ise akışın dışında çizilir.
 * Ayrıca tarayıcıların ve denetim araçlarının "görünür odak" için baktığı yer burası.
 * Fare tıklaması da native `focus` olayını tetikler; halka yalnızca klavye
 * modundayken çizilir, yoksa her tıklamada gereksiz kırmızı çerçeve belirirdi.
 *
 * Native'de outline yok; orada kenarlık kalınlaşarak aynı işi görür.
 *
 * React Native'in `ViewStyle` tipi outline alanlarını tanımıyor (react-native-web'e
 * özgüler), bu yüzden tek bir yerde çevriliyorlar.
 */
export function focusRing(color: string, focused: boolean): ViewStyle | undefined {
  // Odak yokken boş nesne yerine `undefined`: stil dizisi bunu tamamen atlar,
  // her bileşenin stiline anlamsız bir `{}` eklenmez.
  if (!focused) return undefined;

  if (Platform.OS === 'web') {
    if (!keyboardModeActive) return undefined;
    return {
      outlineColor: color,
      outlineOffset: 2,
      outlineStyle: 'solid',
      outlineWidth: 2,
    } as unknown as ViewStyle;
  }

  return { borderColor: color, borderWidth: 3 };
}
