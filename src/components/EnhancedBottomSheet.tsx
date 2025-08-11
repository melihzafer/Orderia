import React, { forwardRef, useCallback, useMemo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { brand, elevation, radius, spacing } from '../constants/branding';

interface EnhancedBottomSheetProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  isVisible: boolean;
  onClose: () => void;
  enablePanDownToClose?: boolean;
  snapPoints?: string[];
  backdropPressToClose?: boolean;
  showHandle?: boolean;
  headerActions?: React.ReactNode;
}

export const EnhancedBottomSheet = forwardRef<BottomSheet, EnhancedBottomSheetProps>(({
  title,
  subtitle,
  children,
  isVisible,
  onClose,
  enablePanDownToClose = true,
  snapPoints = ['50%', '75%', '90%'],
  backdropPressToClose = true,
  showHandle = true,
  headerActions,
}, ref) => {
  const { colors } = useTheme();
  const { height } = Dimensions.get('window');

  const dynamicSnapPoints = useMemo(() => {
    if (Platform.OS === 'ios') {
      return snapPoints;
    }
    // Android optimization for keyboard handling
    return snapPoints.map(point => {
      const percentage = parseInt(point.replace('%', ''));
      return `${Math.min(percentage, 95)}%`;
    });
  }, [snapPoints]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={backdropPressToClose ? 'close' : 'none'}
        style={[props.style, { backgroundColor: colors.overlay }]}
      />
    ),
    [colors.overlay, backdropPressToClose]
  );

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={dynamicSnapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        backgroundColor: colors.border,
        width: 40,
        height: 4,
        display: showHandle ? 'flex' : 'none',
      }}
      backgroundStyle={{
        backgroundColor: colors.surface,
        ...elevation.lg,
      }}
      style={styles.bottomSheet}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        {(title || subtitle || headerActions) && (
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
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
              <View style={styles.headerActions}>
                {headerActions}
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: colors.surfaceAlt }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSubtle} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  bottomSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});

EnhancedBottomSheet.displayName = 'EnhancedBottomSheet';
