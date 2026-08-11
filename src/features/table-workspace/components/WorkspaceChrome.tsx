import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { ServiceButton, ServiceIconButton } from '../../../design-system';
import { Check, CheckId } from '../../../domain';
import type { WorkspaceCopy } from '../workspaceCopy';

/** Palet daraltma kapsamı: ya sabit bir grup ya da bir kategori kimliği. */
export type PaletteScope = 'all' | 'favorites' | 'recent' | string;

/**
 * Çalışma alanının üst şeridi: başlık, hesap sekmeleri ve filtre rozetleri.
 *
 * TableDetailScreen'den ayrıldı. Hepsi prop'larının saf birer fonksiyonu —
 * ekranın durumunu bilmiyorlar, dolayısıyla ekranla aynı dosyada durmaları
 * için bir sebep yoktu.
 */

export function WorkspaceHeader({
  locationNote,
  locationNoteLabel,
  tableLabel,
  participantNames,
  onBack,
  onActions,
  actionsLabel,
}: {
  readonly locationNote?: string;
  readonly locationNoteLabel: string;
  readonly tableLabel: string;
  readonly participantNames: readonly string[];
  readonly onBack: () => void;
  readonly onActions: () => void;
  readonly actionsLabel: string;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.xs }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          minHeight: 64,
        }}
      >
        <ServiceIconButton icon="arrow-back" label="Back" onPress={onBack} />
        <Text
          style={[
            tokens.typography.subtitle,
            { color: tokens.colors.text, flex: 1, marginHorizontal: tokens.space.sm },
          ]}
          numberOfLines={1}
        >
          {tableLabel}
        </Text>
        <ServiceIconButton icon="ellipsis-horizontal" label={actionsLabel} onPress={onActions} />
      </View>
      {locationNote ? (
        <View
          accessibilityLabel={`${locationNoteLabel}: ${locationNote}`}
          style={{ alignItems: 'center', flexDirection: 'row', marginLeft: 48 }}
        >
          <Ionicons color={tokens.colors.warning} name="location-outline" size={16} />
          <Text
            numberOfLines={1}
            style={[
              tokens.typography.caption,
              { color: tokens.colors.warning, marginLeft: tokens.space.xs },
            ]}
          >
            {locationNote}
          </Text>
        </View>
      ) : null}
      {participantNames.length > 0 ? (
        <View
          accessibilityLabel={participantNames.join(', ')}
          style={{ alignItems: 'center', flexDirection: 'row', marginLeft: 48 }}
        >
          <Ionicons color={tokens.colors.primary} name="people" size={16} />
          <Text
            numberOfLines={1}
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textSubtle, marginLeft: tokens.space.xs },
            ]}
          >
            {participantNames.join(' · ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function CheckStrip({
  checks,
  selectedCheckId,
  pendingCheckName,
  pendingCheck,
  copy,
  onSelect,
  onSelectPending,
  onAdd,
}: {
  readonly checks: readonly Check[];
  readonly selectedCheckId?: CheckId;
  readonly pendingCheckName: string;
  /**
   * Garson "yeni hesap"a bastı ve henüz gönderilmedi. Adın girilmiş olması
   * şart değil: `namedOrders` kapalıyken hiç ad sorulmuyor ve eskiden şerit
   * bu durumda hiçbir şey göstermiyordu — buton görünürde ölüydü.
   */
  readonly pendingCheck: boolean;
  readonly copy: WorkspaceCopy;
  readonly onSelect: (id: CheckId) => void;
  readonly onSelectPending: () => void;
  readonly onAdd: () => void;
}) {
  const { tokens } = useTheme();
  return (
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
        {checks.map((check) => (
          <Chip
            key={check.id}
            label={check.name}
            role="tab"
            selected={check.id === selectedCheckId}
            onPress={() => onSelect(check.id)}
          />
        ))}
        {pendingCheck ? (
          <Chip
            label={pendingCheckName || copy.newCheck}
            role="tab"
            selected={!selectedCheckId}
            onPress={onSelectPending}
          />
        ) : null}
      </ScrollView>
      {/*
        Bekleyen (henüz gönderilmemiş) bir taslak hesap zaten "New check" çipi
        olarak görünüyorken bu butonu da göstermek aynı eylemi iki kez sunuyordu
        — ikisi de `onAdd`'ın yaptığı şeyi yapıyor. Yalnızca bekleyen taslak
        yokken göster.
      */}
      {!pendingCheck ? (
        <ServiceButton
          icon="add"
          label={copy.newCheck}
          onPress={onAdd}
          style={{ flexShrink: 0 }}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

export function Chip({
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
        minHeight: tokens.sizing.minimumTarget,
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
