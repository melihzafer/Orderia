import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../contexts/ThemeContext';
import {
  ServiceActionSheet,
  ServiceConfirmSheet,
  ServiceSwipeRow,
  SnackbarProvider,
  useSnackbar,
} from '../components';
import { motionDuration } from '../useReducedMotion';

jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => ({
  __esModule: true,
  default: 'ActivityIndicator',
}));

/**
 * DİKKAT — bu depodaki test renderer'ının bilinen sınırı: tek bir `it` bloğunda
 * ikinci `fireEvent.press` çağrıldığında renderer bozuluyor ve dosyadaki sonraki
 * bütün testler boş ağaç görüyor. Bu yüzden her test en fazla bir etkileşim yapar;
 * iki adımlı akışlar ayrı testlere bölünmüştür.
 */

// Alt sayfa ve snackbar güvenli alan boşluğunu okur; App.tsx'te sağlayıcı köke
// kurulu, testte de aynı çerçeve verilir.
const insets = { bottom: 34, left: 0, right: 0, top: 47 };
const frame = { height: 852, width: 393, x: 0, y: 0 };

async function renderWithTheme(element: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={{ frame, insets }}>
      <ThemeProvider>{element}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

const confirmProps = {
  body: 'Table 4 will be removed from the hall.',
  cancelLabel: 'Keep table',
  confirmLabel: 'Delete table',
  destructive: true,
  title: 'Delete table?',
  visible: true,
};

describe('ServiceConfirmSheet', () => {
  it('names the outcome on the confirming action rather than a generic acknowledgement', async () => {
    const screen = await renderWithTheme(
      <ServiceConfirmSheet {...confirmProps} onClose={jest.fn()} onConfirm={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Delete table' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
  });

  it('leaves the data alone when the user backs out', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <ServiceConfirmSheet {...confirmProps} onClose={onClose} onConfirm={onConfirm} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Keep table' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs the destructive action when it is explicitly confirmed', async () => {
    const onConfirm = jest.fn();
    const screen = await renderWithTheme(
      <ServiceConfirmSheet {...confirmProps} onClose={jest.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Delete table' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks a second submission while the first is still running', async () => {
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <ServiceConfirmSheet {...confirmProps} busy onClose={onClose} onConfirm={jest.fn()} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Keep table' }));

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ServiceActionSheet', () => {
  const actions = [
    { icon: 'pencil-outline' as const, id: 'edit', label: 'Edit table', onPress: jest.fn() },
    {
      destructive: true,
      icon: 'trash-outline' as const,
      id: 'delete',
      label: 'Delete table',
      onPress: jest.fn(),
    },
  ];

  it('always offers a way out that changes nothing', async () => {
    const screen = await renderWithTheme(
      <ServiceActionSheet
        actions={actions}
        cancelLabel="Cancel"
        onClose={jest.fn()}
        title="Table 4"
        visible
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByText('Delete table')).toBeTruthy();
  });

  it('closes before running the action so two layers never stack up', async () => {
    const onEdit = jest.fn();
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <ServiceActionSheet
        actions={[{ ...actions[0], onPress: onEdit }]}
        cancelLabel="Cancel"
        onClose={onClose}
        title="Table 4"
        visible
      />,
    );

    fireEvent.press(screen.getByText('Edit table'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('does not fire a disabled action', async () => {
    const onPress = jest.fn();
    const screen = await renderWithTheme(
      <ServiceActionSheet
        actions={[{ ...actions[1], disabled: true, onPress }]}
        cancelLabel="Cancel"
        onClose={jest.fn()}
        title="Table 4"
        visible
      />,
    );

    fireEvent.press(screen.getByText('Delete table'));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ServiceSwipeRow', () => {
  const deleteAction = {
    destructive: true,
    icon: 'trash-outline' as const,
    id: 'delete',
    label: 'Delete',
    onPress: jest.fn(),
  };

  it('keeps the swipe actions reachable as labelled buttons, not gesture-only affordances', async () => {
    const onPress = jest.fn();
    const screen = await renderWithTheme(
      <ServiceSwipeRow actions={[{ ...deleteAction, onPress }]}>
        <Text>Table 4</Text>
      </ServiceSwipeRow>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes a long-press path to the same contextual actions', async () => {
    const onLongPress = jest.fn();
    const screen = await renderWithTheme(
      <ServiceSwipeRow actions={[deleteAction]} onLongPress={onLongPress}>
        <Text>Table 4</Text>
      </ServiceSwipeRow>,
    );

    fireEvent(screen.getByText('Table 4'), 'longPress');

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('renders plain content when there is nothing contextual to offer', async () => {
    const screen = await renderWithTheme(
      <ServiceSwipeRow actions={[]}>
        <Text>Table 4</Text>
      </ServiceSwipeRow>,
    );

    expect(screen.getByText('Table 4')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });
});

describe('snackbar undo host', () => {
  /** Mesajı takılır takılmaz gösterir; testin tek etkileşimi "Geri al"a kalsın. */
  function Harness({
    duration,
    onUndo,
  }: {
    readonly duration?: number;
    readonly onUndo: () => void;
  }) {
    const { show } = useSnackbar();
    useEffect(() => {
      show({ action: { label: 'Undo', onPress: onUndo }, duration, message: 'Table 4 deleted' });
    }, [duration, onUndo, show]);
    return <Text>host</Text>;
  }

  it('reports what happened after a destructive action', async () => {
    const screen = await renderWithTheme(
      <SnackbarProvider>
        <Harness onUndo={jest.fn()} />
      </SnackbarProvider>,
    );

    expect(screen.getByText('Table 4 deleted')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
  });

  it('hands control back to the caller when undo is taken', async () => {
    const onUndo = jest.fn();
    const screen = await renderWithTheme(
      <SnackbarProvider>
        <Harness onUndo={onUndo} />
      </SnackbarProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('announces the message to assistive technology as a live region', async () => {
    const screen = await renderWithTheme(
      <SnackbarProvider>
        <Harness onUndo={jest.fn()} />
      </SnackbarProvider>,
    );

    expect(screen.getByRole('alert').props.accessibilityLiveRegion).toBe('polite');
  });

  it('retires the message on its own so it never blocks the bottom of the screen', async () => {
    const screen = await renderWithTheme(
      <SnackbarProvider>
        <Harness duration={80} onUndo={jest.fn()} />
      </SnackbarProvider>,
    );

    expect(screen.getByText('Table 4 deleted')).toBeTruthy();

    await waitFor(() => {
      expect(screen.queryByText('Table 4 deleted')).toBeNull();
    });
  });
});

describe('motionDuration', () => {
  it('collapses animation to an instant change when the user asked for less motion', () => {
    expect(motionDuration(240, true)).toBe(0);
    expect(motionDuration(240, false)).toBe(240);
  });
});
