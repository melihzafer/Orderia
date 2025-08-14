import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Animated,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { orderTimerService, TimerUpdate, OrderTimer } from '../services/orderTimerService';
import { spacing, radius } from '../constants/branding';

interface NotificationCenterProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isVisible, onClose }: NotificationCenterProps) {
  const { colors } = useTheme();
  const { t } = useLocalization();
  
  const [activeTimers, setActiveTimers] = useState<OrderTimer[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<TimerUpdate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed'>('active');
  
  const slideAnim = useRef(new Animated.Value(300)).current;
  const screenWidth = Dimensions.get('window').width;
  
  useEffect(() => {
    if (isVisible) {
      loadTimers();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible, slideAnim]);
  
  const loadTimers = () => {
    setActiveTimers(orderTimerService.getAllActiveTimers());
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    loadTimers();
    setRefreshing(false);
  };
  
  useEffect(() => {
    const handleTimerUpdate = (update: TimerUpdate) => {
      setRecentUpdates(prev => {
        const newUpdates = [update, ...prev.slice(0, 9)]; // Keep last 10
        return newUpdates;
      });
      loadTimers();
    };
    
    const handleTimerCompleted = (data: { orderId: string; itemId: string; itemName: string }) => {
      loadTimers();
      // Show in-app alert for completion
      Alert.alert(
        '🎉 ' + (t.orderReady || 'Order Ready!'),
        `${data.itemName} from order ${data.orderId} is ready to serve!`,
        [
          { 
            text: t.ok || 'OK', 
            onPress: () => {
              // Auto-focus on the completed order
              setSelectedTab('completed');
            }
          }
        ]
      );
    };
    
    const handleTimerStarted = (data: { orderId: string; itemId: string; itemName: string }) => {
      loadTimers();
    };
    
    const handleTimerPaused = (data: { orderId: string; itemId: string; itemName: string }) => {
      loadTimers();
    };
    
    const handleTimerResumed = (data: { orderId: string; itemId: string; itemName: string }) => {
      loadTimers();
    };
    
    const handleTimerCancelled = (data: { orderId: string; itemId: string; itemName: string }) => {
      loadTimers();
    };
    
    // Subscribe to all timer events
    orderTimerService.on('timerUpdate', handleTimerUpdate);
    orderTimerService.on('timerCompleted', handleTimerCompleted);
    orderTimerService.on('timerStarted', handleTimerStarted);
    orderTimerService.on('timerPaused', handleTimerPaused);
    orderTimerService.on('timerResumed', handleTimerResumed);
    orderTimerService.on('timerCancelled', handleTimerCancelled);
    
    return () => {
      orderTimerService.off('timerUpdate', handleTimerUpdate);
      orderTimerService.off('timerCompleted', handleTimerCompleted);
      orderTimerService.off('timerStarted', handleTimerStarted);
      orderTimerService.off('timerPaused', handleTimerPaused);
      orderTimerService.off('timerResumed', handleTimerResumed);
      orderTimerService.off('timerCancelled', handleTimerCancelled);
    };
  }, [t]);
  
  const renderProgressBar = (progress: number) => {
    const color = orderTimerService.getTimerColor(progress);
    
    return (
      <View style={{
        height: 8,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.sm,
        marginTop: spacing.sm,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: color,
          borderRadius: radius.sm,
        }} />
      </View>
    );
  };
  
  const formatTimeRemaining = (timeRemaining: number): string => {
    if (timeRemaining <= 0) return t.ready || 'Ready!';
    
    const hours = Math.floor(timeRemaining / 60);
    const minutes = Math.floor(timeRemaining % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  const renderActiveTimer = (timer: OrderTimer) => {
    const elapsed = Date.now() - timer.startTime;
    const elapsedMinutes = elapsed / (1000 * 60);
    const timeRemaining = Math.max(timer.estimatedDuration - elapsedMinutes, 0);
    const isOverdue = timeRemaining <= 0 && timer.status === 'active';
    
    return (
      <View
        key={`${timer.orderId}-${timer.itemId}`}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderLeftWidth: 4,
          borderLeftColor: orderTimerService.getTimerColor(timer.currentProgress),
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.text,
            }}>
              {timer.itemName}
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.textSubtle,
              marginTop: spacing.xs,
            }}>
              Order #{timer.orderId}
            </Text>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: orderTimerService.getTimerColor(timer.currentProgress),
            }}>
              {Math.round(timer.currentProgress)}%
            </Text>
            <Text style={{
              fontSize: 12,
              color: isOverdue ? colors.error : colors.textSubtle,
              fontWeight: isOverdue ? '600' : 'normal',
            }}>
              {formatTimeRemaining(timeRemaining)}
            </Text>
          </View>
        </View>
        
