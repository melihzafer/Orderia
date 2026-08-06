import uuid from 'react-native-uuid';
import type { DraftOrderLine } from './orderCommands';
import type { Language } from '../../i18n';

/**
 * Çalışma alanının saf biçimlendirme yardımcıları.
 *
 * TableDetailScreen'den ayrıldılar: hiçbiri React'e ya da ekranın durumuna
 * bağlı değil, dolayısıyla 3.000 satırlık bir dosyanın içinde saklanmaları
 * için bir sebep yoktu. Burada ayrıca doğrudan test edilebilirler.
 */

const LOCALES: Readonly<Record<Language, string>> = {
  tr: 'tr-TR',
  bg: 'bg-BG',
  en: 'en-GB',
};

/**
 * `Intl` biçimlendiricileri kurulumu pahalı, kullanımı ucuzdur; bu yüzden çağrı
 * başına yeniden kurulmak yerine önbelleğe alınıyorlar. Bu iki fonksiyon liste
 * satırlarının içinden çağrılıyor — iki yüz ürünlük bir menüyü uçtan uca
 * kaydırmak yüzlerce kurulum demekti. Önbellek (3 dil × kullanımdaki para birimi)
 * ile sınırlı olduğu için büyümesi de sınırlı.
 */
const moneyFormatters = new Map<string, Intl.NumberFormat>();
const timeFormatters = new Map<Language, Intl.DateTimeFormat>();

export function draftLineTotal(line: DraftOrderLine): number {
  const optionIds = new Set(line.selectedOptionIds);
  const modifierMinor = line.product.modifierGroups
    .flatMap((group) => group.options)
    .filter((option) => optionIds.has(option.id))
    .reduce((total, option) => total + option.priceDeltaMinor, 0);
  return (line.product.priceMinor + modifierMinor) * line.quantity;
}

export function formatMoney(amountMinor: number, currencyCode: string, language: Language): string {
  const key = `${language}:${currencyCode}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALES[language] ?? LOCALES.en, {
      currency: currencyCode,
      style: 'currency',
    });
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(amountMinor / 100);
}

/**
 * İstemci tarafı mutasyon kimliği.
 *
 * Depodaki diğer her yer (`orderCommands`, `checkSplitCommands`, `AuthContext`,
 * `menuCatalogGateway`) `react-native-uuid` kullanıyor. Buradaki eski sürüm
 * `globalThis.crypto.randomUUID`'ye dayanıyor ve yoksa istisna fırlatıyordu;
 * projede crypto polyfill'i yok, dolayısıyla sipariş gönderme yolunda —
 * uygulamanın en kritik akışında — patlama riski taşıyordu.
 */
export function clientMutationUuid(): string {
  return String(uuid.v4());
}

export function timeOnly(timestamp: string, language: Language): string {
  let formatter = timeFormatters.get(language);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
      hour: '2-digit',
      minute: '2-digit',
    });
    timeFormatters.set(language, formatter);
  }
  return formatter.format(new Date(timestamp));
}

export function conflictNote(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const note = (value as { readonly note?: unknown }).note;
  return typeof note === 'string' && note.trim() ? note.trim() : undefined;
}
