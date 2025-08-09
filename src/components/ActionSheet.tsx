import React, { forwardRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export interface ActionSheetAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  title?: string;
  subtitle?: string;
  actions: ActionSheetAction[];
  isVisible: boolean;
  onClose: () => void;
}

export const ActionSheet = forwardRef<BottomSheet, ActionSheetProps>(({
  title,
  subtitle,
  actions,
  isVisible,
  onClose,
}, ref) => {
  const { colors } = useTheme();
  
  const snapPoints = useMemo(() => {
    const baseHeight = 120; // Header + close button
    const actionHeight = 60;
    const totalHeight = baseHeight + (actions.length * actionHeight);
    return [Math.min(totalHeight, 400)];
  }, [actions.length]);

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        onPress={onClose}
      />
    ),
    [onClose]
  );

  const handleActionPress = (action: ActionSheetAction) => {
    action.onPress();
    onClose();
  };

  return (
    <BottomSheet
      ref={ref}
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{
        backgroundColor: colors.surface,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.border,
      }}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        {(title || subtitle) && (
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            {title && (
              <Text style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
        
        {/* Actions */}
        <View style={styles.actionsContainer}>
          {actions.map((action) => {
            const actionColor = action.destructive 
              ? '#EF4444' 
              : action.color || colors.text;
            
            return (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionButton, { borderBottomColor: colors.border }]}
                onPress={() => handleActionPress(action)}
                activeOpacity={0.7}
              >
                <View style={styles.actionContent}>
                  <Ionicons 
                    name={action.icon} 
                    size={24} 
                    color={actionColor}
                    style={styles.actionIcon}
                  />
                  <Text style={[styles.actionText, { color: actionColor }]}>
                    {action.title}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { 
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border 
          }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionsContainer: {
    flex: 1,
  },
  actionButton: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
