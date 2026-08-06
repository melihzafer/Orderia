import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { Vibration } from 'react-native';
import {
  NotificationProvider,
  NotificationSettings,
  useNotifications,
} from '../NotificationContext';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

jest.mock('../../design-system', () => ({
  useSnackbar: () => ({ show: jest.fn() }),
}));

jest.mock('../../i18n', () => ({
  useLocalization: () => ({ t: {} }),
}));

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;
const defaultSettings: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  orderReady: true,
  kitchenAlerts: true,
  tableUpdates: true,
  preparationTime: 15,
};

describe('NotificationProvider', () => {
  let latest: ReturnType<typeof useNotifications> | undefined;
  let receivedListener: ((notification: never) => void) | undefined;

  beforeEach(async () => {
    latest = undefined;
    receivedListener = undefined;
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'push-token' } as never);
    mockedNotifications.addNotificationReceivedListener.mockImplementation((listener) => {
      receivedListener = listener as (notification: never) => void;
      return {} as never;
    });
    mockedNotifications.addNotificationResponseReceivedListener.mockReturnValue({} as never);
    jest.spyOn(Vibration, 'vibrate').mockImplementation(jest.fn());
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hydrates a persisted opt-out before push registration', async () => {
    await AsyncStorage.setItem(
      '@notification_settings',
      JSON.stringify({ ...defaultSettings, enabled: false }),
    );

    await renderProvider();

    await waitFor(() => {
      expect(latest?.settings.enabled).toBe(false);
    });
    expect(mockedNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('uses the latest vibration setting in its notification listener', async () => {
    await renderProvider();

    await waitFor(() => {
      expect(receivedListener).toBeDefined();
    });
    await act(async () => {
      await latest?.updateSettings({ vibration: false });
    });
    receivedListener?.({} as never);
    expect(Vibration.vibrate).not.toHaveBeenCalled();

    await act(async () => {
      await latest?.updateSettings({ vibration: true });
    });
    receivedListener?.({} as never);
    expect(Vibration.vibrate).toHaveBeenCalledWith(400);
  });

  it('merges rapid settings updates from the current settings snapshot', async () => {
    await renderProvider();

    await waitFor(() => {
      expect(latest).toBeDefined();
    });
    await act(async () => {
      await Promise.all([
        latest?.updateSettings({ sound: false }),
        latest?.updateSettings({ vibration: false }),
      ]);
    });

    expect(latest?.settings).toMatchObject({ sound: false, vibration: false });
    expect(
      JSON.parse((await AsyncStorage.getItem('@notification_settings')) ?? '{}'),
    ).toMatchObject({
      sound: false,
      vibration: false,
    });
  });

  async function renderProvider() {
    let screen: ReturnType<typeof render> | undefined;
    await act(async () => {
      screen = render(
        <NotificationProvider>
          <NotificationProbe />
        </NotificationProvider>,
      );
    });
    return screen;
  }

  function NotificationProbe() {
    const notifications = useNotifications();
    useEffect(() => {
      latest = notifications;
    }, [notifications]);
    return null;
  }
});
