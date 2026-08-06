import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceQuickAction } from '../../design-system';
import { settingsCopy } from '../app-settings';
import { useLocalization } from '../../i18n';
import type { QuickActionId } from '../../stores/settingsStore';

export interface ShiftBoardQuickActionCounts {
  readonly openCount: number;
  readonly attentionCount: number;
  readonly paymentCount: number;
  readonly availableCount: number;
}

export interface ShiftBoardQuickActionsProps {
  readonly actions: readonly QuickActionId[];
  readonly counts: ShiftBoardQuickActionCounts;
  readonly onAction: (id: QuickActionId) => void;
  readonly disabledActions?: readonly QuickActionId[];
}

/**
 * Ana ekranın üstündeki kısayol şeridi.
 * Hangi kısayolların görüneceğini kullanıcı Ayarlar'dan seçer; hiçbiri seçili
 * değilse şerit hiç çizilmez, ekranın üstü siparişlere kalır.
 */
export function ShiftBoardQuickActions({
  actions,
  counts,
  onAction,
  disabledActions = [],
}: ShiftBoardQuickActionsProps) {
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const copy = settingsCopy(language);

  if (actions.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.space.xs,
        marginBottom: tokens.space.sm,
      }}
    >
      {actions.map((id) => {
        const entry = copy.quickActions[id];
        return (
          <ServiceQuickAction
            badge={badgeFor(id, counts)}
            disabled={disabledActions.includes(id)}
            emphasis={id === 'new_order' ? 'primary' : 'default'}
            icon={entry.icon}
            key={id}
            label={entry.label}
            onPress={() => onAction(id)}
            style={{ flexBasis: 0, flexGrow: 1, minWidth: 96 }}
            tone={toneFor(id)}
          />
        );
      })}
    </View>
  );
}

function badgeFor(id: QuickActionId, counts: ShiftBoardQuickActionCounts): number | undefined {
  switch (id) {
    case 'open_checks':
      return counts.openCount || undefined;
    case 'take_payment':
      return counts.paymentCount || undefined;
    case 'new_order':
      return counts.availableCount || undefined;
    default:
      return undefined;
  }
}

function toneFor(id: QuickActionId): 'accent' | 'info' | 'success' | 'warning' | 'neutral' {
  switch (id) {
    case 'take_payment':
      return 'info';
    case 'open_checks':
      return 'warning';
    case 'day_summary':
      return 'success';
    default:
      return 'accent';
  }
}
