import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { captureOperationalError } from './telemetry';

interface AppErrorBoundaryState {
  readonly failed: boolean;
  readonly eventId?: string;
}

export class AppErrorBoundary extends React.Component<
  { readonly children: React.ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    this.setState({
      eventId: captureOperationalError(error, 'app_crash', {
        operation: 'react_render',
        errorClass: error instanceof Error ? error.name : 'UnknownError',
      }),
    });
  }

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <View accessibilityRole="alert" style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          Orderia güvenli biçimde durdu
        </Text>
        <Text style={styles.body}>
          Kayıtlı siparişleriniz silinmedi. Ekranı yeniden deneyin; sorun sürerse olay kodunu
          yöneticinize iletin.
        </Text>
        {this.state.eventId ? <Text style={styles.code}>Olay: {this.state.eventId}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ failed: false, eventId: undefined })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Tekrar dene</Text>
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
    backgroundColor: '#0F766E',
    borderRadius: 12,
    minHeight: 52,
    justifyContent: 'center',
    marginTop: 20,
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
