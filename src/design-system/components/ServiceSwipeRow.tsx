import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { haptic } from '../haptics';
import { motionDuration, useReducedMotion } from '../useReducedMotion';

export interface ServiceSwipeAction {
  readonly id: string;
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly destructive?: boolean;
  readonly onPress: () => void;
}

export interface ServiceSwipeRowProps {
  readonly children: React.ReactNode;
  /** Sola kaydırınca sağda açılan eylemler. Boş verilirse satır sabit kalır. */
  readonly actions: readonly ServiceSwipeAction[];
  readonly onLongPress?: () => void;
  readonly enabled?: boolean;
}

const ACTION_WIDTH = 76;

/**
 * Liste satırlarının kaydırma katmanı.
 *
 * Kaydırma eylemi **açığa çıkarır, çalıştırmaz**: tam kaydırma ile doğrudan silme
 * yoktur. Yoğun serviste telefon cebe girip çıkarken ya da liste hızla kaydırılırken
 * tek bir savurmanın kaydı silmesi kabul edilebilir bir risk değil. Kullanıcı önce
 * eylemi görür, sonra ona basar.
 *
 * Dikey kaydırmayla çakışmayı `activeOffsetX`/`failOffsetY` çözer: hareket yatayda
 * 14px ilerlemeden el konmaz, dikeyde 12px aşılırsa jest tamamen düşürülür ve
 * liste normal şekilde kayar.
 */
export function ServiceSwipeRow({
  children,
  actions,
  onLongPress,
  enabled = true,
}: ServiceSwipeRowProps) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const offset = useRef(0);
  const [open, setOpen] = useState(false);
  const revealWidth = actions.length * ACTION_WIDTH;
  const active = enabled && actions.length > 0;

  const settle = useCallback(
    (toOpen: boolean) => {
      offset.current = toOpen ? -revealWidth : 0;
      setOpen(toOpen);
      Animated.timing(translateX, {
        duration: motionDuration(tokens.motion.state, reducedMotion),
        toValue: offset.current,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    },
    [reducedMotion, revealWidth, tokens.motion.state, translateX],
  );

  // Eylem listesi değişirse (ör. masa doldu, silme artık mümkün değil) açık satır
  // yanlış genişlikte asılı kalmasın.
  useEffect(() => {
    if (!active && open) settle(false);
  }, [active, open, settle]);

  const pan = Gesture.Pan()
    .enabled(active)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      const next = Math.min(0, Math.max(-revealWidth, offset.current + event.translationX));
      translateX.setValue(next);
    })
    .onEnd((event) => {
      const projected = offset.current + event.translationX;
      // Yarıdan fazla açıldıysa ya da kullanıcı sola doğru hızlı savurduysa açık kal.
      const shouldOpen = projected < -revealWidth / 2 || event.velocityX < -600;
      if (shouldOpen !== open) haptic('commit');
      settle(shouldOpen);
    })
    .runOnJS(true);

  const content = (
    <Animated.View
      style={{
        backgroundColor: tokens.colors.surface,
        transform: [{ translateX }],
      }}
    >
      {/*
        Satır açıkken içeriğe dokunmak eylemi değil, kapanmayı tetikler: açık bir
        satırda "aç" niyetiyle basan kullanıcı yanlışlıkla altındaki hedefe gitmesin.
      */}
      {open ? (
        <Pressable
          accessibilityLabel={undefined}
          onPress={() => settle(false)}
          style={{ position: 'relative' }}
        >
          <View pointerEvents="none">{children}</View>
        </Pressable>
      ) : (
        children
      )}
    </Animated.View>
  );

  if (!active) {
    return <View>{children}</View>;
  }

  return (
    <View style={{ overflow: 'hidden', position: 'relative' }}>
      <View
        style={{
          bottom: 0,
          flexDirection: 'row',
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      >
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            key={action.id}
            onPress={() => {
              settle(false);
              action.onPress();
            }}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: action.destructive
                ? tokens.colors.error
                : tokens.colors.state.paid.bg,
              justifyContent: 'center',
              opacity: pressed ? 0.82 : 1,
              paddingHorizontal: tokens.space.xxs,
              width: ACTION_WIDTH,
            })}
          >
            <Ionicons
              color={action.destructive ? tokens.colors.onError : tokens.colors.state.paid.text}
              name={action.icon}
              size={20}
            />
            <Text
              numberOfLines={1}
              style={[
                tokens.typography.caption,
                {
                  color: action.destructive ? tokens.colors.onError : tokens.colors.state.paid.text,
                  marginTop: 2,
                },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <GestureDetector gesture={pan}>
        {onLongPress ? (
          <Pressable
            delayLongPress={350}
            onLongPress={() => {
              haptic('activate');
              onLongPress();
            }}
          >
            {content}
          </Pressable>
        ) : (
          content
        )}
      </GestureDetector>
    </View>
  );
}
