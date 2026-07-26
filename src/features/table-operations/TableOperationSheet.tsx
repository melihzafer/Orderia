import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ServiceButton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
} from '../../design-system';
import { Check, RestaurantTable, TableSession } from '../../domain';
import { Language } from '../../i18n';
import { createTextMatcher } from '../../utils/searchUtils';
import { TransferTableSessionCommand } from './tableOperationGateway';

export interface TableOperationTarget {
  readonly table: RestaurantTable;
  readonly session?: TableSession;
}

export interface TableOperationSheetProps {
  readonly visible: boolean;
  readonly sourceTable: RestaurantTable;
  readonly sourceSession: TableSession;
  readonly sourceChecks: readonly Check[];
  readonly targets: readonly TableOperationTarget[];
  readonly language: Language;
  readonly online: boolean;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (
    command: TransferTableSessionCommand,
    target: TableOperationTarget,
  ) => Promise<void>;
}

export function TableOperationSheet({
  visible,
  sourceTable,
  sourceSession,
  sourceChecks,
  targets,
  language,
  online,
  busy,
  onClose,
  onConfirm,
}: TableOperationSheetProps) {
  const { tokens } = useTheme();
  const copy = operationCopy(language);
  const [query, setQuery] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>();
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string>();
  const selected = targets.find((target) => target.table.id === selectedTableId);
  const filtered = useMemo(() => {
    const matcher = createTextMatcher(query);
    return targets.filter((target) => matcher(target.table.label));
  }, [query, targets]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSelectedTableId(undefined);
    setReviewing(false);
    setError(undefined);
  }, [sourceSession.id, visible]);

  const submit = async () => {
    if (!selected) return;
    try {
      setError(undefined);
      await onConfirm(
        {
          sourceSessionId: sourceSession.id,
          targetTableId: selected.table.id,
          expectedSourceVersion: sourceSession.serverVersion ?? sourceSession.version,
          expectedTargetVersion: selected.session
            ? (selected.session.serverVersion ?? selected.session.version)
            : null,
        },
        selected,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.failed);
      setReviewing(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent
      visible={visible}
    >
      <View
        style={{
          backgroundColor: tokens.colors.overlay,
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: tokens.colors.bg,
            borderTopLeftRadius: tokens.radius.large,
            borderTopRightRadius: tokens.radius.large,
            maxHeight: '92%',
            maxWidth: 720,
            padding: tokens.space.lg,
            width: '100%',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: tokens.space.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
                {reviewing ? copy.review : copy.moveTable}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {sourceTable.label} · {sourceChecks.length} {copy.checks}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={copy.close}
              accessibilityRole="button"
              disabled={busy}
              onPress={onClose}
              style={{ padding: tokens.space.sm }}
            >
              <Ionicons color={tokens.colors.text} name="close" size={26} />
            </Pressable>
          </View>

          {!online ? (
            <ServiceSurface
              style={{
                backgroundColor: tokens.colors.state.pending.bg,
                marginBottom: tokens.space.md,
                padding: tokens.space.md,
              }}
            >
              <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.warning }]}>
                {copy.onlineRequired}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {copy.onlineDetail}
              </Text>
            </ServiceSurface>
          ) : null}

          <ScrollView
            contentContainerStyle={{ gap: tokens.space.md, paddingBottom: tokens.space.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!reviewing ? (
              <>
                <ServiceTextField
                  label={copy.search}
                  onChangeText={setQuery}
                  placeholder={copy.searchHint}
                  value={query}
                />
                <View style={{ gap: tokens.space.sm }}>
                  {filtered.map((target) => {
                    const selectedTarget = target.table.id === selectedTableId;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedTarget }}
                        key={target.table.id}
                        onPress={() => {
                          setSelectedTableId(target.table.id);
                          setError(undefined);
                        }}
                      >
                        <ServiceSurface
                          style={{
                            alignItems: 'center',
                            borderColor: selectedTarget
                              ? tokens.colors.primary
                              : tokens.colors.border,
                            borderWidth: selectedTarget ? 2 : 1,
                            flexDirection: 'row',
                            gap: tokens.space.md,
                            minHeight: 72,
                            padding: tokens.space.md,
                          }}
                        >
                          <Ionicons
                            color={
                              selectedTarget ? tokens.colors.primary : tokens.colors.textSubtle
                            }
                            name={target.session ? 'people-outline' : 'checkmark-circle-outline'}
                            size={24}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}
                            >
                              {target.table.label}
                            </Text>
                            <Text
                              style={[
                                tokens.typography.caption,
                                { color: tokens.colors.textSubtle },
                              ]}
                            >
                              {target.session ? copy.occupied : copy.empty}
                            </Text>
                          </View>
                          <ServiceStatusPill
                            label={target.session ? copy.merge : copy.move}
                            tone={target.session ? 'warning' : 'success'}
                          />
                        </ServiceSurface>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : selected ? (
              <>
                <ServiceSurface style={{ gap: tokens.space.md, padding: tokens.space.lg }}>
                  <RouteLine label={copy.source} value={sourceTable.label} icon="exit-outline" />
                  <View
                    style={{
                      alignItems: 'center',
                      borderLeftColor: tokens.colors.border,
                      borderLeftWidth: 2,
                      height: 32,
                      marginLeft: 11,
                    }}
                  />
                  <RouteLine
                    label={selected.session ? copy.mergeInto : copy.target}
                    value={selected.table.label}
                    icon="enter-outline"
                  />
                </ServiceSurface>
                <ServiceSurface
                  style={{
                    backgroundColor: selected.session
                      ? tokens.colors.state.pending.bg
                      : tokens.colors.state.delivered.bg,
                    gap: tokens.space.sm,
                    padding: tokens.space.md,
                  }}
                >
                  <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                    {selected.session ? copy.mergeExplanation : copy.moveExplanation}
                  </Text>
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                    {copy.atomicNotice}
                  </Text>
                </ServiceSurface>
                <View>
                  <Text
                    style={[
                      tokens.typography.label,
                      { color: tokens.colors.text, marginBottom: tokens.space.xs },
                    ]}
                  >
                    {copy.preservedChecks}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
                    {sourceChecks.map((check) => (
                      <View
                        key={check.id}
                        style={{
                          backgroundColor: tokens.colors.surfaceAlt,
                          borderRadius: tokens.radius.full,
                          paddingHorizontal: tokens.space.md,
                          paddingVertical: tokens.space.xs,
                        }}
                      >
                        <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                          {check.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                style={[tokens.typography.caption, { color: tokens.colors.error }]}
              >
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
            <ServiceButton
              disabled={busy}
              label={reviewing ? copy.back : copy.close}
              onPress={() => (reviewing ? setReviewing(false) : onClose())}
              style={{ flex: 1 }}
              variant="ghost"
            />
            <ServiceButton
              disabled={busy || !online || !selected}
              label={
                reviewing ? (selected?.session ? copy.confirmMerge : copy.confirmMove) : copy.review
              }
              loading={busy}
              onPress={() => (reviewing ? void submit() : setReviewing(true))}
              style={{ flex: 2 }}
              variant={selected?.session && reviewing ? 'accent' : 'primary'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RouteLine({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.md }}>
      <Ionicons color={tokens.colors.primary} name={icon} size={24} />
      <View>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
          {label}
        </Text>
        <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function operationCopy(language: Language) {
  const translations = {
    tr: {
      moveTable: 'Masayı taşı / birleştir',
      review: 'İşlemi gözden geçir',
      close: 'Kapat',
      checks: 'hesap',
      onlineRequired: 'Bu işlem için bağlantı gerekli',
      onlineDetail: 'Kaynak ve hedef masa sunucuda tek transaction içinde kilitlenir.',
      search: 'Hedef masa ara',
      searchHint: 'Masa adı veya numarası',
      occupied: 'Açık servis var',
      empty: 'Boş masa',
      merge: 'Birleştir',
      move: 'Taşı',
      source: 'Kaynak',
      target: 'Yeni masa',
      mergeInto: 'Birleşeceği masa',
      mergeExplanation: 'İki servis birleşir; isimli hesaplar ayrı kalır.',
      moveExplanation: 'Tüm servis ve hesaplar bu boş masaya taşınır.',
      atomicNotice: 'Sipariş kökeni korunur; işlem tamamen uygulanır veya tamamen geri alınır.',
      preservedChecks: 'Ayrı kalacak hesaplar',
      back: 'Geri',
      confirmMerge: 'Birleştirmeyi onayla',
      confirmMove: 'Taşımayı onayla',
      failed: 'Masa işlemi tamamlanamadı.',
    },
    bg: {
      moveTable: 'Премести / обедини маса',
      review: 'Преглед',
      close: 'Затвори',
      checks: 'сметки',
      onlineRequired: 'Нужна е връзка',
      onlineDetail: 'Двете маси се заключват в една сървърна транзакция.',
      search: 'Търси целева маса',
      searchHint: 'Име или номер',
      occupied: 'Има активна сесия',
      empty: 'Свободна маса',
      merge: 'Обедини',
      move: 'Премести',
      source: 'Източник',
      target: 'Нова маса',
      mergeInto: 'Обедини в',
      mergeExplanation: 'Сесиите се обединяват, а именуваните сметки остават отделни.',
      moveExplanation: 'Цялата сесия се премества на свободната маса.',
      atomicNotice: 'Произходът се пази; операцията се изпълнява изцяло или се отменя.',
      preservedChecks: 'Сметки, които остават отделни',
      back: 'Назад',
      confirmMerge: 'Потвърди обединяването',
      confirmMove: 'Потвърди преместването',
      failed: 'Операцията не бе завършена.',
    },
    en: {
      moveTable: 'Move / merge table',
      review: 'Review operation',
      close: 'Close',
      checks: 'checks',
      onlineRequired: 'Connection required',
      onlineDetail: 'Source and target tables are locked in one server transaction.',
      search: 'Find target table',
      searchHint: 'Table name or number',
      occupied: 'Active service',
      empty: 'Empty table',
      merge: 'Merge',
      move: 'Move',
      source: 'Source',
      target: 'New table',
      mergeInto: 'Merge into',
      mergeExplanation: 'Sessions merge while every named check remains separate.',
      moveExplanation: 'The complete service and its checks move to this empty table.',
      atomicNotice: 'Order origin is preserved; the operation fully applies or fully rolls back.',
      preservedChecks: 'Checks kept separate',
      back: 'Back',
      confirmMerge: 'Confirm merge',
      confirmMove: 'Confirm move',
      failed: 'Table operation could not be completed.',
    },
  };
  return translations[language] ?? translations.en;
}
