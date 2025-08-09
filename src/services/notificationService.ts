import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
});

export interface DeliveryNotificationSchedule {
  notificationIds: string[];
  ticketId: string;
  estimatedMinutes: number;
}

class NotificationService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('delivery-updates', {
          name: 'Delivery Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
          sound: 'default',
        });
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async scheduleDeliveryNotifications(
    ticketId: string,
    ticketName: string,
    estimatedMinutes: number
  ): Promise<string[]> {
    await this.initialize();

    const notificationIds: string[] = [];
    const now = new Date();

    // Schedule notifications at 70%, 85%, and 100% of delivery time (more backend-loaded)
    const progressPoints = [
      { percent: 70, message: '70% progress - Getting close!' },
      { percent: 85, message: '85% progress - Almost ready!' },
      { percent: 100, message: '🍽️ Order ready for delivery!' }
    ];

    for (const point of progressPoints) {
      // Calculate trigger time correctly: percentage of TOTAL estimated time
      const triggerMinutes = Math.floor((estimatedMinutes * point.percent) / 100);
      
      // Skip notifications that would trigger immediately or in the past
      if (triggerMinutes < 1) {
        console.log(`Skipping ${point.percent}% notification - would trigger in ${triggerMinutes} minutes`);
        continue;
      }
      
      const triggerTime = new Date(now.getTime() + triggerMinutes * 60 * 1000);

      try {
        console.log(`Scheduling ${point.percent}% notification for ${triggerMinutes} minutes from now (${triggerTime.toLocaleTimeString()})`);
        console.log(`Estimated total time: ${estimatedMinutes} minutes, trigger at ${point.percent}%`);
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${ticketName || 'Order'} Update`,
            body: point.message,
            data: {
              ticketId,
              progress: point.percent,
              type: 'delivery-update'
            },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: triggerMinutes * 60,
          },
        });

        notificationIds.push(notificationId);
      } catch (error) {
        console.error(`Failed to schedule ${point.percent}% notification:`, error);
      }
    }

    return notificationIds;
  }

  async cancelDeliveryNotifications(notificationIds: string[]): Promise<void> {
    if (!notificationIds || notificationIds.length === 0) return;

    try {
      await Promise.all(
        notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id))
      );
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Get notification listener for handling taps
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Get listener for notifications received while app is open
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
