import type { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  ServiceButton,
  ServiceEmptyState,
  ServiceIconButton,
  ServiceStatusPill,
  ServiceSurface,
} from '../../../design-system';
import { FulfillmentGroup, OrderItem, calculateOrderItemTotal } from '../../../domain';
import type { TableWorkspaceSnapshot } from '../workspaceModel';
import { QuantityStepper } from '../../../components/QuantityStepper';
import type { Language } from '../../../i18n';
import type { WorkspaceCopy } from '../workspaceCopy';
import { conflictNote, formatMoney, timeOnly } from '../workspaceFormat';
import { isFullyServed, servedCount, type OrderView } from '../fulfillment';
import { Chip } from './WorkspaceChrome';

/**
 * Açık hesabın sipariş satırları: gruplama, servis işaretleme ve satır eylemleri.
 */

export function OrderPane({
  checkName,
  checkTotal,
  items,
  allItems,
  itemGroups,
  modifiers,
  conflicts,
  waiterNames,
  copy,
  language,
  currencyCode,
  orderView,
  orderViewCounts,
  onOrderViewChange,
  onMarkDrinksDelivered,
  onMarkAllServed,
  fulfillmentSplitEnabled,
  drinksReminderEnabled,
  onCancel,
  onChangeQuantity,
  onEditNote,
  onServeStatus,
  onPay,
  onResolveConflict,
  onSplit,
  splitEnabled,
}: {
  readonly checkName: string;
  readonly checkTotal: number;
  readonly items: readonly OrderItem[];
  /** Filtrelenmemiş tam liste: parti numaralandırması aktif görünüme göre kaymasın diye. */
  readonly allItems: readonly OrderItem[];
  readonly itemGroups: Readonly<Record<string, FulfillmentGroup>>;
  readonly modifiers: TableWorkspaceSnapshot['orderItemModifiers'];
  readonly conflicts: TableWorkspaceSnapshot['conflicts'];
  readonly waiterNames: Readonly<Record<string, string>>;
  readonly copy: WorkspaceCopy;
  readonly language: Language;
  readonly currencyCode: string;
  readonly orderView: OrderView;
  readonly orderViewCounts: Readonly<Record<OrderView, number>>;
  readonly onOrderViewChange: (view: OrderView) => void;
  readonly onMarkDrinksDelivered: () => void;
  readonly onMarkAllServed: () => void;
  readonly fulfillmentSplitEnabled: boolean;
  readonly drinksReminderEnabled: boolean;
  readonly onCancel: (item: OrderItem) => void;
  readonly onChangeQuantity: (item: OrderItem, nextQuantity: number) => void;
  readonly onEditNote: (item: OrderItem) => void;
  /** Kısmi servis panelini açar — uzun basış ve satırdaki servis ikonu aynı hedefe gider. */
  readonly onServeStatus: (item: OrderItem) => void;
  readonly onPay: () => void;
  readonly onResolveConflict: (
    item: OrderItem,
    conflict: TableWorkspaceSnapshot['conflicts'][number],
    resolution: 'server' | 'local',
  ) => void;
  readonly onSplit: () => void;
  readonly splitEnabled: boolean;
}) {
  const { tokens } = useTheme();
  const hasLiveItems = items.some((item) => item.status !== 'cancelled');
  const hasPendingItems = items.some((item) => item.status === 'ordered');
  const batchNumberById = new Map<string, number>();
  allItems.forEach((item) => {
    if (!batchNumberById.has(item.orderBatchId)) {
      batchNumberById.set(item.orderBatchId, batchNumberById.size + 1);
    }
  });
  const viewOptions: readonly {
    value: OrderView;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { value: 'all', label: copy.allItems, icon: 'list-outline' },
    { value: 'kitchen', label: copy.kitchen, icon: 'restaurant-outline' },
    { value: 'drinks', label: copy.drinks, icon: 'cafe-outline' },
    { value: 'new', label: copy.newItems, icon: 'sparkles-outline' },
  ];
  return (
    <ServiceSurface padding="none" style={{ flex: 1, minWidth: 0 }}>
      {fulfillmentSplitEnabled ? (
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          contentContainerStyle={{
            alignItems: 'center',
            gap: tokens.space.xs,
            padding: tokens.space.sm,
          }}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
        >
          {viewOptions.map((option) => (
            <Chip
              key={option.value}
              icon={option.icon}
              label={`${option.label} (${orderViewCounts[option.value]})`}
              role="tab"
              selected={orderView === option.value}
              onPress={() => onOrderViewChange(option.value)}
            />
          ))}
        </ScrollView>
      ) : null}
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: tokens.colors.borderLight,
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: tokens.space.md,
        }}
      >
        <View>
          <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>
            {checkName}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {items.length} {copy.lines}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: tokens.space.xs }}>
          <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
            {formatMoney(checkTotal, currencyCode, language)}
          </Text>
          {hasLiveItems ? (
            <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
              {splitEnabled ? (
                <ServiceButton
                  icon="git-branch-outline"
                  label={copy.splitCheck}
                  onPress={onSplit}
                  variant="outline"
                />
              ) : null}
              <ServiceButton icon="card-outline" label={copy.takePayment} onPress={onPay} />
            </View>
          ) : null}
        </View>
      </View>
      {items.length === 0 ? (
        <ServiceEmptyState body={copy.tapProduct} icon="restaurant-outline" title={copy.noOrders} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: tokens.space.sm }}
          renderItem={({ item, index }) => {
            const itemModifiers = modifiers.filter((modifier) => modifier.orderItemId === item.id);
            const conflict = conflicts.find(
              (candidate) =>
                candidate.entityId === item.id &&
                candidate.repository === 'orderItems' &&
                candidate.status === 'unresolved',
            );
            return (
              <Pressable
                accessibilityHint={copy.serveStatus}
                accessibilityRole="button"
                onLongPress={() => onServeStatus(item)}
                style={{
                  borderBottomColor: tokens.colors.borderLight,
                  borderBottomWidth: 1,
                  opacity: item.status === 'cancelled' ? 0.58 : 1,
                  paddingVertical: tokens.space.sm,
                }}
              >
                {index === 0 || items[index - 1]?.orderBatchId !== item.orderBatchId ? (
                  <Text
                    style={[
                      tokens.typography.caption,
                      { color: tokens.colors.primary, marginBottom: tokens.space.xs },
                    ]}
                  >
                    {batchNumberById.get(item.orderBatchId) === 1
                      ? copy.firstOrder
                      : `${copy.additionalOrder} ${batchNumberById.get(item.orderBatchId)! - 1}`}
                  </Text>
                ) : null}
                <View style={{ alignItems: 'flex-start', flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                      {item.quantity}× {item.nameSnapshot}
                    </Text>
                    {itemModifiers.map((modifier) => (
                      <Text
                        key={modifier.id}
                        style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                      >
                        + {modifier.modifierOptionNameSnapshot}
                      </Text>
                    ))}
                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: tokens.space.xxs,
                      }}
                    >
                      <ServiceStatusPill
                        label={itemGroups[item.id] === 'drinks' ? copy.drinks : copy.kitchen}
                        size="small"
                        tone={itemGroups[item.id] === 'drinks' ? 'info' : 'neutral'}
                      />
                      {item.status !== 'cancelled' ? (
                        isFullyServed(item) ? (
                          <ServiceStatusPill
                            icon="checkmark-done-outline"
                            label={copy.served}
                            size="small"
                            tone="success"
                          />
                        ) : (
                          <ServiceStatusPill
                            label={copy.servedCountLabel(servedCount(item), item.quantity)}
                            size="small"
                            tone={servedCount(item) > 0 ? 'warning' : 'neutral'}
                          />
                        )
                      ) : null}
                    </View>
                    {item.note ? (
                      <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
                        {copy.note}: {item.note}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.colors.textMuted, marginTop: tokens.space.xxs },
                      ]}
                    >
                      {waiterNames[item.createdBy] ?? copy.unknownWaiter} ·{' '}
                      {timeOnly(item.createdAt, language)}
                    </Text>
                    {item.status === 'ordered' ? (
                      <QuantityStepper
                        decreaseDisabled={item.quantity <= 1}
                        decreaseLabel={`${copy.decrease}: ${item.nameSnapshot}`}
                        increaseLabel={`${copy.increase}: ${item.nameSnapshot}`}
                        onDecrease={() => onChangeQuantity(item, item.quantity - 1)}
                        onIncrease={() => onChangeQuantity(item, item.quantity + 1)}
                        quantity={item.quantity}
                      />
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                      {formatMoney(
                        calculateOrderItemTotal(item, itemModifiers),
                        item.currencyCode,
                        language,
                      )}
                    </Text>
                    {item.status !== 'cancelled' ? (
                      <View style={{ flexDirection: 'row' }}>
                        {/*
                          Kalem ikonunun yerini servis ikonu aldi: uzun basis
                          gizli tek yol olmasin diye ayni panele goturen gorunur
                          bir hedef sart. Not duzenleme panelin icine tasindi.
                        */}
                        <ServiceIconButton
                          icon="restaurant-outline"
                          label={`${copy.serveStatus}: ${item.nameSnapshot}`}
                          onPress={() => onServeStatus(item)}
                        />
                        <ServiceIconButton
                          icon="close-circle-outline"
                          label={`${copy.cancelItem}: ${item.nameSnapshot}`}
                          onPress={() => onCancel(item)}
                        />
                      </View>
                    ) : (
                      <ServiceStatusPill label={copy.cancelled} tone="error" />
                    )}
                  </View>
                </View>
                {conflict ? (
                  <View
                    accessibilityRole="alert"
                    style={{
                      backgroundColor: tokens.colors.accentSoft,
                      borderColor: tokens.colors.warning,
                      borderRadius: tokens.radius.medium,
                      borderWidth: 1,
                      marginTop: tokens.space.sm,
                      padding: tokens.space.sm,
                    }}
                  >
                    <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                      {copy.noteConflict}
                    </Text>
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.colors.textSubtle, marginTop: tokens.space.xxs },
                      ]}
                    >
                      {copy.yourNote}: {conflictNote(conflict.localPayload) || copy.noNote}
                    </Text>
                    <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                      {copy.cloudNote}: {conflictNote(conflict.serverPayload) || copy.noNote}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: tokens.space.xs,
                        marginTop: tokens.space.sm,
                      }}
                    >
                      <ServiceButton
                        label={copy.useCloudNote}
                        onPress={() => onResolveConflict(item, conflict, 'server')}
                        variant="outline"
                      />
                      <ServiceButton
                        label={copy.keepMyNote}
                        onPress={() => onResolveConflict(item, conflict, 'local')}
                      />
                    </View>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
      {drinksReminderEnabled &&
      items.some((item) => item.status === 'ordered' && itemGroups[item.id] === 'drinks') ? (
        <View
          style={{
            backgroundColor: tokens.colors.state.pending.bg,
            borderColor: tokens.colors.state.pending.border,
            borderTopWidth: 1,
            padding: tokens.space.sm,
          }}
        >
          <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
            {copy.drinksReminder}
          </Text>
          <ServiceButton
            icon="checkmark-done-outline"
            label={copy.drinksDelivered}
            onPress={onMarkDrinksDelivered}
            style={{ marginTop: tokens.space.xs }}
            variant="outline"
          />
        </View>
      ) : null}
      {hasPendingItems ? (
        <View
          style={{
            borderColor: tokens.colors.borderLight,
            borderTopWidth: 1,
            padding: tokens.space.sm,
          }}
        >
          <ServiceButton
            icon="checkmark-done-outline"
            label={copy.markAllItemsServed}
            onPress={onMarkAllServed}
            variant="outline"
          />
        </View>
      ) : null}
    </ServiceSurface>
  );
}