        {renderProgressBar(timer.currentProgress)}
        
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.sm,
        }}>
          <Text style={{
            fontSize: 12,
            color: colors.textSubtle,
          }}>
            {orderTimerService.getProgressLabel(timer.currentProgress)}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {timer.status === 'active' ? (
              <TouchableOpacity
                onPress={() => orderTimerService.pauseTimer(timer.orderId, timer.itemId)}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  backgroundColor: colors.warning + '20',
                  borderRadius: radius.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
                accessibilityLabel={t.pause || 'Pause timer'}
              >
                <Ionicons name="pause" size={12} color={colors.warning} />
                <Text style={{ fontSize: 12, color: colors.warning, fontWeight: '500' }}>
                  {t.pause || 'Pause'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => orderTimerService.resumeTimer(timer.orderId, timer.itemId)}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  backgroundColor: colors.success + '20',
                  borderRadius: radius.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
                accessibilityLabel={t.resume || 'Resume timer'}
              >
                <Ionicons name="play" size={12} color={colors.success} />
                <Text style={{ fontSize: 12, color: colors.success, fontWeight: '500' }}>
                  {t.resume || 'Resume'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={() => orderTimerService.completeTimer(timer.orderId, timer.itemId)}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                backgroundColor: colors.success + '20',
                borderRadius: radius.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
              accessibilityLabel={t.markAsComplete || 'Mark as complete'}
            >
              <Ionicons name="checkmark" size={12} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.success, fontWeight: '500' }}>
                {t.complete || 'Done'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  t.cancelTimer || 'Cancel Timer',
                  `${t.cancelTimerConfirm || 'Are you sure you want to cancel the timer for'} ${timer.itemName}?`,
                  [
                    { text: t.cancel || 'Cancel', style: 'cancel' },
                    { 
                      text: t.delete || 'Delete', 
                      style: 'destructive',
                      onPress: () => orderTimerService.cancelTimer(timer.orderId, timer.itemId)
                    }
                  ]
                );
              }}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                backgroundColor: colors.error + '10',
                borderRadius: radius.sm,
              }}
              accessibilityLabel={t.cancelTimer || 'Cancel timer'}
            >
              <Ionicons name="close" size={12} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  const renderTabBar = () => (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing.xs,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
    }}>
      <TouchableOpacity
        onPress={() => setSelectedTab('active')}
        style={{
          flex: 1,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          backgroundColor: selectedTab === 'active' ? colors.primary : 'transparent',
        }}
      >
        <Text style={{
          textAlign: 'center',
          fontSize: 14,
          fontWeight: '600',
          color: selectedTab === 'active' ? colors.primaryContrast : colors.text,
        }}>
          {t.activeTimers || 'Active'} ({activeTimers.filter(t => t.status === 'active' || t.status === 'paused').length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => setSelectedTab('completed')}
        style={{
          flex: 1,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          backgroundColor: selectedTab === 'completed' ? colors.primary : 'transparent',
        }}
      >
        <Text style={{
          textAlign: 'center',
          fontSize: 14,
          fontWeight: '600',
          color: selectedTab === 'completed' ? colors.primaryContrast : colors.text,
        }}>
          {t.recentUpdates || 'Updates'} ({recentUpdates.length})
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderRecentUpdates = () => (
    <View style={{ padding: spacing.md }}>
      {recentUpdates.length === 0 ? (
        <Text style={{
          fontSize: 14,
          color: colors.textSubtle,
          textAlign: 'center',
          marginTop: spacing.lg,
        }}>
          {t.noRecentUpdates || 'No recent updates'}
        </Text>
      ) : (
        recentUpdates.map((update, index) => (
          <View
            key={`${update.orderId}-${update.itemId}-${index}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.sm,
              backgroundColor: colors.surface,
              borderRadius: radius.sm,
              marginBottom: spacing.xs,
              borderLeftWidth: 3,
              borderLeftColor: orderTimerService.getTimerColor(update.progress),
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.text,
              }}>
                {update.itemName}
              </Text>
              <Text style={{
                fontSize: 12,
                color: colors.textSubtle,
              }}>
                Order #{update.orderId} • {Math.round(update.progress)}%
              </Text>
            </View>
            <Text style={{
              fontSize: 12,
              color: orderTimerService.getTimerColor(update.progress),
              fontWeight: '600',
            }}>
              {orderTimerService.getProgressLabel(update.progress)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
  
  if (!isVisible) return null;
  
  return (
    <Animated.View style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: Math.min(screenWidth * 0.85, 350),
      backgroundColor: colors.bg,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      transform: [{ translateX: slideAnim }],
      zIndex: 1000,
      shadowColor: colors.text,
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <View>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
          }}>
            {t.notifications || 'Notifications'}
          </Text>
          <Text style={{
            fontSize: 12,
            color: colors.textSubtle,
          }}>
            {orderTimerService.getTimerStats().active} {t.activeTimers || 'active timers'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={onClose}
          style={{
            padding: spacing.sm,
            borderRadius: radius.sm,
          }}
          accessibilityLabel={t.close || 'Close'}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Tab Bar */}
      {renderTabBar()}
      
      {/* Content */}
      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {selectedTab === 'active' ? (
          <View style={{ padding: spacing.md }}>
            {activeTimers.filter(t => t.status === 'active' || t.status === 'paused').length === 0 ? (
              <View style={{
                alignItems: 'center',
                paddingVertical: spacing.xl,
              }}>
                <Ionicons name="timer-outline" size={48} color={colors.textSubtle} />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginTop: spacing.md,
                  textAlign: 'center',
                }}>
                  {t.noActiveTimers || 'No active timers'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSubtle,
                  marginTop: spacing.xs,
                  textAlign: 'center',
                }}>
                  {t.startTimerToTrack || 'Start a timer to track cooking progress'}
                </Text>
              </View>
            ) : (
              activeTimers
                .filter(t => t.status === 'active' || t.status === 'paused')
                .map(renderActiveTimer)
            )}
          </View>
        ) : (
          renderRecentUpdates()
        )}
      </ScrollView>
    </Animated.View>
  );
}
