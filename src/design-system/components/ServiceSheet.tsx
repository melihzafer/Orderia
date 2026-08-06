import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { motionDuration, useReducedMotion } from '../useReducedMotion';

export interface ServiceSheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly subtitle?: string;
  readonly onClose: () => void;
  /**
   * Kapanışın kullanıcı için güvenli olduğu durumlarda aşağı sürükleme ve arka plana
   * dokunma kapatır. Onay gerektiren yıkıcı akışlarda `false` verilir: kazayla
   * kaydırıp "iptal ettim mi, onayladım mı" belirsizliğinde kalmasın.
   */
  readonly dismissible?: boolean;
  readonly children: React.ReactNode;
}

/**
 * Alt sayfaların ortak gövdesi: arka plan karartması, sürükleme tutamağı,
 * güvenli alan boşluğu ve klavye kaçınması burada bir kez çözülür.
 *
 * @gorhom/bottom-sheet yerine düz `Modal` kullanılır çünkü projedeki mevcut
 * sayfalar (TableOperationSheet, PaymentSheet) da bu yolu izliyor; imperatif ref
 * yerine `visible` prop'u test edilebilir ve web'de aynı davranır.
 */
export function ServiceSheet({
  visible,
  title,
  subtitle,
  onClose,
  dismissible = true,
  children,
}: ServiceSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    drag.setValue(0);
    const animation = Animated.timing(progress, {
      duration: motionDuration(tokens.motion.panel, reducedMotion),
      toValue: visible ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [drag, progress, reducedMotion, tokens.motion.panel, visible]);

  // Tutamak yalnızca dikey sürüklemeyi dinler ve sadece aşağı yönde hareket eder;
  // yukarı çekiş sayfayı ekrandan taşırmaz.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          dismissible && gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) drag.setValue(gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          // 96px ya da hızlı bir savurma niyeti kapatmaya yeter; altında kalan
          // her hareket sayfayı yerine geri oturtur.
          if (gesture.dy > 96 || gesture.vy > 0.8) {
            onClose();
            return;
          }
          Animated.spring(drag, {
            bounciness: 0,
            toValue: 0,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        },
      }),
    [dismissible, drag, onClose],
  );

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={{
            backgroundColor: tokens.colors.overlay,
            bottom: 0,
            left: 0,
            opacity: progress,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        >
          <Pressable
            accessibilityLabel={title}
            accessibilityRole="button"
            disabled={!dismissible}
            onPress={dismissible ? onClose : undefined}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              {
                backgroundColor: tokens.colors.surface,
                borderTopLeftRadius: tokens.radius.large,
                borderTopRightRadius: tokens.radius.large,
                maxHeight: '90%',
                paddingBottom: insets.bottom + tokens.space.md,
                transform: [
                  {
                    translateY: Animated.add(
                      drag,
                      progress.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }),
                    ),
                  },
                ],
              },
              tokens.elevation.overlay,
            ]}
          >
            <View {...(dismissible ? panResponder.panHandlers : {})}>
              {dismissible ? (
                <View style={{ alignItems: 'center', paddingTop: tokens.space.sm }}>
                  <View
                    style={{
                      backgroundColor: tokens.colors.border,
                      borderRadius: tokens.radius.full,
                      height: 4,
                      width: 40,
                    }}
                  />
                </View>
              ) : null}

              <View
                style={{
                  paddingHorizontal: tokens.space.md,
                  paddingTop: tokens.space.md,
                  paddingBottom: tokens.space.xs,
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    style={[
                      tokens.typography.body,
                      { color: tokens.colors.textSubtle, marginTop: 2 },
                    ]}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>

            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
