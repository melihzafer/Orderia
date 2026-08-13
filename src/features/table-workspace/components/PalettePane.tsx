import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  ServiceEmptyState,
  ServiceProductThumb,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
} from '../../../design-system';
import type { DraftOrderLine } from '../orderCommands';
import type { TableWorkspaceSnapshot, WorkspaceProduct } from '../workspaceModel';
import { QuantityStepper } from '../../../components/QuantityStepper';
import type { Language } from '../../../i18n';
import type { WorkspaceCopy } from '../workspaceCopy';
import { formatMoney } from '../workspaceFormat';
import { Chip, type PaletteScope } from './WorkspaceChrome';

/**
 * Ürün paleti: kategori/favori daraltması, arama ve hızlı ekleme.
 */

export function PalettePane({
  categories,
  products,
  selectedScope,
  favoriteIds,
  query,
  draft,
  copy,
  language,
  currencyCode,
  onScope,
  onQuery,
  onAdd,
  onConfigure,
  onDecrement,
  onToggleFavorite,
  onToggleAvailability,
  photoUris,
}: {
  readonly categories: TableWorkspaceSnapshot['categories'];
  readonly products: readonly WorkspaceProduct[];
  readonly selectedScope: PaletteScope;
  readonly favoriteIds: readonly string[];
  readonly query: string;
  readonly draft: readonly DraftOrderLine[];
  readonly copy: WorkspaceCopy;
  readonly language: Language;
  readonly currencyCode: string;
  readonly onScope: (scope: PaletteScope) => void;
  readonly onQuery: (query: string) => void;
  readonly onAdd: (product: WorkspaceProduct, configure?: boolean) => void;
  readonly onConfigure: (product: WorkspaceProduct) => void;
  readonly onDecrement: (product: WorkspaceProduct) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onToggleAvailability: (product: WorkspaceProduct) => void;
  readonly photoUris: Readonly<Record<string, string>>;
}) {
  const { tokens } = useTheme();
  return (
    <ServiceSurface padding="none" style={{ flex: 1.2, minWidth: 0 }}>
      <View style={{ padding: tokens.space.sm }}>
        <ServiceTextField
          label={copy.search}
          onChangeText={onQuery}
          returnKeyType="search"
          value={query}
        />
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            gap: tokens.space.xs,
            paddingTop: tokens.space.sm,
          }}
        >
          <Chip
            label={copy.all}
            role="tab"
            selected={selectedScope === 'all'}
            onPress={() => onScope('all')}
          />
          <Chip
            icon="star"
            label={copy.favorites}
            role="tab"
            selected={selectedScope === 'favorites'}
            onPress={() => onScope('favorites')}
          />
          <Chip
            icon="time"
            label={copy.recents}
            role="tab"
            selected={selectedScope === 'recent'}
            onPress={() => onScope('recent')}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              role="tab"
              selected={selectedScope === category.id}
              onPress={() => onScope(category.id)}
            />
          ))}
        </ScrollView>
      </View>
      {products.length === 0 ? (
        <ServiceEmptyState body={copy.changeFilter} icon="search-outline" title={copy.noProducts} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(product) => product.id}
          numColumns={2}
          contentContainerStyle={{ padding: tokens.space.xs }}
          renderItem={({ item }) => {
            const inDraft = draft
              .filter((line) => line.product.id === item.id)
              .reduce((total, line) => total + line.quantity, 0);
            const soldOut = !item.isAvailable;
            return (
              <View style={{ flex: 1, maxWidth: '50%', padding: tokens.space.xxs }}>
                <Pressable
                  accessibilityHint={soldOut ? copy.soldOutHint : copy.longPress}
                  accessibilityLabel={
                    soldOut
                      ? `${item.name}, ${copy.soldOut}`
                      : `${item.name}, ${formatMoney(item.priceMinor, currencyCode, language)}`
                  }
                  accessibilityRole="button"
                  accessibilityState={{ disabled: soldOut }}
                  onLongPress={() => (soldOut ? onToggleAvailability(item) : onAdd(item, true))}
                  onPress={() => (soldOut ? onToggleAvailability(item) : onAdd(item))}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? tokens.colors.accentSoft : tokens.colors.surfaceAlt,
                    borderColor: soldOut
                      ? tokens.colors.border
                      : inDraft > 0
                        ? tokens.colors.accent
                        : tokens.colors.border,
                    borderRadius: tokens.radius.medium,
                    borderStyle: soldOut ? 'dashed' : 'solid',
                    borderWidth: inDraft > 0 && !soldOut ? 2 : 1,
                    minHeight: 92,
                    opacity: soldOut ? 0.55 : 1,
                    padding: tokens.space.sm,
                  })}
                >
                  <View
                    style={{ alignItems: 'flex-start', flexDirection: 'row', gap: tokens.space.xs }}
                  >
                    {photoUris[item.id] ? (
                      <ServiceProductThumb
                        fallbackIcon="restaurant-outline"
                        imageUri={photoUris[item.id]}
                        name={item.name}
                        size={42}
                      />
                    ) : null}
                    <Text
                      numberOfLines={2}
                      style={[tokens.typography.bodyStrong, { color: tokens.colors.text, flex: 1 }]}
                    >
                      {item.name}
                    </Text>
                    <Pressable
                      accessibilityLabel={`${copy.favorite}: ${item.name}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 44,
                        minWidth: 44,
                      }}
                    >
                      <Ionicons
                        color={
                          favoriteIds.includes(item.id)
                            ? tokens.colors.warning
                            : tokens.colors.textMuted
                        }
                        name={favoriteIds.includes(item.id) ? 'star' : 'star-outline'}
                        size={21}
                      />
                    </Pressable>
                    {item.modifierGroups.length > 0 ? (
                      <Pressable
                        accessibilityHint={copy.note}
                        accessibilityLabel={`${copy.note}: ${item.name}`}
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={(event) => {
                          event.stopPropagation();
                          onConfigure(item);
                        }}
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 44,
                          minWidth: 44,
                        }}
                      >
                        <Ionicons
                          color={tokens.colors.textSubtle}
                          name="options-outline"
                          size={20}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                    }}
                  >
                    {soldOut ? (
                      <ServiceStatusPill label={copy.soldOut} tone="error" />
                    ) : (
                      <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
                        {formatMoney(item.priceMinor, item.currencyCode, language)}
                      </Text>
                    )}
                    {inDraft > 0 && !soldOut ? (
                      <QuantityStepper
                        compact
                        decreaseLabel={`${copy.decrease}: ${item.name}`}
                        increaseLabel={`${copy.increase}: ${item.name}`}
                        onDecrease={() => onDecrement(item)}
                        onIncrease={() => onAdd(item)}
                        quantity={inDraft}
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
  );
}
