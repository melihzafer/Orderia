import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { ServiceButton, ServiceIconButton, useAdaptiveLayout } from '../../../design-system';
import type { DraftOrderLine } from '../orderCommands';
import { QuantityStepper } from '../../../components/QuantityStepper';
import type { Language } from '../../../i18n';
import type { WorkspaceCopy } from '../workspaceCopy';
import { draftLineTotal, formatMoney } from '../workspaceFormat';
import { ModalActions, WorkspaceModal } from './WorkspaceModals';

/**
 * Gönderilmemiş taslak şeridi. Özet satırına dokunulunca eklenen ürünler
 * kendi üstünde açılır bir listede görünür — garson taslağı görmek için ayrı
 * bir modal açmak zorunda kalmaz. Ürün eklenince liste kendiliğinden açılır,
 * taslak boşalınca kapanır.
 */

export function DraftBar({
  draft,
  totalMinor,
  currencyCode,
  language,
  copy,
  submitting,
  undoAvailable,
  repeatAvailable,
  onUndo,
  onClear,
  onChangeQuantity,
  onRemove,
  onRepeat,
  onSend,
}: {
  readonly draft: readonly DraftOrderLine[];
  readonly totalMinor: number;
  readonly currencyCode: string;
  readonly language: Language;
  readonly copy: WorkspaceCopy;
  readonly submitting: boolean;
  readonly undoAvailable: boolean;
  readonly repeatAvailable: boolean;
  readonly onUndo: () => void;
  readonly onClear: () => void;
  readonly onChangeQuantity: (lineId: string, delta: number) => void;
  readonly onRemove: (lineId: string) => void;
  readonly onRepeat: () => void;
  readonly onSend: () => void;
}) {
  const { tokens } = useTheme();
  const { mode } = useAdaptiveLayout();
  const compact = mode === 'compact';
  const count = draft.reduce((total, line) => total + line.quantity, 0);
  const [expanded, setExpanded] = useState(false);
  const previousCount = React.useRef(draft.length);

  useEffect(() => {
    if (draft.length === 0) {
      setExpanded(false);
    } else if (draft.length > previousCount.current) {
      setExpanded(true);
    }
    previousCount.current = draft.length;
  }, [draft.length]);

  return (
    <View
      style={[
        tokens.elevation.sticky,
        {
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.border,
          borderTopWidth: 1,
          gap: compact ? tokens.space.xs : tokens.space.sm,
          padding: compact ? tokens.space.xs : tokens.space.sm,
        },
      ]}
    >
      <Pressable
        accessibilityHint={copy.editDraft}
        accessibilityRole="button"
        accessibilityState={{ expanded, disabled: draft.length === 0 }}
        disabled={draft.length === 0}
        onPress={() => setExpanded((current) => !current)}
        style={{
          alignItems: 'center',
          backgroundColor: draft.length > 0 ? tokens.colors.accentSoft : 'transparent',
          borderRadius: tokens.radius.medium,
          flexDirection: 'row',
          justifyContent: 'space-between',
          minHeight: 48,
          paddingHorizontal: compact ? tokens.space.xs : tokens.space.sm,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.xs }}>
          <Ionicons
            color={draft.length > 0 ? tokens.colors.accent : tokens.colors.textMuted}
            name="cart-outline"
            size={20}
          />
          <Text
            style={[
              tokens.typography.label,
              {
                color: draft.length > 0 ? tokens.colors.accent : tokens.colors.textSubtle,
              },
            ]}
          >
            {count} {copy.products}
          </Text>
        </View>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.xs }}>
          <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
            {formatMoney(totalMinor, currencyCode, language)}
          </Text>
          {draft.length > 0 ? (
            <Ionicons
              color={tokens.colors.accent}
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={18}
            />
          ) : null}
        </View>
      </Pressable>
      {expanded && draft.length > 0 ? (
        <ScrollView style={{ maxHeight: 220 }}>
          {draft.map((line) => {
            const selectedOptions = line.product.modifierGroups
              .flatMap((group) => group.options)
              .filter((option) => line.selectedOptionIds.includes(option.id));
            return (
              <View
                key={line.id}
                style={{
                  alignItems: 'center',
                  borderBottomColor: tokens.colors.borderLight,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  gap: tokens.space.sm,
                  paddingVertical: tokens.space.xs,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                    {line.product.name}
                  </Text>
                  {selectedOptions.map((option) => (
                    <Text
                      key={option.id}
                      style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                    >
                      + {option.name}
                    </Text>
                  ))}
                  {line.note ? (
                    <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
                      {copy.note}: {line.note}
                    </Text>
                  ) : null}
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                    {formatMoney(draftLineTotal(line), currencyCode, language)}
                  </Text>
                </View>
                <QuantityStepper
                  compact
                  decreaseLabel={`${copy.decrease}: ${line.product.name}`}
                  increaseLabel={`${copy.increase}: ${line.product.name}`}
                  onDecrease={() => onChangeQuantity(line.id, -1)}
                  onIncrease={() => onChangeQuantity(line.id, 1)}
                  quantity={line.quantity}
                />
                <ServiceIconButton
                  icon="trash-outline"
                  label={`${copy.clearDraft}: ${line.product.name}`}
                  onPress={() => onRemove(line.id)}
                />
              </View>
            );
          })}
        </ScrollView>
      ) : null}
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.xs }}>
        <ServiceIconButton
          disabled={!undoAvailable}
          icon="arrow-undo"
          label={copy.undo}
          onPress={onUndo}
          size="compact"
        />
        <ServiceIconButton
          disabled={!repeatAvailable}
          icon="repeat"
          label={copy.repeatLastOrder}
          onPress={onRepeat}
          size="compact"
        />
        <ServiceIconButton
          disabled={draft.length === 0}
          icon="trash-outline"
          label={copy.clearDraft}
          onPress={onClear}
          size="compact"
        />
        <ServiceButton
          disabled={draft.length === 0}
          fullWidth={compact}
          icon="paper-plane"
          label={copy.sendOrder}
          loading={submitting}
          onPress={onSend}
          size="large"
          style={{ flex: 1 }}
          variant="accent"
        />
      </View>
    </View>
  );
}

