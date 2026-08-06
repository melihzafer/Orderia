import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateId } from '../constants/branding';
import { QuantityStepper } from '../components/QuantityStepper';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceButton,
  ServiceConfirmSheet,
  ServiceEmptyState,
  ServiceIconButton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
  useSnackbar,
} from '../design-system';
import { useLocalization } from '../i18n';
import { Translation } from '../i18n/languages';
import { RootStackParamList } from '../navigation/routes';
import { useHistoryStore, useLayoutStore, useMenuStore, useOrderStore } from '../stores';
import { MenuItem, Ticket, TicketLine } from '../types';
import { createTextMatcher } from '../utils/searchUtils';

type TableDetailRoute = RouteProp<RootStackParamList, 'TableDetail'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface LocalDraftLine {
  readonly id: string;
  readonly item: MenuItem;
  readonly quantity: number;
  readonly note?: string;
}

const localCancellationReasons = [
  'Müşteri vazgeçti',
  'Yanlış ürün girildi',
  'Mutfakta mevcut değil',
] as const;

export default function LegacyTableDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<TableDetailRoute>();
  const { tokens } = useTheme();
  const { t, formatPrice } = useLocalization();
  const layout = useAdaptiveLayout();
  const table = useLayoutStore((state) =>
    state.tables.find((candidate) => candidate.id === route.params.tableId),
  );
  const categories = useMenuStore((state) => state.categories);
  const menuItems = useMenuStore((state) => state.menuItems);
  const openTickets = useOrderStore((state) => state.openTickets);
  const openTable = useOrderStore((state) => state.openTable);
  const addTicketLine = useOrderStore((state) => state.addTicketLine);
  const updateTicketLine = useOrderStore((state) => state.updateTicketLine);
  const updateLineQuantity = useOrderStore((state) => state.updateLineQuantity);
  const moveTicketLine = useOrderStore((state) => state.moveTicketLine);
  const payTicket = useOrderStore((state) => state.payTicket);
  const updateTicketName = useOrderStore((state) => state.updateTicketName);
  const deleteTicket = useOrderStore((state) => state.deleteTicket);
  const dailyHistory = useHistoryStore((state) => state.dailyHistory);
  const updateHistoricalTicket = useHistoryStore((state) => state.updateHistoricalTicket);
  const tickets = useMemo(
    () =>
      Object.values(openTickets)
        .filter((ticket) => ticket.tableId === route.params.tableId)
        .sort((left, right) => left.createdAt - right.createdAt),
    [openTickets, route.params.tableId],
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string>();
  const [pendingDeleteTicketId, setPendingDeleteTicketId] = useState<string>();
  const { show } = useSnackbar();
  const [pendingTicketName, setPendingTicketName] = useState('');
  const [newTicketName, setNewTicketName] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [draft, setDraft] = useState<readonly LocalDraftLine[]>([]);
  const [history, setHistory] = useState<readonly (readonly LocalDraftLine[])[]>([]);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [compactPalette, setCompactPalette] = useState(true);
  const [noteProduct, setNoteProduct] = useState<MenuItem>();
  const [note, setNote] = useState('');
  const [cancelling, setCancelling] = useState<TicketLine>();
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [lineActions, setLineActions] = useState<TicketLine>();
  const [ticketActions, setTicketActions] = useState<Ticket>();
  const [ticketNameInput, setTicketNameInput] = useState('');
  const [editingLineNote, setEditingLineNote] = useState<TicketLine>();
  const [movingLine, setMovingLine] = useState<TicketLine>();
  const [moveQuantity, setMoveQuantity] = useState(1);
  const [moveAccountName, setMoveAccountName] = useState('');
  const [paymentTicket, setPaymentTicket] = useState<Ticket>();
  const [editingPaymentTicket, setEditingPaymentTicket] = useState<Ticket>();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId);
  const paidTickets = useMemo(
    () =>
      Object.values(dailyHistory)
        .flatMap((day) => day.tickets)
        .filter((ticket) => ticket.tableId === route.params.tableId && ticket.status === 'paid')
        .sort((left, right) => (right.closedAt ?? 0) - (left.closedAt ?? 0)),
    [dailyHistory, route.params.tableId],
  );
  const activeItems = useMemo(() => {
    const matcher = createTextMatcher(query);
    return menuItems.filter(
      (item) =>
        item.isActive &&
        (categoryId === 'all' || item.categoryId === categoryId) &&
        matcher(item.name),
    );
  }, [categoryId, menuItems, query]);
  const compact = layout.mode === 'compact';
  const draftTotal = draft.reduce((total, line) => total + line.item.price * line.quantity, 0);
  const ticketTotal =
    selectedTicket?.lines
      .filter((line) => line.status !== 'cancelled')
      .reduce((total, line) => total + line.priceSnapshot * line.quantity, 0) ?? 0;
  const paymentTarget = paymentTicket ?? editingPaymentTicket;
  const paymentTotal = paymentTarget
    ? paymentTarget.lines
        .filter((line) => line.status !== 'cancelled')
        .reduce((total, line) => total + line.priceSnapshot * line.quantity, 0)
    : 0;
  const receivedMinor = paymentMethod === 'card' ? paymentTotal : parseMoneyInput(amountReceived);
  const changeMinor = Math.max(0, receivedMinor - paymentTotal);

  useEffect(() => {
    if (!selectedTicketId && !pendingTicketName && tickets[0]) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [pendingTicketName, selectedTicketId, tickets]);

  const remember = (next: readonly LocalDraftLine[]) => {
    setHistory((current) => [...current.slice(-19), draft]);
    setDraft(next);
  };

  const addProduct = (item: MenuItem, itemNote = '') => {
    const normalizedNote = itemNote.trim();
    const index = draft.findIndex(
      (line) => line.item.id === item.id && (line.note ?? '') === normalizedNote,
    );
    if (index >= 0) {
      remember(
        draft.map((line, lineIndex) =>
          lineIndex === index ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      );
    } else {
      remember([
        ...draft,
        {
          id: generateId(),
          item,
          quantity: 1,
          ...(normalizedNote ? { note: normalizedNote } : {}),
        },
      ]);
    }
  };

  const changeDraftQuantity = (lineId: string, delta: number) => {
    remember(
      draft
        .map((line) => (line.id === lineId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  const decrementDraftProduct = (item: MenuItem) => {
    // En son eklenen (notlu satırlar dahil) eşleşen satırı azalt
    const index = draft.reduce(
      (found, line, lineIndex) => (line.item.id === item.id ? lineIndex : found),
      -1,
    );
    if (index >= 0) {
      changeDraftQuantity(draft[index].id, -1);
    }
  };

  const removeDraftLine = (lineId: string) => {
    remember(draft.filter((line) => line.id !== lineId));
  };

  const repeatTicketLines = () => {
    if (!selectedTicket) return;
    const lines = selectedTicket.lines.filter((line) => line.status !== 'cancelled');
    if (lines.length === 0) return;
    const additions = lines.flatMap((line) => {
      const item = menuItems.find((candidate) => candidate.id === line.menuItemId);
      if (!item || !item.isActive) return [];
      return [
        {
          id: generateId(),
          item,
          quantity: line.quantity,
          ...(line.note ? { note: line.note } : {}),
        },
      ];
    });
    if (additions.length > 0) {
      remember([...draft, ...additions]);
    }
  };

  const appendNotePreset = (preset: string) => {
    setNote((current) => {
      const trimmed = current.trim();
      if (!trimmed) return preset;
      if (trimmed.toLocaleLowerCase('tr').includes(preset.toLocaleLowerCase('tr'))) {
        return trimmed;
      }
      return `${trimmed}, ${preset}`;
    });
  };

  const sendDraft = () => {
    if (!table || draft.length === 0) return;
    try {
      const ticket =
        selectedTicket ??
        openTable(table.id, pendingTicketName.trim() || `${t.orderName} ${tickets.length + 1}`);
      draft.forEach((line) => {
        addTicketLine(ticket.id, {
          menuItemId: line.item.id,
          quantity: line.quantity,
          ...(line.note ? { note: line.note } : {}),
          createdByName: t.deviceOnly,
        });
      });
      setSelectedTicketId(ticket.id);
      setPendingTicketName('');
      setDraft([]);
      setHistory([]);
      setCompactPalette(false);
    } catch {
      haptic('error');
      show({ message: t.genericError, tone: 'error' });
    }
  };

  const openPayment = (ticket: Ticket) => {
    const total = ticket.lines
      .filter((line) => line.status !== 'cancelled')
      .reduce((sum, line) => sum + line.priceSnapshot * line.quantity, 0);
    setPaymentTicket(ticket);
    setEditingPaymentTicket(undefined);
    setPaymentMethod('cash');
    setAmountReceived((total / 100).toFixed(2));
    setPaymentError('');
  };

  const openPaymentEdit = (ticket: Ticket) => {
    setEditingPaymentTicket(ticket);
    setPaymentTicket(undefined);
    setPaymentMethod(ticket.paymentInfo?.paymentMethod ?? 'cash');
    setAmountReceived(
      ((ticket.paymentInfo?.amountReceived ?? ticket.paymentInfo?.total ?? 0) / 100).toFixed(2),
    );
    setPaymentError('');
  };

  const savePayment = () => {
    if (!paymentTarget) return;
    if (paymentMethod === 'cash' && receivedMinor < paymentTotal) {
      setPaymentError(t.insufficientFunds);
      return;
    }
    const paymentInfo = {
      total: paymentTotal,
      paymentMethod,
      ...(paymentMethod === 'cash'
        ? { amountReceived: receivedMinor, change: changeMinor }
        : { amountReceived: paymentTotal, change: 0 }),
    } as const;
    if (paymentTicket) {
      payTicket(paymentTicket.id, paymentInfo);
      const nextOpenTicket = tickets.find((ticket) => ticket.id !== paymentTicket.id);
      setSelectedTicketId(nextOpenTicket?.id);
      setPaymentTicket(undefined);
    } else {
      updateHistoricalTicket(paymentTarget.id, paymentInfo);
      setEditingPaymentTicket(undefined);
      haptic('success');
      show({ message: t.paymentUpdated, tone: 'success' });
    }
    setPaymentError('');
  };

  const moveLineToAccount = (targetTicket: Ticket) => {
    if (!selectedTicket || !movingLine) return;
    try {
      moveTicketLine(selectedTicket.id, movingLine.id, targetTicket.id, moveQuantity);
      setMovingLine(undefined);
      setMoveAccountName('');
      setMoveQuantity(1);
    } catch {
      haptic('error');
      show({ message: t.genericError, tone: 'error' });
    }
  };

  const createAccountAndMoveLine = () => {
    if (!table || !selectedTicket || !movingLine || !moveAccountName.trim()) return;
    const target = openTable(table.id, moveAccountName.trim());
    moveLineToAccount(target);
  };

  if (!table) {
    return (
      <SafeAreaView style={{ backgroundColor: tokens.colors.bg, flex: 1 }}>
        <ServiceEmptyState
          action={{ label: t.back, onPress: navigation.goBack }}
          body={t.tableNotFound}
          icon="alert-circle-outline"
          title={t.error}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          minHeight: 64,
          paddingHorizontal: tokens.space.md,
        }}
      >
        <ServiceIconButton icon="arrow-back" label={t.back} onPress={navigation.goBack} />
        <Text
          numberOfLines={1}
          style={[
            tokens.typography.subtitle,
            {
              color: tokens.colors.text,
              flex: 1,
              marginHorizontal: tokens.space.sm,
            },
          ]}
        >
          {table.label || `${t.table} ${table.seq}`}
        </Text>
        <ServiceStatusPill label={t.deviceOnly} tone="warning" />
      </View>

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.space.xs,
          paddingBottom: tokens.space.sm,
          paddingHorizontal: tokens.space.md,
        }}
      >
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          contentContainerStyle={{ alignItems: 'center', gap: tokens.space.xs }}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1, minWidth: 0 }}
        >
          {tickets.map((ticket, index) => (
            <LocalChip
              key={ticket.id}
              label={ticket.name || `${t.orderName} ${index + 1}`}
              onLongPress={() => {
                setTicketActions(ticket);
                setTicketNameInput(ticket.name ?? '');
              }}
              role="tab"
              onPress={() => {
                setPendingTicketName('');
                setSelectedTicketId(ticket.id);
              }}
              selected={ticket.id === selectedTicketId}
            />
          ))}
          {pendingTicketName ? (
            <LocalChip
              label={pendingTicketName}
              role="tab"
              onPress={() => setSelectedTicketId(undefined)}
              selected={!selectedTicketId}
            />
          ) : null}
        </ScrollView>
        <ServiceButton
          icon="add"
          label={t.addOrder}
          onPress={() => {
            setNewTicketName('');
            setShowTicketModal(true);
          }}
          style={{ flexShrink: 0 }}
          variant="outline"
        />
      </View>

      {paidTickets.length > 0 ? (
        <View style={{ gap: tokens.space.xs, paddingBottom: tokens.space.sm }}>
          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textSubtle, paddingHorizontal: tokens.space.md },
            ]}
          >
            {t.paidOrders}
          </Text>
          <ScrollView
            horizontal
            contentContainerStyle={{ gap: tokens.space.xs, paddingHorizontal: tokens.space.md }}
            showsHorizontalScrollIndicator={false}
          >
            {paidTickets.map((ticket) => (
              <LocalChip
                key={ticket.id}
                label={`${ticket.name || t.orderName} · ${formatPrice(
                  ticket.paymentInfo?.total ?? 0,
                )}`}
                onPress={() => openPaymentEdit(ticket)}
                selected={false}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {compact ? (
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            paddingBottom: tokens.space.xs,
            paddingHorizontal: tokens.space.md,
          }}
        >
          <LocalSegment
            icon="receipt-outline"
            label={`${t.orders} (${selectedTicket?.lines.length ?? 0})`}
            onPress={() => setCompactPalette(false)}
            selected={!compactPalette}
          />
          <LocalSegment
            icon="fast-food-outline"
            label={`${t.menu} (${draft.reduce((sum, line) => sum + line.quantity, 0)})`}
            onPress={() => setCompactPalette(true)}
            selected={compactPalette}
          />
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          flexDirection: compact ? 'column' : 'row',
          gap: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
        }}
      >
        {!compact || !compactPalette ? (
          <ServiceSurface padding="none" style={{ flex: 1, minWidth: 0 }}>
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
                  {selectedTicket?.name || pendingTicketName || t.newOrder}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {selectedTicket?.lines.length ?? 0} {t.itemsFound}
                </Text>
              </View>
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {formatPrice(ticketTotal)}
              </Text>
            </View>
            {selectedTicket && selectedTicket.lines.some((line) => line.status !== 'cancelled') ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: tokens.space.xs,
                  paddingHorizontal: tokens.space.md,
                  paddingBottom: tokens.space.sm,
                }}
              >
                <ServiceButton
                  label={t.splitOrder}
                  onPress={() =>
                    setLineActions(selectedTicket.lines.find((line) => line.status !== 'cancelled'))
                  }
                  style={{ flex: 1 }}
                  variant="outline"
                />
                <ServiceButton
                  label={t.makePayment}
                  onPress={() => openPayment(selectedTicket)}
                  style={{ flex: 1 }}
                  variant="accent"
                />
              </View>
            ) : null}
            {!selectedTicket || selectedTicket.lines.length === 0 ? (
              <ServiceEmptyState
                body={t.tapToAddItem}
                icon="restaurant-outline"
                title={t.noOrdersYet}
              />
            ) : (
              <FlatList
                contentContainerStyle={{ padding: tokens.space.sm }}
                data={selectedTicket.lines}
                keyExtractor={(line) => line.id}
                renderItem={({ item: line }) => (
                  <Pressable
                    accessibilityHint={t.editDraft}
                    accessibilityRole="button"
                    onLongPress={() => setLineActions(line)}
                    style={{
                      borderBottomColor: tokens.colors.borderLight,
                      borderBottomWidth: 1,
                      opacity: line.status === 'cancelled' ? 0.58 : 1,
                      paddingVertical: tokens.space.sm,
                    }}
                  >
                    <View style={{ alignItems: 'flex-start', flexDirection: 'row' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                          {line.quantity}× {line.nameSnapshot}
                        </Text>
                        {line.note ? (
                          <Text
                            style={[tokens.typography.caption, { color: tokens.colors.warning }]}
                          >
                            {t.note}: {line.note}
                          </Text>
                        ) : null}
                        <Text
                          style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}
                        >
                          {line.createdByName || t.deviceOnly}
                          {line.cancellationReason ? ` · ${line.cancellationReason}` : ''}
                        </Text>
                        {line.status === 'pending' && selectedTicket ? (
                          <QuantityStepper
                            decreaseLabel={`${t.decrease}: ${line.nameSnapshot}`}
                            increaseLabel={`${t.increase}: ${line.nameSnapshot}`}
                            onDecrease={() =>
                              updateLineQuantity(selectedTicket.id, line.id, line.quantity - 1)
                            }
                            onIncrease={() =>
                              updateLineQuantity(selectedTicket.id, line.id, line.quantity + 1)
                            }
                            quantity={line.quantity}
                          />
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                          {formatPrice(line.priceSnapshot * line.quantity)}
                        </Text>
                        {line.status !== 'cancelled' ? (
                          <ServiceIconButton
                            icon="close-circle-outline"
                            label={`${t.cancel}: ${line.nameSnapshot}`}
                            onPress={() => setCancelling(line)}
                          />
                        ) : (
                          <ServiceStatusPill label={t.cancelled} tone="error" />
                        )}
                      </View>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </ServiceSurface>
        ) : null}

        {!compact || compactPalette ? (
          <ServiceSurface padding="none" style={{ flex: 1.2, minWidth: 0 }}>
            <View style={{ padding: tokens.space.sm }}>
              <ServiceTextField
                label={t.searchProducts}
                onChangeText={setQuery}
                returnKeyType="search"
                value={query}
              />
              <ScrollView
                horizontal
                accessibilityRole="tablist"
                contentContainerStyle={{ gap: tokens.space.xs, paddingTop: tokens.space.sm }}
                showsHorizontalScrollIndicator={false}
              >
                <LocalChip
                  label={t.allCategories}
                  role="tab"
                  onPress={() => setCategoryId('all')}
                  selected={categoryId === 'all'}
                />
                {categories.map((category) => (
                  <LocalChip
                    key={category.id}
                    label={category.name}
                    role="tab"
                    onPress={() => setCategoryId(category.id)}
                    selected={categoryId === category.id}
                  />
                ))}
              </ScrollView>
            </View>
            {activeItems.length === 0 ? (
              <ServiceEmptyState
                body={t.selectDifferentCategory}
                icon="search-outline"
                title={t.noItemsFound}
              />
            ) : (
              <FlatList
                contentContainerStyle={{ padding: tokens.space.xs }}
                data={activeItems}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => {
                  const count = draft
                    .filter((line) => line.item.id === item.id)
                    .reduce((total, line) => total + line.quantity, 0);
                  return (
                    <View style={{ flex: 1, maxWidth: '50%', padding: tokens.space.xxs }}>
                      <Pressable
                        accessibilityHint={t.addNoteHint}
                        accessibilityLabel={`${item.name}, ${formatPrice(item.price)}`}
                        accessibilityRole="button"
                        onLongPress={() => {
                          setNote('');
                          setNoteProduct(item);
                        }}
                        onPress={() => addProduct(item)}
                        style={({ pressed }) => ({
                          backgroundColor: pressed
                            ? tokens.colors.accentSoft
                            : tokens.colors.surfaceAlt,
                          borderColor: count > 0 ? tokens.colors.accent : tokens.colors.border,
                          borderRadius: tokens.radius.medium,
                          borderWidth: count > 0 ? 2 : 1,
                          minHeight: 92,
                          padding: tokens.space.sm,
                        })}
                      >
                        <Text
                          numberOfLines={2}
                          style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}
                        >
                          {item.name}
                        </Text>
                        <View
                          style={{
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginTop: 'auto',
                          }}
                        >
                          <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
                            {formatPrice(item.price)}
                          </Text>
                          {count > 0 ? (
                            <QuantityStepper
                              compact
                              decreaseLabel={`${t.decrease}: ${item.name}`}
                              increaseLabel={`${t.increase}: ${item.name}`}
                              onDecrease={() => decrementDraftProduct(item)}
                              onIncrease={() => addProduct(item)}
                              quantity={count}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    </View>
                  );
                }}
              />
            )}
          </ServiceSurface>
        ) : null}
      </View>

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
          accessibilityHint={t.editDraft}
          accessibilityRole="button"
          disabled={draft.length === 0}
          onPress={() => setShowDraftModal(true)}
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            minHeight: 48,
            paddingHorizontal: compact ? tokens.space.xs : tokens.space.sm,
          }}
        >
          <Text style={[tokens.typography.label, { color: tokens.colors.textSubtle }]}>
            {draft.reduce((sum, line) => sum + line.quantity, 0)} {t.itemsFound}
          </Text>
          <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
            {formatPrice(draftTotal)}
          </Text>
        </Pressable>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.xs }}>
          <ServiceIconButton
            disabled={history.length === 0}
            icon="arrow-undo"
            label={t.back}
            onPress={() => {
              const previous = history.at(-1);
              if (!previous) return;
              setDraft(previous);
              setHistory((current) => current.slice(0, -1));
            }}
          />
          <ServiceIconButton
            disabled={
              !selectedTicket ||
              selectedTicket.lines.filter((line) => line.status !== 'cancelled').length === 0
            }
            icon="repeat"
            label={t.repeatLastOrder}
            onPress={repeatTicketLines}
          />
          <ServiceIconButton
            disabled={draft.length === 0}
            icon="trash-outline"
            label={t.delete}
            onPress={() => remember([])}
          />
          <ServiceButton
            disabled={draft.length === 0}
            fullWidth={compact}
            icon="paper-plane"
            label={t.addOrder}
            onPress={sendDraft}
            size="large"
            style={{ flex: 1 }}
            variant="accent"
          />
        </View>
      </View>

      <LocalModal
        onClose={() => setShowTicketModal(false)}
        title={t.newOrder}
        visible={showTicketModal}
      >
        <ServiceTextField
          autoFocus
          label={t.orderName}
          maxLength={80}
          onChangeText={setNewTicketName}
          value={newTicketName}
        />
        <LocalModalActions
          confirmDisabled={!newTicketName.trim()}
          confirmLabel={t.add}
          onCancel={() => setShowTicketModal(false)}
          onConfirm={() => {
            setPendingTicketName(newTicketName.trim());
            setSelectedTicketId(undefined);
            setShowTicketModal(false);
          }}
        />
      </LocalModal>

      <LocalModal
        onClose={() => setNoteProduct(undefined)}
        title={noteProduct?.name ?? ''}
        visible={Boolean(noteProduct)}
      >
        <ServiceTextField
          autoFocus
          label={t.addNote}
          maxLength={500}
          multiline
          onChangeText={setNote}
          placeholder={t.addNoteHint}
          value={note}
        />
        <Text
          style={[
            tokens.typography.caption,
            { color: tokens.colors.textSubtle, marginBottom: tokens.space.xxs },
          ]}
        >
          {t.quickNotes}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.space.xs,
            marginBottom: tokens.space.sm,
          }}
        >
          {notePresets(t).map((preset) => (
            <LocalChip
              key={preset}
              label={preset}
              onPress={() => appendNotePreset(preset)}
              selected={false}
            />
          ))}
        </View>
        <LocalModalActions
          confirmLabel={t.addItem}
          onCancel={() => setNoteProduct(undefined)}
          onConfirm={() => {
            if (noteProduct) addProduct(noteProduct, note);
            setNoteProduct(undefined);
          }}
        />
      </LocalModal>

      <LocalModal
        onClose={() => setShowDraftModal(false)}
        title={t.editDraft}
        visible={showDraftModal}
      >
        {draft.length === 0 ? (
          <Text
            style={[
              tokens.typography.body,
              { color: tokens.colors.textSubtle, marginBottom: tokens.space.sm },
            ]}
          >
            {t.draftEmpty}
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 420 }}>
            {draft.map((line) => (
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
                    {line.item.name}
                  </Text>
                  {line.note ? (
                    <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
                      {t.note}: {line.note}
                    </Text>
                  ) : null}
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                    {formatPrice(line.item.price * line.quantity)}
                  </Text>
                </View>
                <QuantityStepper
                  decreaseLabel={`${t.decrease}: ${line.item.name}`}
                  increaseLabel={`${t.increase}: ${line.item.name}`}
                  onDecrease={() => changeDraftQuantity(line.id, -1)}
                  onIncrease={() => changeDraftQuantity(line.id, 1)}
                  quantity={line.quantity}
                />
                <ServiceIconButton
                  icon="trash-outline"
                  label={`${t.delete}: ${line.item.name}`}
                  onPress={() => removeDraftLine(line.id)}
                />
              </View>
            ))}
          </ScrollView>
        )}
        <LocalModalActions onCancel={() => setShowDraftModal(false)} />
      </LocalModal>

      <LocalModal
        onClose={() => setCancelling(undefined)}
        title={`${t.cancel}: ${cancelling?.nameSnapshot ?? ''}`}
        visible={Boolean(cancelling)}
      >
        <Text
          style={[
            tokens.typography.body,
            { color: tokens.colors.textSubtle, marginBottom: tokens.space.sm },
          ]}
        >
          {t.orderNotes}
        </Text>
        <View style={{ gap: tokens.space.xs }}>
          {localCancellationReasons.map((reason) => (
            <ServiceButton
              key={reason}
              fullWidth
              label={reason}
              onPress={() => {
                if (selectedTicket && cancelling) {
                  updateTicketLine(selectedTicket.id, cancelling.id, {
                    status: 'cancelled',
                    cancellationReason: reason,
                  });
                }
                setCancelling(undefined);
              }}
              variant="outline"
            />
          ))}
        </View>
        <LocalModalActions onCancel={() => setCancelling(undefined)} />
      </LocalModal>

      <LocalActionSheet
        onClose={() => setTicketActions(undefined)}
        title={ticketActions?.name || t.orderName}
        visible={Boolean(ticketActions)}
      >
        {ticketActions ? (
          <>
            <ServiceTextField
              label={t.orderName}
              maxLength={80}
              onChangeText={setTicketNameInput}
              value={ticketNameInput}
            />
            <ServiceButton
              disabled={!ticketNameInput.trim()}
              fullWidth
              label={t.save}
              onPress={() => {
                updateTicketName(ticketActions.id, ticketNameInput.trim());
                setTicketActions(undefined);
              }}
            />
            <ServiceButton
              fullWidth
              label={t.deleteOrder}
              onPress={() => {
                const ticketId = ticketActions.id;
                setTicketActions(undefined);
                setPendingDeleteTicketId(ticketId);
              }}
              variant="danger"
            />
          </>
        ) : null}
      </LocalActionSheet>

      <LocalActionSheet
        onClose={() => setLineActions(undefined)}
        title={lineActions?.nameSnapshot ?? t.orderNotes}
        visible={Boolean(lineActions)}
      >
        {lineActions ? (
          <>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {lineActions.quantity}×{' '}
              {formatPrice(lineActions.priceSnapshot * lineActions.quantity)}
            </Text>
            <View style={{ gap: tokens.space.xs, marginTop: tokens.space.md }}>
              <ServiceButton
                fullWidth
                label={lineActions.note ? `${t.edit}: ${t.note}` : t.addNote}
                onPress={() => {
                  setEditingLineNote(lineActions);
                  setNote(lineActions.note ?? '');
                  setLineActions(undefined);
                }}
                variant="outline"
              />
              <ServiceButton
                fullWidth
                label={t.moveToOrder}
                onPress={() => {
                  setMovingLine(lineActions);
                  setMoveQuantity(1);
                  setMoveAccountName('');
                  setLineActions(undefined);
                }}
                variant="outline"
              />
              {lineActions.status !== 'cancelled' ? (
                <ServiceButton
                  fullWidth
                  label={t.cancel}
                  onPress={() => {
                    setCancelling(lineActions);
                    setLineActions(undefined);
                  }}
                  variant="ghost"
                />
              ) : null}
            </View>
          </>
        ) : null}
      </LocalActionSheet>

      <LocalActionSheet
        onClose={() => setEditingLineNote(undefined)}
        title={`${t.edit}: ${editingLineNote?.nameSnapshot ?? t.note}`}
        visible={Boolean(editingLineNote)}
      >
        <ServiceTextField
          autoFocus
          label={t.addNote}
          maxLength={500}
          multiline
          onChangeText={setNote}
          placeholder={t.addNoteHint}
          value={note}
        />
        <View style={{ flexDirection: 'row', gap: tokens.space.xs, marginTop: tokens.space.md }}>
          <ServiceButton
            label={t.close}
            onPress={() => setEditingLineNote(undefined)}
            style={{ flex: 1 }}
            variant="ghost"
          />
          <ServiceButton
            label={t.save}
            onPress={() => {
              if (selectedTicket && editingLineNote) {
                updateTicketLine(selectedTicket.id, editingLineNote.id, {
                  note: note.trim() || undefined,
                });
              }
              setEditingLineNote(undefined);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </LocalActionSheet>

      <LocalActionSheet
        onClose={() => setMovingLine(undefined)}
        title={t.moveToOrder}
        visible={Boolean(movingLine)}
      >
        {movingLine ? (
          <>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {movingLine.nameSnapshot} · {t.quantity}: {movingLine.quantity}
            </Text>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                {t.quantity}
              </Text>
              <QuantityStepper
                decreaseDisabled={moveQuantity <= 1}
                decreaseLabel={`${t.decrease}: ${movingLine.nameSnapshot}`}
                increaseDisabled={moveQuantity >= movingLine.quantity}
                increaseLabel={`${t.increase}: ${movingLine.nameSnapshot}`}
                onDecrease={() => setMoveQuantity((value) => Math.max(1, value - 1))}
                onIncrease={() =>
                  setMoveQuantity((value) => Math.min(movingLine.quantity, value + 1))
                }
                quantity={moveQuantity}
              />
            </View>
            <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
              {t.moveToOrder}
            </Text>
            <View style={{ gap: tokens.space.xs }}>
              {tickets
                .filter((ticket) => ticket.id !== selectedTicket?.id)
                .map((ticket) => (
                  <ServiceButton
                    key={ticket.id}
                    fullWidth
                    label={ticket.name || t.orderName}
                    onPress={() => moveLineToAccount(ticket)}
                    variant="outline"
                  />
                ))}
            </View>
            <ServiceTextField
              label={t.orderName}
              onChangeText={setMoveAccountName}
              placeholder={t.newAccount}
              value={moveAccountName}
            />
            <ServiceButton
              disabled={!moveAccountName.trim()}
              fullWidth
              label={t.newAccount}
              onPress={createAccountAndMoveLine}
              variant="accent"
            />
          </>
        ) : null}
      </LocalActionSheet>

      <LocalActionSheet
        onClose={() => {
          setPaymentTicket(undefined);
          setEditingPaymentTicket(undefined);
          setPaymentError('');
        }}
        title={editingPaymentTicket ? t.editPayment : t.makePayment}
        visible={Boolean(paymentTarget)}
      >
        {paymentTarget ? (
          <>
            <View style={{ gap: tokens.space.xs }}>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {paymentTarget.name || t.orderName}
              </Text>
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {t.total}: {formatPrice(paymentTotal)}
              </Text>
            </View>
            <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
              {t.paymentMethod}
            </Text>
            <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
              <LocalChip
                label={t.cash}
                onPress={() => setPaymentMethod('cash')}
                selected={paymentMethod === 'cash'}
              />
              <LocalChip
                label={t.card}
                onPress={() => setPaymentMethod('card')}
                selected={paymentMethod === 'card'}
              />
            </View>
            {paymentMethod === 'cash' ? (
              <ServiceTextField
                keyboardType="decimal-pad"
                label={t.amountReceived}
                onChangeText={(value) => {
                  setAmountReceived(value);
                  setPaymentError('');
                }}
                value={amountReceived}
              />
            ) : null}
            {paymentMethod === 'cash' ? (
              <View
                accessibilityLiveRegion="polite"
                style={{
                  backgroundColor: tokens.colors.state.delivered.bg,
                  borderRadius: tokens.radius.medium,
                  padding: tokens.space.md,
                }}
              >
                <Text
                  style={[
                    tokens.typography.bodyStrong,
                    { color: tokens.colors.state.delivered.text },
                  ]}
                >
                  {t.change}: {formatPrice(changeMinor)}
                </Text>
              </View>
            ) : null}
            {paymentError ? (
              <Text style={[tokens.typography.caption, { color: tokens.colors.error }]}>
                {paymentError}
              </Text>
            ) : null}
            <View
              style={{ flexDirection: 'row', gap: tokens.space.xs, marginTop: tokens.space.sm }}
            >
              <ServiceButton
                label={t.close}
                onPress={() => {
                  setPaymentTicket(undefined);
                  setEditingPaymentTicket(undefined);
                }}
                style={{ flex: 1 }}
                variant="ghost"
              />
              <ServiceButton
                label={editingPaymentTicket ? t.save : t.makePayment}
                onPress={savePayment}
                style={{ flex: 1 }}
                variant="accent"
              />
            </View>
          </>
        ) : null}
      </LocalActionSheet>
      <ServiceConfirmSheet
        body={t.deleteOrderWarning}
        cancelLabel={t.close}
        confirmLabel={t.deleteOrder}
        destructive
        onClose={() => setPendingDeleteTicketId(undefined)}
        onConfirm={() => {
          const ticketId = pendingDeleteTicketId;
          setPendingDeleteTicketId(undefined);
          if (!ticketId) return;
          const nextTicket = tickets.find((ticket) => ticket.id !== ticketId);
          deleteTicket(ticketId);
          if (selectedTicketId === ticketId) setSelectedTicketId(nextTicket?.id);
          haptic('success');
          show({ message: t.deleteOrder, tone: 'success' });
        }}
        title={t.deleteOrder}
        visible={pendingDeleteTicketId !== undefined}
      />
    </SafeAreaView>
  );
}

