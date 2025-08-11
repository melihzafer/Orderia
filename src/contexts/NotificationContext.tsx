import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOrderStore } from '../stores';
import { useLocalization } from '../i18n';

// Check if running in Expo Go (limited notifications) or development build
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  orderReady: boolean;
  kitchenAlerts: boolean;
  tableUpdates: boolean;
  preparationTime: number; // minutes
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  sendOrderReadyNotification: (tableNumber: string, orderItems: string[]) => void;
  sendKitchenAlert: (orderCount: number) => void;
  sendTableUpdateNotification: (tableNumber: string, status: string) => void;
  schedulePreparationReminder: (orderId: string, minutes: number) => void;
  cancelNotification: (notificationId: string) => void;
  isExpoGo: boolean;
  expoPushToken: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultSettings: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  orderReady: true,
  kitchenAlerts: true,
  tableUpdates: true,
  preparationTime: 15,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const { t } = useLocalization();

  useEffect(() => {
    loadSettings();
    
    // Show info about notification limitations in Expo Go
    if (isExpoGo) {
      console.info('ℹ️ Running in Expo Go: Local notifications will work, but push notifications are limited. For full notification support, use a development build.');
    }

    // Register for push notifications (skipped in Expo Go)
    registerForPushNotificationsAsync();

    // Notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // Vibrate if enabled
      if (settings.vibration) {
        Vibration.vibrate(400);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap
      const { type, tableId } = response.notification.request.content.data || {};
      
      if (type === 'order_ready' && tableId) {
        // Navigate to table detail
        // This could be handled by passing navigation ref or using a navigation service
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('@notification_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      await AsyncStorage.setItem('@notification_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    if (!settings.enabled) return;

    // Skip push notification registration in Expo Go
    if (isExpoGo) {
      console.warn('Push notifications are not fully supported in Expo Go. Local notifications will still work.');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          t.notificationPermission || 'Notification Permission',
          t.notificationPermissionMessage || 'Please enable notifications to receive order updates',
        );
        return;
      }

      // Try to get push token (may fail in Expo Go)
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        setExpoPushToken(token);
        console.log('✅ Expo push token obtained:', token);
      } catch (tokenError: any) {
        console.warn('⚠️ Could not get push token (expected in Expo Go):', tokenError?.message || 'Unknown error');
        setExpoPushToken(null);
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create specific channels for different notification types
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'notification_sound.wav',
        });

        await Notifications.setNotificationChannelAsync('kitchen', {
          name: 'Kitchen Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          sound: 'kitchen_alert.wav',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const sendOrderReadyNotification = async (tableNumber: string, orderItems: string[]) => {
    if (!settings.enabled || !settings.orderReady) return;

    try {
      const itemsList = orderItems.slice(0, 3).join(', ') + (orderItems.length > 3 ? '...' : '');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🍽️ ${t.orderReady || 'Order Ready'} - ${t.table || 'Table'} ${tableNumber}`,
          body: `${t.orderReadyMessage || 'Order is ready for delivery:'} ${itemsList}`,
          sound: settings.sound ? 'default' : undefined,
          data: {
            type: 'order_ready',
            tableId: tableNumber,
            items: orderItems,
          },
        },
        trigger: null, // Send immediately
      });

      // Also send kitchen display notification
      if (Platform.OS === 'ios') {
        // Local notification for kitchen display
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📋 ${t.kitchenDisplay || 'Kitchen Display'}`,
            body: `${t.table || 'Table'} ${tableNumber} - ${t.readyForPickup || 'Ready for pickup'}`,
            categoryIdentifier: 'KITCHEN_ACTION',
            data: {
              type: 'kitchen_display',
              tableId: tableNumber,
            },
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error sending order ready notification:', error);
    }
  };

  const sendKitchenAlert = async (orderCount: number) => {
    if (!settings.enabled || !settings.kitchenAlerts) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `👨‍🍳 ${t.kitchenAlert || 'Kitchen Alert'}`,
          body: `${orderCount} ${t.pendingOrders || 'pending orders'} ${t.awaitingPreparation || 'awaiting preparation'}`,
          sound: settings.sound ? 'kitchen_alert.wav' : undefined,
          data: {
            type: 'kitchen_alert',
            orderCount,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending kitchen alert:', error);
    }
  };

  const sendTableUpdateNotification = async (tableNumber: string, status: string) => {
    if (!settings.enabled || !settings.tableUpdates) return;

    try {
      let emoji = '📍';
      let statusText = status;
      
      switch (status) {
        case 'occupied':
          emoji = '🟢';
          statusText = t.occupied || 'Occupied';
          break;
        case 'available':
          emoji = '⚪';
          statusText = t.available || 'Available';
          break;
        case 'cleaning':
          emoji = '🧹';
          statusText = t.cleaning || 'Cleaning';
          break;
        case 'reserved':
          emoji = '🔒';
          statusText = t.reserved || 'Reserved';
          break;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} ${t.table || 'Table'} ${tableNumber} ${t.statusUpdate || 'Status Update'}`,
          body: `${t.tableStatus || 'Table status changed to'}: ${statusText}`,
          sound: settings.sound ? 'default' : undefined,
          data: {
            type: 'table_update',
            tableId: tableNumber,
            status,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending table update notification:', error);
    }
  };

  const schedulePreparationReminder = async (orderId: string, minutes: number) => {
    if (!settings.enabled) return;

    try {
      const notificationId = `prep_reminder_${orderId}`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${t.preparationReminder || 'Preparation Reminder'}`,
          body: `${t.orderShouldBeReady || 'Order should be ready in'} ${minutes} ${t.minutes || 'minutes'}`,
          sound: settings.sound ? 'default' : undefined,
          data: {
            type: 'preparation_reminder',
            orderId,
            notificationId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: (minutes - 5) * 60, // Remind 5 minutes before expected ready time
        },
        identifier: notificationId,
      });
    } catch (error) {
      console.error('Error scheduling preparation reminder:', error);
    }
  };

  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const value: NotificationContextType = {
    settings,
    updateSettings,
    sendOrderReadyNotification,
    sendKitchenAlert,
    sendTableUpdateNotification,
    schedulePreparationReminder,
    cancelNotification,
    isExpoGo,
    expoPushToken,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
