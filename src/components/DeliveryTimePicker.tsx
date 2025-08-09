import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderStore } from '../stores/orderStore';

interface DeliveryTimePickerProps {
  ticketId: string;
  currentMinutes?: number;
  onClose: () => void;
}

const commonDeliveryTimes = [
  { label: '15 minutes', value: 15 },
  { label: '20 minutes', value: 20 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
];

export const DeliveryTimePicker: React.FC<DeliveryTimePickerProps> = ({
  ticketId,
  currentMinutes,
  onClose,
}) => {
  const { colors } = useTheme();
  const { setTicketDeliveryTime, clearTicketDeliveryTime } = useOrderStore();

  const handleSetTime = (minutes: number) => {
    setTicketDeliveryTime(ticketId, minutes);
    Alert.alert(
      'Delivery Timer Set', 
      `You'll receive notifications at 70%, 85%, and when the order is ready (${minutes} minutes)`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const handleClearTime = () => {
    clearTicketDeliveryTime(ticketId);
    Alert.alert(
      'Timer Cleared', 
      'Delivery notifications have been cancelled',
      [{ text: 'OK', onPress: onClose }]
    );
  };

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          width: '90%',
          maxWidth: 400,
        }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20 
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold',
              color: colors.text 
            }}>
              Set Delivery Time
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>

          {currentMinutes && (
            <View style={{
              backgroundColor: colors.primary + '20',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="timer" size={20} color={colors.primary} />
              <Text style={{ 
                marginLeft: 8, 
                color: colors.primary,
                fontWeight: '600' 
              }}>
                Current: {currentMinutes} minutes
              </Text>
            </View>
          )}

          <Text style={{ 
            fontSize: 14, 
            color: colors.textSubtle,
            marginBottom: 16,
            lineHeight: 20
          }}>
            Select estimated delivery time. You'll receive notifications at 40%, 80%, and 100% completion.
          </Text>

          <View style={{ marginBottom: 20 }}>
            {commonDeliveryTimes.map((time) => (
              <TouchableOpacity
                key={time.value}
                onPress={() => handleSetTime(time.value)}
                style={{
                  backgroundColor: currentMinutes === time.value ? colors.primary + '20' : colors.bg,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: currentMinutes === time.value ? colors.primary : colors.border,
                }}
              >
                <Text style={{ 
                  fontSize: 16,
                  color: currentMinutes === time.value ? colors.primary : colors.text,
                  fontWeight: currentMinutes === time.value ? '600' : 'normal'
                }}>
                  {time.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {currentMinutes && (
              <TouchableOpacity
                onPress={handleClearTime}
                style={{
                  flex: 1,
                  backgroundColor: '#EF444420',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ 
                  color: '#EF4444',
                  fontWeight: '600'
                }}>
                  Clear Timer
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: colors.border,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ 
                color: colors.text,
                fontWeight: '600'
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
