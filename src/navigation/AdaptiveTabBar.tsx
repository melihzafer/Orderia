import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { focusRing, useAdaptiveLayout } from '../design-system';
import { useLocalization } from '../i18n';
import { useOrderStore } from '../stores';
import type { TabParamList } from './routes';

export function AdaptiveTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { tokens } = useTheme();
  const { activeMembership, status, workspace } = useAuth();
  const { t } = useLocalization();
  const layout = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const isManager = status === 'unconfigured' || activeMembership?.role === 'manager';
  const expanded = layout.mode === 'expanded' && isManager;
  const profileName = workspace?.profile.display_name;
  const openCheckCount = useOrderStore((store) => Object.keys(store.openTickets).length);

  return (
    <View
      accessibilityLabel={t.primaryNavigation}
      accessibilityRole="tablist"
      testID={expanded ? 'manager-navigation-rail' : 'bottom-navigation'}
      style={
        expanded
          ? {
              backgroundColor: tokens.colors.surface,
              borderRightColor: tokens.colors.border,
              borderRightWidth: 1,
              bottom: 0,
              left: 0,
              paddingBottom: Math.max(insets.bottom, tokens.space.md),
              paddingHorizontal: tokens.space.md,
              paddingTop: Math.max(insets.top, tokens.space.lg),
              position: 'absolute',
              top: 0,
              width: tokens.sizing.expandedRailWidth,
              zIndex: 20,
            }
          : {
              alignItems: 'stretch',
              backgroundColor: tokens.colors.surface,
              borderTopColor: tokens.colors.border,
              borderTopWidth: 1,
              flexDirection: 'row',
              minHeight: tokens.sizing.bottomNavigationHeight + insets.bottom,
              paddingBottom: insets.bottom,
            }
      }
    >
      {expanded ? (
        <View style={{ marginBottom: tokens.space.xl }}>
          <Text style={[tokens.typography.title, { color: tokens.colors.primary }]}>Orderia</Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {t.serviceConsoleName}
          </Text>
        </View>
      ) : null}

      {state.routes.map((route, index) => {
        const options = descriptors[route.key].options;
        const selected = state.index === index;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;

        return (
          <AdaptiveTabItem
            key={route.key}
            badge={route.name === 'Orders' ? openCheckCount : undefined}
            expanded={expanded}
            icon={tabIcon(route.name as keyof TabParamList, selected)}
            label={label}
            onLongPress={() => {
              navigation.emit({
                target: route.key,
                type: 'tabLongPress',
              });
            }}
            onPress={() => {
              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: 'tabPress',
              });
              if (!selected && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            selected={selected}
          />
        );
      })}

      {expanded ? (
        <View
          style={{
            borderTopColor: tokens.colors.borderLight,
            borderTopWidth: 1,
            marginTop: 'auto',
            paddingTop: tokens.space.md,
          }}
        >
          <Text numberOfLines={1} style={[tokens.typography.label, { color: tokens.colors.text }]}>
            {profileName ?? `Orderia ${t.managerRole}`}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {t.managerRole}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function AdaptiveTabItem({
  badge,
  expanded,
  icon,
  label,
  onLongPress,
  onPress,
  selected,
}: {
  readonly badge?: number;
  readonly expanded: boolean;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly onLongPress: () => void;
  readonly onPress: () => void;
  readonly selected: boolean;
}) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        flex: expanded ? undefined : 1,
        flexDirection: expanded ? 'row' : 'column',
        justifyContent: expanded ? 'flex-start' : 'center',
        marginBottom: expanded ? tokens.space.xs : 0,
        minHeight: expanded ? tokens.sizing.primaryTarget : tokens.sizing.minimumTarget,
        opacity: pressed ? 0.76 : 1,
        paddingHorizontal: expanded ? tokens.space.md : tokens.space.xs,
        // Ana gezinme klavyeyle dolaşılabilir olmalı ve odak halkası düzeni
        // oynatmamalı; kenarlık yerine outline. Halka dokunma alanının tamamını
        // sarar, altındaki dolgu hapı değil — odak göstergesi her zaman gerçek
        // hedefi işaret etmeli.
        ...focusRing(tokens.colors.focus, focused),
      })}
    >
      {/*
        Seçili sekmeyi ayıran dolgu hap. İçeriğe sarılır (tüm segmenti değil),
        böylece "aktif" göze tek, kendi içinde kapanan bir odak noktası olarak
        çarpar; önceden yalnızca ikon/metin rengi değişiyordu ve klavye odak
        halkası yanlışlıkla bu işi üstleniyordu.
      */}
      <View
        style={{
          alignItems: 'center',
          backgroundColor: selected ? tokens.colors.accentSoft : 'transparent',
          borderRadius: tokens.radius.full,
          flexDirection: expanded ? 'row' : 'column',
          paddingHorizontal: tokens.space.sm,
          paddingVertical: tokens.space.xxs,
        }}
      >
        <View>
          <Ionicons
            color={selected ? tokens.colors.primary : tokens.colors.textSubtle}
            name={icon}
            size={expanded ? 24 : 22}
          />
          {badge != null && badge > 0 ? (
            <View
              style={{
                alignItems: 'center',
                backgroundColor: tokens.colors.accent,
                borderRadius: 999,
                justifyContent: 'center',
                minHeight: 17,
                minWidth: 17,
                paddingHorizontal: 4,
                position: 'absolute',
                right: -8,
                top: -4,
              }}
            >
              <Text
                style={{
                  color: tokens.colors.primaryContrast,
                  fontSize: 10,
                  fontWeight: '700',
                  lineHeight: 14,
                }}
              >
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            tokens.typography.caption,
            {
              color: selected ? tokens.colors.primary : tokens.colors.textSubtle,
              fontWeight: selected ? '700' : '500',
              marginLeft: expanded ? tokens.space.sm : 0,
              marginTop: expanded ? 0 : 2,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function tabIcon(route: keyof TabParamList, focused: boolean): keyof typeof Ionicons.glyphMap {
  const icons: Record<
    keyof TabParamList,
    readonly [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]
  > = {
    Masalar: ['restaurant-outline', 'restaurant'],
    Home: ['home-outline', 'home'],
    Orders: ['receipt-outline', 'receipt'],
    Receipts: ['time-outline', 'time'],
    Menu: ['book-outline', 'book'],
  };
  return icons[route][focused ? 1 : 0];
}
