import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { captureOperationalError } from './telemetry';

interface ScreenErrorBoundaryState {
  readonly failed: boolean;
  readonly eventId?: string;
}

/**
 * Tek bir ekranı saran hata sınırı.
 *
 * Neden kök `AppErrorBoundary` yetmiyor: o, sağlayıcı ağacının en dışında
 * duruyor, dolayısıyla tek bir ekranın render hatası bütün kabuğu — gezinmeyi,
 * alt sekmeleri, açık masayı — birlikte düşürüyor. Garson için bu, "uygulama
 * gitti" demek.
 *
 * İkinci ve daha sinsi fark kurtarma eyleminde: `AppErrorBoundary`'nin "tekrar
 * dene"si yalnızca `failed` bayrağını sıfırlıyor, yani aynı çöken ağacı yeniden
 * çiziyor ve anında tekrar çöküyor. Burada kurtarma "geri dön": çöken ekrandan
 * çıkar, sınırı sıfırlar ve kullanıcıyı çalışan bir listeye bırakır.
 */
export class ScreenErrorBoundary extends React.Component<
  {
    readonly children: React.ReactNode;
    readonly screenName: string;
    readonly onGoBack?: () => void;
  },
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ScreenErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    this.setState({
      eventId: captureOperationalError(error, 'app_crash', {
        operation: 'screen_render',
        screen: this.props.screenName,
        errorClass: error instanceof Error ? error.name : 'UnknownError',
      }),
    });
  }

  private recover = (): void => {
    // Önce sınırı sıfırla, sonra geri dön. Ters sırada, çöken ekran bir kare
    // boyunca yeniden render olup sınırı anında tekrar tetikliyor.
    this.setState({ failed: false, eventId: undefined });
    this.props.onGoBack?.();
  };

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <View accessibilityRole="alert" style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          Bu ekran açılamadı
        </Text>
        <Text style={styles.body}>
          Kayıtlı siparişleriniz silinmedi. Geri dönüp tekrar deneyin; sorun sürerse olay kodunu
          yöneticinize iletin.
        </Text>
        {this.state.eventId ? <Text style={styles.code}>Olay: {this.state.eventId}</Text> : null}
        <Pressable accessibilityRole="button" onPress={this.recover} style={styles.button}>
          <Text style={styles.buttonText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  body: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 480,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    // Tema context'i hata sınırının içinde güvenilir değil; açık tema primary'si sabit yazılı.
    backgroundColor: '#BE4A26',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  code: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 12,
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
});
