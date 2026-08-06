import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createHoldRepeat, haptic, type HoldRepeat } from '../design-system';

/**
 * Garson dostu adet kontrolü: − sayaç +
 * Ebeveyn Pressable içinde kullanıldığında dokunuşu yukarı iletmez.
 *
 * Basılı tutmak adımları tekrarlar ve hızlanır: sekiz bira için sekiz kez dokunmak
 * yerine parmağı basılı tutmak yeter. Bu, uygulamada en sık tekrarlanan hareket.
 */
export function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  compact = false,
  decreaseDisabled = false,
  increaseDisabled = false,
}: {
  readonly quantity: number;
  readonly onDecrease: () => void;
  readonly onIncrease: () => void;
  readonly decreaseLabel: string;
  readonly increaseLabel: string;
  readonly compact?: boolean;
  readonly decreaseDisabled?: boolean;
  readonly increaseDisabled?: boolean;
}) {
  const { tokens } = useTheme();
  // Dar yerleşimde bile Android'in 48dp tabanının altına inmiyoruz; normal
  // yerleşimde asıl eylem boyutuna çıkıyor ki tek elle nişan almak gerekmesin.
  const buttonSize = compact ? tokens.sizing.minimumTarget : tokens.sizing.primaryTarget;
  const iconSize = compact ? 22 : 26;

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: tokens.space.xxs,
        marginTop: compact ? 0 : tokens.space.xxs,
      }}
    >
      <StepButton
        color={tokens.colors.error}
        disabled={decreaseDisabled}
        icon="remove"
        iconSize={iconSize}
        label={decreaseLabel}
        onStep={onDecrease}
        size={buttonSize}
        variant="outline"
      />
      <Text
        style={[
          tokens.typography.bodyStrong,
          {
            color: tokens.colors.text,
            minWidth: compact ? 32 : 40,
            textAlign: 'center',
          },
        ]}
      >
        {quantity}
      </Text>
      <StepButton
        color={tokens.colors.primaryContrast}
        disabled={increaseDisabled}
        icon="add"
        iconSize={iconSize}
        label={increaseLabel}
        onStep={onIncrease}
        size={buttonSize}
        variant="solid"
      />
    </View>
  );
}

function StepButton({
  icon,
  label,
  onStep,
  disabled,
  size,
  iconSize,
  color,
  variant,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly onStep: () => void;
  readonly disabled: boolean;
  readonly size: number;
  readonly iconSize: number;
  readonly color: string;
  readonly variant: 'solid' | 'outline';
}) {
  const { tokens } = useTheme();
  // Tekrar sırasında sınıra dayanıldığında ebeveyn `disabled` gönderir; adım
  // fonksiyonu bunu ref'ten okuyup `false` döndürerek tekrarı kendiliğinden bitirir.
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  const repeater = useRef<HoldRepeat | undefined>(undefined);
  if (!repeater.current) {
    repeater.current = createHoldRepeat(
      () => {
        if (disabledRef.current) return false;
        stepRef.current();
        return true;
      },
      undefined,
      () => haptic('activate'),
    );
  }

  useEffect(() => {
    const current = repeater.current;
    return () => current?.stop();
  }, []);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={(event) => {
        event.stopPropagation();
        // Basılı tutma zaten adımları attıysa bırakış bir adım daha eklemez.
        if (repeater.current?.consumeRepeated()) return;
        haptic('selection');
        onStep();
      }}
      onPressIn={() => repeater.current?.start()}
      onPressOut={() => repeater.current?.stop()}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: variant === 'solid' ? tokens.colors.accent : tokens.colors.surface,
        borderColor: tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: variant === 'solid' ? 0 : 1,
        height: size,
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        width: size,
      })}
    >
      <Ionicons color={color} name={icon} size={iconSize} />
    </Pressable>
  );
}