export function DraftSheet({
  draft,
  visible,
  currencyCode,
  language,
  copy,
  onChangeQuantity,
  onRemove,
  onClose,
}: {
  readonly draft: readonly DraftOrderLine[];
  readonly visible: boolean;
  readonly currencyCode: string;
  readonly language: Language;
  readonly copy: WorkspaceCopy;
  readonly onChangeQuantity: (lineId: string, delta: number) => void;
  readonly onRemove: (lineId: string) => void;
  readonly onClose: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <WorkspaceModal title={copy.editDraft} visible={visible} onClose={onClose}>
      {draft.length === 0 ? (
        <Text
          style={[
            tokens.typography.body,
            { color: tokens.colors.textSubtle, marginBottom: tokens.space.sm },
          ]}
        >
          {copy.draftEmpty}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 420 }}>
          {draft.map((line) => {
            const selectedOptions = line.product.modifierGroups
              .flatMap((group) => group.options)
              .filter((option) => line.selectedOptionIds.includes(option.id));
            return (
              <View
                key={line.id}
                style={{
                  alignItems: 'center',
                  borderBottomColor: tokens.colors.borderLight,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  gap: tokens.space.sm,
                  paddingVertical: tokens.space.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                    {line.product.name}
                  </Text>
                  {selectedOptions.map((option) => (
                    <Text
                      key={option.id}
                      style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                    >
                      + {option.name}
                    </Text>
                  ))}
                  {line.note ? (
                    <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
                      {copy.note}: {line.note}
                    </Text>
                  ) : null}
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                    {formatMoney(draftLineTotal(line), currencyCode, language)}
                  </Text>
                </View>
                <QuantityStepper
                  decreaseLabel={`${copy.decrease}: ${line.product.name}`}
                  increaseLabel={`${copy.increase}: ${line.product.name}`}
                  onDecrease={() => onChangeQuantity(line.id, -1)}
                  onIncrease={() => onChangeQuantity(line.id, 1)}
                  quantity={line.quantity}
                />
                <ServiceIconButton
                  icon="trash-outline"
                  label={`${copy.clearDraft}: ${line.product.name}`}
                  onPress={() => onRemove(line.id)}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
      <ModalActions cancel={copy.close} onCancel={onClose} />
    </WorkspaceModal>
  );
}
