import { Category, DayHistory, Hall, MenuItem, Table, Ticket } from '../types';

export const orderiaBackupVersion = 1 as const;

export interface OrderiaBackup {
  readonly format: 'orderia-backup';
  readonly version: typeof orderiaBackupVersion;
  readonly exportedAt: string;
  readonly data: {
    readonly halls: readonly Hall[];
    readonly tables: readonly Table[];
    readonly categories: readonly Category[];
    readonly menuItems: readonly MenuItem[];
    readonly openTickets: Readonly<Record<string, Ticket>>;
    readonly dailyHistory: Readonly<Record<string, DayHistory>>;
    readonly settings?: {
      readonly language?: string;
      readonly currency?: string;
      readonly colorMode?: string;
      readonly serviceMode?: string;
    };
  };
}

export interface BackupSource {
  readonly halls: readonly Hall[];
  readonly tables: readonly Table[];
  readonly categories: readonly Category[];
  readonly menuItems: readonly MenuItem[];
  readonly openTickets: Readonly<Record<string, Ticket>>;
  readonly dailyHistory: Readonly<Record<string, DayHistory>>;
  readonly settings?: OrderiaBackup['data']['settings'];
}

export function createOrderiaBackup(
  source: BackupSource,
  exportedAt = new Date().toISOString(),
): OrderiaBackup {
  return {
    format: 'orderia-backup',
    version: orderiaBackupVersion,
    exportedAt,
    data: {
      halls: source.halls,
      tables: source.tables,
      categories: source.categories,
      menuItems: source.menuItems,
      openTickets: source.openTickets,
      dailyHistory: source.dailyHistory,
      ...(source.settings ? { settings: source.settings } : {}),
    },
  };
}

export function parseOrderiaBackup(raw: string): OrderiaBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Yedek dosyası geçerli bir JSON değil.');
  }

  if (
    !isRecord(parsed) ||
    parsed.format !== 'orderia-backup' ||
    parsed.version !== orderiaBackupVersion
  ) {
    throw new Error('Bu dosya desteklenen bir Orderia yedeği değil.');
  }
  if (!isRecord(parsed.data)) throw new Error('Yedek verisi bulunamadı.');

  const data = parsed.data;
  if (
    !isArray(data.halls) ||
    !isArray(data.tables) ||
    !isArray(data.categories) ||
    !isArray(data.menuItems) ||
    !isRecord(data.openTickets) ||
    !isRecord(data.dailyHistory)
  ) {
    throw new Error('Yedek dosyası eksik veya bozuk.');
  }

  return {
    format: 'orderia-backup',
    version: orderiaBackupVersion,
    exportedAt:
      typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    data: {
      halls: data.halls as Hall[],
      tables: data.tables as Table[],
      categories: data.categories as Category[],
      menuItems: data.menuItems as MenuItem[],
      openTickets: data.openTickets as Record<string, Ticket>,
      dailyHistory: data.dailyHistory as Record<string, DayHistory>,
      ...(isRecord(data.settings)
        ? { settings: data.settings as OrderiaBackup['data']['settings'] }
        : {}),
    },
  };
}

export function downloadTextFile(filename: string, contents: string, mimeType: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
