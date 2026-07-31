import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateId } from '../constants/branding';
import { QuantityStepper } from '../components/QuantityStepper';
import { useTheme } from '../contexts/ThemeContext';
import {
  ServiceButton,
  ServiceEmptyState,
  ServiceIconButton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import { useLocalization } from '../i18n';
import { Translation } from '../i18n/languages';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useLayoutStore, useMenuStore, useOrderStore } from '../stores';
import { MenuItem, TicketLine } from '../types';
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
  const tickets = useMemo(
    () =>
      Object.values(openTickets)
        .filter((ticket) => ticket.tableId === route.params.tableId)
        .sort((left, right) => left.createdAt - right.createdAt),
    [openTickets, route.params.tableId],
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string>();
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
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId);
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
      Alert.alert(t.error, t.genericError);
    }
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
            tokens.typography.title,
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

      <ScrollView
        horizontal
        accessibilityRole="tablist"
        contentContainerStyle={{
          alignItems: 'center',
          gap: tokens.space.xs,
          paddingBottom: tokens.space.sm,
          paddingHorizontal: tokens.space.md,
        }}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
      >
        {tickets.map((ticket, index) => (
          <LocalChip
            key={ticket.id}
            label={ticket.name || `${t.orderName} ${index + 1}`}
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
        <LocalChip
          icon="add"
          label={t.addOrder}
          role="tab"
          onPress={() => {
            setNewTicketName('');
            setShowTicketModal(true);
          }}
          selected={false}
        />
      </ScrollView>

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
                  <View
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
                  </View>
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
            alignItems: 'center',
            backgroundColor: tokens.colors.surface,
            borderTopColor: tokens.colors.border,
            borderTopWidth: 1,
            flexDirection: 'row',
            gap: tokens.space.xs,
            padding: tokens.space.sm,
          },
        ]}
      >
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
        <Pressable
          accessibilityHint={t.editDraft}
          accessibilityRole="button"
          disabled={draft.length === 0}
          onPress={() => setShowDraftModal(true)}
          style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
        >
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {draft.reduce((sum, line) => sum + line.quantity, 0)} {t.itemsFound}
          </Text>
          <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
            {formatPrice(draftTotal)}
          </Text>
        </Pressable>
        <ServiceButton
          disabled={draft.length === 0}
          icon="paper-plane"
          label={t.addOrder}
          onPress={sendDraft}
          size="large"
          variant="accent"
        />
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
  icon,
  role = 'button',
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly role?: 'button' | 'tab';
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected }}
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
