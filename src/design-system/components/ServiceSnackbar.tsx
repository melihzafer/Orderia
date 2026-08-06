import { Ionicons } from '@expo/vector-icons';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { haptic } from '../haptics';
import { motionDuration, useReducedMotion } from '../useReducedMotion';

export type ServiceSnackbarTone = 'neutral' | 'success' | 'warning' | 'error';

export interface ServiceSnackbarAction {
  readonly label: string;
  readonly onPress: () => void;
}

export interface ServiceSnackbarOptions {
  readonly message: string;
  readonly tone?: ServiceSnackbarTone;
  /** Genellikle "Geri al". Basıldığında snackbar kapanır ve geri çağrı çalışır. */
  readonly action?: ServiceSnackbarAction;
  /** Milisaniye. Verilmezse eylemli snackbar 6s, eylemsiz 4s durur. */
  readonly duration?: number;
}

interface SnackbarContextValue {
  readonly show: (options: ServiceSnackbarOptions) => void;
  readonly dismiss: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

/**
 * Yıkıcı işlemlerden sonraki kurtarma yüzeyi.
 *
 * Sıra tutmaz, değiştirir: yeni bir snackbar geldiğinde öncekinin yerini alır.
 * Servis sırasında garson en son yaptığı işi düşünüyor; bekleyen bir kuyruğun
 * arkasında sıra beklemek "geri al"ı işe yaramaz hale getirirdi.
 */
export function SnackbarProvider({ children }: { readonly children: React.ReactNode }) {
  const [current, setCurrent] = useState<ServiceSnackbarOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setCurrent(null);
  }, [clearTimer]);

  const show = useCallback(
    (options: ServiceSnackbarOptions) => {
      clearTimer();
      setCurrent(options);
      // Ekran okuyucu snackbar'ı kaçırmasın: canlı bölge bildirimi ayrıca gönderilir.
      AccessibilityInfo.announceForAccessibility?.(options.message);
      const duration = options.duration ?? (options.action ? 6000 : 4000);
      timer.current = setTimeout(() => setCurrent(null), duration);
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <ServiceSnackbarHost onDismiss={dismiss} options={current} />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}

function ServiceSnackbarHost({
  options,
  onDismiss,
}: {
  readonly options: ServiceSnackbarOptions | null;
  readonly onDismiss: () => void;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  // Çıkış animasyonu boyunca içerik ekranda kalmalı; yoksa metin kaybolur, kutu solar.
  const [rendered, setRendered] = useState<ServiceSnackbarOptions | null>(options);

  useEffect(() => {
    if (options) setRendered(options);
    const duration = motionDuration(tokens.motion.state, reducedMotion);
    const animation = Animated.timing(progress, {
      duration,
      toValue: options ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => {
      if (finished && !options) setRendered(null);
    });
    return () => animation.stop();
  }, [options, progress, reducedMotion, tokens.motion.state]);

  if (!rendered) return null;

  const tone = rendered.tone ?? 'neutral';
  const palette = snackbarPalette(tokens.colors, tone);

  return (
    <Animated.View
      // Ekranın alt kenarına yapışır ama alt gezinme çubuğunun üstünde kalır:
      // asıl işlem düğmelerini kapatan bir kurtarma yüzeyi kendi amacını baltalar.
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        bottom: insets.bottom + tokens.sizing.bottomNavigationHeight + tokens.space.xs,
        left: 0,
        opacity: progress,
        paddingHorizontal: tokens.space.md,
        position: 'absolute',
        right: 0,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
        zIndex: 1000,
      }}
    >
      <View
        style={[
          {
            alignItems: 'center',
            backgroundColor: palette.background,
            borderColor: palette.border,
            borderRadius: tokens.radius.medium,
            borderWidth: 1,
            flexDirection: 'row',
            maxWidth: 560,
            minHeight: tokens.sizing.minimumTarget,
            paddingLeft: tokens.space.md,
            paddingRight: rendered.action ? tokens.space.xxs : tokens.space.md,
            paddingVertical: tokens.space.xs,
            width: '100%',
          },
          tokens.elevation.sticky,
        ]}
      >
        {palette.icon ? (
          <Ionicons
            color={palette.content}
            name={palette.icon}
            size={20}
            style={{ marginRight: tokens.space.xs }}
          />
        ) : null}

        {/*
          Canlı bölge ve `alert` rolü kutuya değil metne konur: kutuya konsaydı
          "Geri al" düğmesi ekran okuyucu için ayrı bir denetim olmaktan çıkıp
          duyurunun içinde kaybolurdu.
        */}
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          numberOfLines={3}
          style={[tokens.typography.body, { color: palette.content, flex: 1 }]}
        >
          {rendered.message}
        </Text>

        {rendered.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              const action = rendered.action;
              onDismiss();
              haptic('success');
              action?.onPress();
            }}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderRadius: tokens.radius.small,
              justifyContent: 'center',
              minHeight: tokens.sizing.minimumTarget,
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: tokens.space.sm,
            })}
          >
            <Text style={[tokens.typography.label, { color: palette.action }]}>
              {rendered.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

function snackbarPalette(
  colors: ReturnType<typeof useTheme>['colors'],
  tone: ServiceSnackbarTone,
): {
  background: string;
  border: string;
  content: string;
  action: string;
  icon?: keyof typeof Ionicons.glyphMap;
} {
  switch (tone) {
    case 'success':
      return {
        background: colors.state.delivered.bg,
        border: colors.state.delivered.border,
        content: colors.state.delivered.text,
        action: colors.state.delivered.text,
        icon: 'checkmark-circle-outline',
      };
    case 'warning':
      return {
        background: colors.state.pending.bg,
        border: colors.state.pending.border,
        content: colors.state.pending.text,
        action: colors.state.pending.text,
        icon: 'alert-circle-outline',
      };
    case 'error':
      return {
        background: colors.state.cancelled.bg,
        border: colors.state.cancelled.border,
        content: colors.state.cancelled.text,
        action: colors.state.cancelled.text,
        icon: 'close-circle-outline',
      };
    default:
      return {
        background: colors.secondary,
        border: colors.secondary,
        content: colors.surface,
        action: colors.surface,
      };
  }
}
