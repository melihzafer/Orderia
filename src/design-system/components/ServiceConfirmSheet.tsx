import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton } from './ServiceButton';
import { ServiceSheet } from './ServiceSheet';

export interface ServiceConfirmSheetProps {
  readonly visible: boolean;
  readonly title: string;
  /** Ne olacağını düz dille anlatır. Ham hata metni buraya konmaz. */
  readonly body: string;
  /** Sonucu betimleyen etiket — "Sil", "Verileri sıfırla". "Tamam" değil. */
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly destructive?: boolean;
  readonly busy?: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

/**
 * Geri alınamayan işlemlerin kapısı. `Alert.alert` ve `window.confirm` yerine geçer:
 * ikisi de platformun kendi kabuğunu çizip ürünün kimliğinden kopuyordu, ve
 * `window.confirm` kurulu PWA içinde tarayıcı diyaloğu gösteriyordu.
 *
 * Arka plana dokunarak kapanmaz (`dismissible={false}`): kullanıcı iptal ettiğini
 * açıkça söylemeli, kazayla değil.
 */
export function ServiceConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: ServiceConfirmSheetProps) {
  const { tokens } = useTheme();

  return (
    <ServiceSheet dismissible={false} onClose={onClose} title={title} visible={visible}>
      <View style={{ paddingHorizontal: tokens.space.md }}>
        <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: destructive
                ? tokens.colors.state.cancelled.bg
                : tokens.colors.accentSoft,
              borderRadius: tokens.radius.medium,
              height: 40,
              justifyContent: 'center',
              width: 40,
            }}
          >
            <Ionicons
              color={destructive ? tokens.colors.error : tokens.colors.accent}
              name={destructive ? 'warning-outline' : 'help-circle-outline'}
              size={22}
            />
          </View>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle, flex: 1 }]}>
            {body}
          </Text>
        </View>

        {/*
          İptal önce ve tam genişlikte durur, onay altında: baş parmağın alt kenara
          en yakın refleks hedefi yıkıcı olan olmasın.
        */}
        <View style={{ gap: tokens.space.xs, marginTop: tokens.space.lg }}>
          <ServiceButton
            disabled={busy}
            fullWidth
            label={cancelLabel}
            onPress={onClose}
            variant="outline"
          />
          <ServiceButton
            fullWidth
            label={confirmLabel}
            loading={busy}
            onPress={onConfirm}
            variant={destructive ? 'danger' : 'primary'}
          />
        </View>
      </View>
    </ServiceSheet>
  );
}