function notePresets(t: Translation): readonly string[] {
  return [
    t.presetHurry,
    t.presetNoOnion,
    t.presetRare,
    t.presetWellDone,
    t.presetSpicy,
    t.presetSauceSide,
  ];
}

function LocalChip({
  label,
  selected,
  onPress,
  onLongPress,
  icon,
  role = 'button',
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly onLongPress?: () => void;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly role?: 'button' | 'tab';
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.primary : tokens.colors.surface,
        borderColor: selected ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: 48,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: tokens.space.md,
      })}
    >
      {icon ? (
        <Ionicons
          color={selected ? tokens.colors.primaryContrast : tokens.colors.text}
          name={icon}
          size={18}
        />
      ) : null}
      <Text
        style={[
          tokens.typography.label,
          {
            color: selected ? tokens.colors.primaryContrast : tokens.colors.text,
            marginLeft: icon ? tokens.space.xxs : 0,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LocalSegment({
  icon,
  label,
  selected,
  onPress,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        alignItems: 'center',
        borderBottomColor: selected ? tokens.colors.primary : tokens.colors.border,
        borderBottomWidth: selected ? 3 : 1,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: 48,
      }}
    >
      <Ionicons
        color={selected ? tokens.colors.primary : tokens.colors.textSubtle}
        name={icon}
        size={19}
      />
      <Text
        style={[
          tokens.typography.label,
          {
            color: selected ? tokens.colors.primary : tokens.colors.textSubtle,
            marginLeft: tokens.space.xs,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LocalModal({
  visible,
  title,
  children,
  onClose,
}: {
  readonly visible: boolean;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onClose: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={{
          alignItems: 'center',
          backgroundColor: tokens.colors.overlay,
          flex: 1,
          justifyContent: 'center',
          padding: tokens.space.md,
        }}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={[
            tokens.elevation.overlay,
            {
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.large,
              maxWidth: 560,
              padding: tokens.space.lg,
              width: '100%',
            },
          ]}
        >
          <Text
            style={[
              tokens.typography.sectionTitle,
              { color: tokens.colors.text, marginBottom: tokens.space.md },
            ]}
          >
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LocalActionSheet({
  visible,
  title,
  children,
  onClose,
}: {
  readonly visible: boolean;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onClose: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={{
          backgroundColor: tokens.colors.overlay,
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: tokens.colors.surface,
            borderTopLeftRadius: tokens.radius.large,
            borderTopRightRadius: tokens.radius.large,
            maxHeight: '88%',
            padding: tokens.space.lg,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: tokens.colors.border,
              borderRadius: tokens.radius.full,
              height: 4,
              marginBottom: tokens.space.md,
              width: 42,
            }}
          />
          <Text
            style={[
              tokens.typography.sectionTitle,
              { color: tokens.colors.text, marginBottom: tokens.space.md },
            ]}
          >
            {title}
          </Text>
          <ScrollView
            contentContainerStyle={{ gap: tokens.space.md }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LocalModalActions({
  confirmLabel,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  readonly confirmLabel?: string;
  readonly confirmDisabled?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm?: () => void;
}) {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: tokens.space.xs,
        justifyContent: 'flex-end',
        marginTop: tokens.space.lg,
      }}
    >
      <ServiceButton label={t.close} onPress={onCancel} variant="ghost" />
      {confirmLabel && onConfirm ? (
        <ServiceButton disabled={confirmDisabled} label={confirmLabel} onPress={onConfirm} />
      ) : null}
    </View>
  );
}

function parseMoneyInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return 0;
  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : 0;
}
