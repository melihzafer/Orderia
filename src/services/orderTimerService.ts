import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';

// React Native uyumlu EventEmitter implementasyonu
class ReactNativeEventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

interface OrderTimer {
  orderId: string;
  itemId: string;
  itemName: string;
  startTime: number;
  estimatedDuration: number; // minutes
  currentProgress: number; // 0-100
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  notificationId?: string;
  lastUpdateTime: number;
}

interface TimerUpdate {
  orderId: string;
  itemId: string;
  itemName: string;
  progress: number;
  status: string;
  timeRemaining: number;
  estimatedFinishTime: number;
}

class OrderTimerService extends ReactNativeEventEmitter {
  private timers: Map<string, OrderTimer> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly STORAGE_KEY = 'order_timers';
  private readonly UPDATE_INTERVAL = 1000; // 1 second
  private appState: AppStateStatus = 'active';
  private backgroundTime: number = 0;
  private appStateSubscription: any = null;
  
  constructor() {
    super();
    this.loadPersistedTimers();
    this.setupAppStateHandling();
    this.setupNotificationHandling();
  }
  
  // Handle app state changes to prevent timer drift
  private setupAppStateHandling() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }
  
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (this.appState === 'background' && nextAppState === 'active') {
      // App came back from background - sync timers
      this.syncTimersAfterBackground();
    } else if (this.appState === 'active' && nextAppState === 'background') {
      // App went to background
      this.backgroundTime = Date.now();
    }
    
    this.appState = nextAppState;
  };
  
  private syncTimersAfterBackground() {
    if (this.backgroundTime === 0) return;
    
    const backgroundDuration = Date.now() - this.backgroundTime;
    
    // Update all active timers with the time that passed in background
    this.timers.forEach((timer) => {
      if (timer.status === 'active') {
        timer.lastUpdateTime = Date.now();
        this.updateTimer(timer.orderId, timer.itemId);
      }
    });
    
    this.backgroundTime = 0;
  }
  
  // Setup notification handling
  private async setupNotificationHandling() {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'timer_complete' && typeof data.orderId === 'string' && typeof data.itemId === 'string') {
        this.handleNotificationReceived(data.orderId, data.itemId);
      }
    });
  }
  
  private handleNotificationReceived(orderId: string, itemId: string) {
    this.emit('notificationReceived', { orderId, itemId });
  }
  
  // Persist timers across app restarts
  private async loadPersistedTimers() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const timers: OrderTimer[] = JSON.parse(stored);
        const now = Date.now();
        
        timers.forEach(timer => {
          // Only restore active timers that haven't expired
          if (timer.status === 'active') {
            const elapsedSinceLastUpdate = now - timer.lastUpdateTime;
            const totalElapsed = now - timer.startTime;
            const expectedDuration = timer.estimatedDuration * 60 * 1000; // Convert to ms
            
            if (totalElapsed < expectedDuration * 1.5) { // Allow 50% overtime
              timer.lastUpdateTime = now;
              this.timers.set(this.getTimerKey(timer.orderId, timer.itemId), timer);
              this.startTimerInterval(timer.orderId, timer.itemId);
            } else {
              // Auto-complete overdue timers
              timer.status = 'completed';
              timer.currentProgress = 100;
              this.timers.set(this.getTimerKey(timer.orderId, timer.itemId), timer);
            }
          }
        });
        
        this.persistTimers();
      }
    } catch (error) {
      console.error('Error loading persisted timers:', error);
    }
  }
  
  private async persistTimers() {
    try {
      const timersArray = Array.from(this.timers.values());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(timersArray));
    } catch (error) {
      console.error('Error persisting timers:', error);
    }
  }
  
  private getTimerKey(orderId: string, itemId: string): string {
    return `${orderId}-${itemId}`;
  }
  
  async startTimer(orderId: string, itemId: string, itemName: string, estimatedMinutes: number) {
    const key = this.getTimerKey(orderId, itemId);
    const now = Date.now();
    
    const timer: OrderTimer = {
      orderId,
      itemId,
      itemName,
      startTime: now,
      estimatedDuration: estimatedMinutes,
      currentProgress: 0,
      status: 'active',
      lastUpdateTime: now,
    };
    
    this.timers.set(key, timer);
    await this.persistTimers();
    this.startTimerInterval(orderId, itemId);
    
    // Schedule completion notification
    await this.scheduleCompletionNotification(timer);
    
    this.emit('timerStarted', { orderId, itemId, itemName });
  }
  
  private startTimerInterval(orderId: string, itemId: string) {
    const key = this.getTimerKey(orderId, itemId);
    
    if (this.intervals.has(key)) {
      clearInterval(this.intervals.get(key)!);
    }
    
    const interval = setInterval(() => {
      this.updateTimer(orderId, itemId);
    }, this.UPDATE_INTERVAL);
    
    this.intervals.set(key, interval);
  }
  
  private updateTimer(orderId: string, itemId: string) {
    const key = this.getTimerKey(orderId, itemId);
    const timer = this.timers.get(key);
    
    if (!timer || timer.status !== 'active') {
      return;
    }
    
    const now = Date.now();
    const elapsed = now - timer.startTime;
    const elapsedMinutes = elapsed / (1000 * 60);
    const progress = Math.min((elapsedMinutes / timer.estimatedDuration) * 100, 100);
    
    timer.currentProgress = progress;
    timer.lastUpdateTime = now;
    
    const timeRemaining = Math.max(timer.estimatedDuration - elapsedMinutes, 0);
    const estimatedFinishTime = timer.startTime + (timer.estimatedDuration * 60 * 1000);
    
    // Emit update for UI
    const update: TimerUpdate = {
      orderId,
      itemId,
      itemName: timer.itemName,
      progress,
      status: timer.status,
      timeRemaining,
      estimatedFinishTime,
    };
    
    this.emit('timerUpdate', update);
    
    // Auto-complete when 100%
    if (progress >= 100 && timer.status === 'active') {
      this.completeTimer(orderId, itemId);
    }
    
    // Async persist (don't await to avoid blocking)
    this.persistTimers();
  }
  
  async completeTimer(orderId: string, itemId: string) {
    const key = this.getTimerKey(orderId, itemId);
    const timer = this.timers.get(key);
    
    if (timer) {
      timer.status = 'completed';
      timer.currentProgress = 100;
      timer.lastUpdateTime = Date.now();
      
      // Clear interval
      if (this.intervals.has(key)) {
        clearInterval(this.intervals.get(key)!);
        this.intervals.delete(key);
      }
      
      // Send completion notification if app is not active
      if (this.appState !== 'active') {
        await this.sendCompletionNotification(timer);
      }
      
      this.emit('timerCompleted', { 
        orderId, 
        itemId, 
        itemName: timer.itemName 
      });
      
      await this.persistTimers();
    }
  }
  
  private async scheduleCompletionNotification(timer: OrderTimer) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ Order Ready!',
          body: `${timer.itemName} in order ${timer.orderId} is ready to serve`,
          data: { 
            orderId: timer.orderId, 
            itemId: timer.itemId,
            type: 'timer_complete'
          },
          sound: true,
          badge: 1,
        },
        trigger: {
          seconds: Math.max(timer.estimatedDuration * 60, 5), // At least 5 seconds
        } as Notifications.TimeIntervalTriggerInput,
      });
      
      timer.notificationId = notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }
  
  private async sendCompletionNotification(timer: OrderTimer) {
    try {
      await Notifications.presentNotificationAsync({
        title: '🎉 Order Item Ready!',
        body: `${timer.itemName} from order ${timer.orderId} is ready to serve!`,
        data: { 
          orderId: timer.orderId, 
          itemId: timer.itemId,
          type: 'timer_complete'
        },
      });
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }
  
  getTimerProgress(orderId: string, itemId: string): number {
    const key = this.getTimerKey(orderId, itemId);
    const timer = this.timers.get(key);
    return timer?.currentProgress || 0;
  }
  
  getTimerStatus(orderId: string, itemId: string): string {
    const key = this.getTimerKey(orderId, itemId);
    const timer = this.timers.get(key);
    return timer?.status || 'inactive';
  }
  
  getTimerColor(progress: number): string {
    if (progress < 25) return '#10B981'; // Green - just started
    if (progress < 50) return '#84CC16'; // Light green - progressing
    if (progress < 75) return '#F59E0B'; // Yellow - halfway
    if (progress < 90) return '#F97316'; // Orange - almost done
    if (progress < 100) return '#EF4444'; // Red - overdue
    return '#8B5CF6'; // Purple - completed
  }
  
  getProgressLabel(progress: number): string {
    if (progress < 25) return 'Starting';
    if (progress < 50) return 'In Progress';
    if (progress < 75) return 'Halfway';
    if (progress < 90) return 'Almost Ready';
    if (progress < 100) return 'Should be Ready';
    return 'Completed';
  }
  
  pauseTimer(orderId: string, itemId: string) {
    const key = this.getTimerKey(orderId, itemId);
    const timer = this.timers.get(key);
    
    if (timer && timer.status === 'active') {
      timer.status = 'paused';
      timer.lastUpdateTime = Date.now();
      
      if (this.intervals.has(key)) {
        clearInterval(this.intervals.get(key)!);
        this.intervals.delete(key);
      }
      
      // Cancel scheduled notification
      if (timer.notificationId) {
        Notifications.cancelScheduledNotificationAsync(timer.notificationId);
        timer.notificationId = undefined;
      }
      
      this.emit('timerPaused', { orderId, itemId, itemName: timer.itemName });
      this.persistTimers();
    }
  }
  
  resumeTimer(orderId: string, itemId: string) {
    const key = this.getTimerKey(orderId, itemId);
    const timer = this.timers.get(key);
    
    if (timer && timer.status === 'paused') {
      const now = Date.now();
      const pausedDuration = now - timer.lastUpdateTime;
      
      // Adjust start time to account for pause duration
      timer.startTime += pausedDuration;
      timer.status = 'active';
      timer.lastUpdateTime = now;
      
      this.startTimerInterval(orderId, itemId);
      
      // Reschedule notification
      this.scheduleCompletionNotification(timer);
      
      this.emit('timerResumed', { orderId, itemId, itemName: timer.itemName });
      this.persistTimers();
    }
  }
  
  cancelTimer(orderId: string, itemId: string) {
    const key = this.getTimerKey(orderId, itemId);
    const timer = this.timers.get(key);
    
    if (timer) {
      timer.status = 'cancelled';
      timer.lastUpdateTime = Date.now();
      
      // Cancel scheduled notification
      if (timer.notificationId) {
        Notifications.cancelScheduledNotificationAsync(timer.notificationId);
      }
      
      // Clear interval
      if (this.intervals.has(key)) {
        clearInterval(this.intervals.get(key)!);
        this.intervals.delete(key);
      }
      
      this.emit('timerCancelled', { orderId, itemId, itemName: timer.itemName });
      this.timers.delete(key);
      this.persistTimers();
    }
  }
  
  getAllActiveTimers(): OrderTimer[] {
    return Array.from(this.timers.values()).filter(timer => 
      timer.status === 'active' || timer.status === 'paused'
    );
  }
  
  getOrderTimers(orderId: string): OrderTimer[] {
    return Array.from(this.timers.values()).filter(timer => 
      timer.orderId === orderId
    );
  }
  
  // Get statistics for analytics
  getTimerStats() {
    const allTimers = Array.from(this.timers.values());
    return {
      total: allTimers.length,
      active: allTimers.filter(t => t.status === 'active').length,
      paused: allTimers.filter(t => t.status === 'paused').length,
      completed: allTimers.filter(t => t.status === 'completed').length,
      cancelled: allTimers.filter(t => t.status === 'cancelled').length,
    };
  }
  
  cleanup() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.removeAllListeners();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export const orderTimerService = new OrderTimerService();
export type { OrderTimer, TimerUpdate };
