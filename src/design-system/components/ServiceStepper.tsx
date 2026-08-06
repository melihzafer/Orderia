import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { focusRing } from '../focusRing';
import { haptic } from '../haptics';
import { createHoldRepeat, type HoldRepeat } from '../holdRepeat';

export interface ServiceStepperProps {
  readonly value: number;
  readonly onChange: (next: number) => void;
  /** Ekran okuyucunun neyi ayarladığını söyleyebilmesi için zorunlu. */
  readonly label: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly step?: number;
  readonly decrementLabel: string;
  readonly incrementLabel: string;
  readonly disabled?: boolean;
  /** `large` sipariş girişi gibi arka arkaya basılan yerler için. */
  readonly size?: 'default' | 'large';
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Adet ve kişi sayısı için artır/azalt kontrolü.
 *
 * Basılı tutmak tekrara geçer ve hızlanır: sekiz bira girmek için sekiz kez
 * dokunmak yerine parmağı basılı tutmak yeter. Yoğun serviste tek elle çalışan
 * bir garson için bu, ekrandaki en sık tekrarlanan hareketin karşılığı.
 */
export function ServiceStepper({
  value,
  onChange,
  label,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
  step = 1,
  decrementLabel,
  incrementLabel,
  disabled = false,
  size = 'default',
  style,
}: ServiceStepperProps) {
  const { tokens } = useTheme();

  const clamp = useCallback(
    (next: number) => Math.min(maximum, Math.max(minimum, next)),
    [maximum, minimum],
  );
  const canDecrement = !disabled && value > minimum;
  const canIncrement = !disabled && value < maximum;

  // Tekrar sırasında prop'tan gelen `value` closure'da bayatlar; son değeri
  // ref üzerinden okuyoruz.
  const valueRef = useRef(value);
  valueRef.current = value;

  const nudge = useCallback(
    (direction: 1 | -1) => {
      const next = clamp(valueRef.current + direction * step);
      if (next === valueRef.current) return false;
      valueRef.current = next;
      onChange(next);
      return true;
    },
    [clamp, onChange, step],
  );

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      accessibilityValue={{ now: value, min: minimum, max: maximum }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrement) nudge(1);
        if (event.nativeEvent.actionName === 'decrement' && canDecrement) nudge(-1);
      }}
      style={[
        {
          alignItems: 'center',
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.full,
          borderWidth: 1,
          flexDirection: 'row',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <StepperButton
        disabled={!canDecrement}
        icon="remove"
        label={decrementLabel}
        onRepeat={() => nudge(-1)}
        size={size}
      />
      <Text
        // Değeri butonlar duyurduğu için ekran okuyucudan gizle.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          size === 'large' ? tokens.typography.subtitle : tokens.typography.bodyStrong,
          {
            color: disabled ? tokens.colors.textMuted : tokens.colors.text,
            minWidth: size === 'large' ? 56 : 44,
            textAlign: 'center',
          },
        ]}
      >
        {value}
      </Text>
      <StepperButton
        disabled={!canIncrement}
        icon="add"
        label={incrementLabel}
        onRepeat={() => nudge(1)}
        size={size}
      />
    </View>
  );
}

interface StepperButtonProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  /** Her adımda çağrılır; sınıra gelindiyse `false` döndürüp tekrarı durdurur. */
  readonly onRepeat: () => boolean;
  readonly disabled: boolean;
  readonly size: 'default' | 'large';
}

function StepperButton({ icon, label, onRepeat, disabled, size }: StepperButtonProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);

  // Tekrar üreteci basış boyunca yaşar; her render'da yenisi kurulmasın diye ref'te,
  // güncel adım fonksiyonu da ayrı bir ref'ten okunur.
  const stepRef = useRef(onRepeat);
  stepRef.current = onRepeat;
  const repeater = useRef<HoldRepeat | undefined>(undefined);
  if (!repeater.current) {
    repeater.current = createHoldRepeat(
      () => stepRef.current(),
      undefined,
      () => haptic('activate'),
    );
  }

  useEffect(() => {
    const current = repeater.current;
    return () => current?.stop();
  }, []);

  const target = size === 'large' ? tokens.sizing.primaryTarget : tokens.sizing.minimumTarget;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={() => {
        // Basılı tutma zaten adımları attıysa bırakış bir adım daha eklemez.
        if (repeater.current?.consumeRepeated()) return;
        haptic('selection');
        onRepeat();
      }}
      onPressIn={() => repeater.current?.start()}
      onPressOut={() => repeater.current?.stop()}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed ? tokens.colors.surfaceAlt : 'transparent',
        borderRadius: tokens.radius.full,
        height: target,
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        width: target,
        ...focusRing(tokens.colors.focus, focused),
      })}
    >
      <Ionicons
        color={disabled ? tokens.colors.textMuted : tokens.colors.text}
        name={icon}
        size={size === 'large' ? 26 : 22}
      />
    </Pressable>
  );
}
