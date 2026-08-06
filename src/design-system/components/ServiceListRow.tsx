import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, StyleProp, Switch, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { focusRing } from '../focusRing';
import { ServiceStatusTone } from '../tokens';

export type ServiceListRowAccessory = 'chevron' | 'switch' | 'check' | 'value' | 'none';

export interface ServiceListRowProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  /** İkon karesinin rengini durum tonundan alır; varsayılan sıcak vurgu. */
  readonly iconTone?: ServiceStatusTone | 'accent';
  readonly accessory?: ServiceListRowAccessory;
  /** `accessory="value"` veya chevron ile birlikte sağda gösterilen kısa metin. */
  readonly value?: string;
  readonly switchValue?: boolean;
  readonly onValueChange?: (next: boolean) => void;
  readonly onPress?: () => void;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
  /** Grubun son satırında alt ayırıcı çizilmez. */
  readonly last?: boolean;
  readonly compact?: boolean;
  /**
   * `subtitle` verilse bile çizilip çizilmeyeceği. Belirtilmezse yoğunluğu takip eder:
   * sıkışık modda açıklamalar varsayılan kapalı, rahat modda açık.
   */
  readonly showSubtitle?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * react-native-web'in Switch'i açık durumda `thumbColor`'ı yok sayıp kendi Material
 * varsayılanına düşüyor; `activeThumbColor` yalnızca web'de var, RN tiplerinde yok.
 */
function webThumbProps(color: string): Partial<React.ComponentProps<typeof Switch>> {
  if (Platform.OS !== 'web') return {};
  return { activeThumbColor: color } as unknown as Partial<React.ComponentProps<typeof Switch>>;
}

/**
 * Ayar, seçim ve navigasyon satırlarının tek gövdesi.
 * Dokunma hedefi her zaman en az `minimumTarget`: eldiven ya da telaşla da isabet
 * etsin diye satırın tamamı basılabilir, ikon veya metin değil.
 */
export function ServiceListRow({
  title,
  subtitle,
  icon,
  iconTone = 'accent',
  accessory = 'none',
  value,
  switchValue,
  onValueChange,
  onPress,
  selected = false,
  disabled = false,
  destructive = false,
  last = false,
  compact,
  showSubtitle,
  style,
}: ServiceListRowProps) {
  const { tokens, density } = useTheme();
  const isCompact = compact ?? density === 'compact';
  const isSubtitleVisible = showSubtitle ?? density === 'comfortable';
  const [focused, setFocused] = useState(false);
  const palette = iconPalette(tokens.colors, iconTone);
  const titleColor = destructive
    ? tokens.colors.error
    : disabled
      ? tokens.colors.textMuted
      : tokens.colors.text;
  const interactive = Boolean(onPress) && accessory !== 'switch';

  const body = (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        minHeight: isCompact ? tokens.sizing.minimumTarget : tokens.sizing.primaryTarget,
        paddingHorizontal: tokens.space.md,
        paddingVertical: isCompact ? tokens.space.xs : tokens.space.sm,
      }}
    >
      {icon ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: destructive ? tokens.colors.state.cancelled.bg : palette.background,
            borderRadius: tokens.radius.medium,
            height: 36,
            justifyContent: 'center',
            marginRight: tokens.space.sm,
            width: 36,
          }}
        >
          <Ionicons
            color={destructive ? tokens.colors.error : palette.content}
            name={icon}
            size={19}
          />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={[tokens.typography.label, { color: titleColor }]}>
          {title}
        </Text>
        {subtitle && isSubtitleVisible ? (
          <Text
            numberOfLines={2}
            style={[tokens.typography.caption, { color: tokens.colors.textSubtle, marginTop: 2 }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value && accessory !== 'switch' ? (
        <Text
          numberOfLines={1}
          style={[
            tokens.typography.label,
            {
              color: tokens.colors.textSubtle,
              marginLeft: tokens.space.xs,
              maxWidth: 140,
            },
          ]}
        >
          {value}
        </Text>
      ) : null}

      {accessory === 'switch' ? (
        <Switch
          accessibilityLabel={title}
          disabled={disabled}
          onValueChange={onValueChange}
          thumbColor={switchValue ? '#FFFFFF' : tokens.colors.surface}
          trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
          value={switchValue ?? false}
          {...webThumbProps('#FFFFFF')}
        />
      ) : accessory === 'check' ? (
        selected ? (
          <Ionicons color={tokens.colors.primary} name="checkmark" size={22} />
        ) : (
          <View style={{ height: 22, width: 22 }} />
        )
      ) : accessory === 'chevron' ? (
        <Ionicons
          color={tokens.colors.textMuted}
          name="chevron-forward"
          size={20}
          style={{ marginLeft: tokens.space.xxs }}
        />
      ) : null}
    </View>
  );

  const container: ViewStyle = {
    backgroundColor: selected && accessory === 'check' ? tokens.colors.accentSoft : 'transparent',
    borderBottomColor: tokens.colors.borderLight,
    borderBottomWidth: last ? 0 : 1,
    opacity: disabled ? 0.5 : 1,
  };

  if (!interactive) {
    return (
      <View
        accessibilityLabel={accessory === 'switch' ? undefined : title}
        style={[container, style]}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        container,
        {
          backgroundColor: pressed
            ? tokens.colors.surfaceAlt
            : (container.backgroundColor as string),
        },
        focusRing(tokens.colors.focus, focused),
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}

export interface ServiceRowGroupProps {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/** Satırları tek bir kart gövdesinde toplar; ayırıcıları satırların kendisi çizer. */
export function ServiceRowGroup({ children, style }: ServiceRowGroupProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderLight,
          borderRadius: tokens.radius.large,
          borderWidth: 1,
          overflow: 'hidden',
        },
        tokens.elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function iconPalette(
  colors: ReturnType<typeof useTheme>['colors'],
  tone: ServiceStatusTone | 'accent',
): { background: string; content: string } {
  switch (tone) {
    case 'success':
      return { background: colors.state.delivered.bg, content: colors.state.delivered.text };
    case 'warning':
      return { background: colors.state.pending.bg, content: colors.state.pending.text };
    case 'error':
      return { background: colors.state.cancelled.bg, content: colors.state.cancelled.text };
    case 'info':
      return { background: colors.state.paid.bg, content: colors.state.paid.text };
    case 'neutral':
      return { background: colors.surfaceAlt, content: colors.textSubtle };
    default:
      return { background: colors.accentSoft, content: colors.accent };
  }
}
