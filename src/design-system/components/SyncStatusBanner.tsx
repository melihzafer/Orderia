import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
// Barrel'dan değil doğrudan: `data/runtime/index.ts` üzerinden alınca
// design-system -> data/runtime -> features/* -> design-system döngüsü kuruyor
// (bazı özellik ekranları design-system bileşenlerini kullanıyor).
import { useOrderiaData } from '../../data/runtime/OrderiaDataContext';
import { useLocalization } from '../../i18n';
import type { ServiceThemeTokens } from '../tokens';

/**
 * Servis sırasında bağlantı durumu yalnızca masanın "..." menüsünü açınca
 * görünüyordu — garson aktif sipariş alırken offline'a düştüğünü fark etmeden
 * devam edebiliyordu. Her şey normalken (senkron, çakışma yok) gizli kalır;
 * yalnızca dikkat gerektiren durumda (offline / bekleyen işlem / çakışma /
 * hata) üstte ince bir şerit olarak görünür.
 */
export function SyncStatusBanner() {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const { mode, sync } = useOrderiaData();

  if (mode !== 'cloud' || sync.state === 'synced' || sync.state === 'syncing') {
    return null;
  }

  const { icon, background, foreground, label } = presentationFor(sync.state, sync, t, tokens);

  return (
    <View
      accessibilityRole="alert"
      style={{
        alignItems: 'center',
        backgroundColor: background,
        flexDirection: 'row',
        gap: tokens.space.xs,
        justifyContent: 'center',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.xs,
      }}
    >
      <Ionicons color={foreground} name={icon} size={14} />
      <Text style={[tokens.typography.caption, { color: foreground, fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

function presentationFor(
  state: 'offline' | 'pending' | 'conflict' | 'error',
  sync: { readonly pendingCount: number },
  t: {
    readonly offlineState: string;
    readonly queuedChanges: string;
    readonly needsReviewState: string;
    readonly syncIssueState: string;
  },
  tokens: ServiceThemeTokens,
): {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly background: string;
  readonly foreground: string;
  readonly label: string;
} {
  const pendingSuffix = sync.pendingCount > 0 ? ` · ${sync.pendingCount} ${t.queuedChanges}` : '';

  switch (state) {
    case 'offline':
      return {
        icon: 'cloud-offline-outline',
        background: tokens.colors.warning,
        foreground: tokens.colors.onWarning,
        label: `${t.offlineState.toUpperCase()}${pendingSuffix}`,
      };
    case 'conflict':
      return {
        icon: 'warning-outline',
        background: tokens.colors.error,
        foreground: tokens.colors.onError,
        label: t.needsReviewState,
      };
    case 'error':
      return {
        icon: 'alert-circle-outline',
        background: tokens.colors.error,
        foreground: tokens.colors.onError,
        label: t.syncIssueState,
      };
    case 'pending':
    default:
      return {
        icon: 'sync-outline',
        background: tokens.colors.info,
        foreground: tokens.colors.onInfo,
        label: `${sync.pendingCount} ${t.queuedChanges}`,
      };
  }
}
