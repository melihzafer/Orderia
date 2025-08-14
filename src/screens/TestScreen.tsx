// Test file for new components and services
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { ProductSearch, NotificationCenter } from '../components';
import { orderTimerService, pdfExporter, qrService } from '../services';
import { useMenuStore } from '../stores';
import { spacing, radius } from '../constants/branding';

export default function TestScreen() {
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
  const { menuItems, categories } = useMenuStore();
  
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  
  const handleTestProductSearch = () => {
    setShowProductSearch(true);
  };
  
  const handleTestNotificationCenter = () => {
    setShowNotificationCenter(true);
  };
  
  const handleTestTimerService = async () => {
    try {
      // Start a test timer
      await orderTimerService.startTimer('TEST-001', 'ITEM-001', 'Test Pizza', 15);
      Alert.alert('Success', 'Test timer started for 15 minutes');
    } catch (error) {
      Alert.alert('Error', 'Failed to start timer');
    }
  };
  
  const handleTestPdfExport = async () => {
    try {
      const result = await pdfExporter.testExport();
      if (result.success) {
        Alert.alert('Success', `PDF generated: ${result.uri}`);
      } else {
        Alert.alert('Error', result.error || 'PDF generation failed');
      }
    } catch (error) {
      Alert.alert('Error', 'PDF test failed');
    }
  };
  
  const handleTestQRService = async () => {
    try {
      const qrCodes = await qrService.generateTableQRCodes(['T-001', 'T-002'], 'REST-001');
      const analytics = qrService.getQRAnalytics(qrCodes);
      
      Alert.alert(
        'QR Codes Generated',
        `Generated ${analytics.total} QR codes\\nActive: ${analytics.active}\\nFeatures: ${Object.keys(analytics.features).join(', ')}`
      );
    } catch (error) {
      Alert.alert('Error', 'QR generation failed');
    }
  };
  
  const renderTestButton = (title: string, onPress: () => void, icon: string) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        marginVertical: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={icon as any} size={24} color={colors.primary} />
      <Text style={{
        flex: 1,
        marginLeft: spacing.md,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
      }}>
        {title}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1, padding: spacing.md }}>
        <Text style={{
          fontSize: 24,
          fontWeight: '700',
          color: colors.text,
          marginBottom: spacing.lg,
          textAlign: 'center',
        }}>
          🧪 Feature Test Screen
        </Text>
        
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginBottom: spacing.md,
        }}>
          🔍 Product Search System
        </Text>
        
        {renderTestButton(
          'Test Product Search',
          handleTestProductSearch,
          'search'
        )}
        
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginTop: spacing.lg,
          marginBottom: spacing.md,
        }}>
          ⏱️ Timer & Notification System
        </Text>
        
        {renderTestButton(
          'Test Notification Center',
          handleTestNotificationCenter,
          'notifications'
        )}
        
        {renderTestButton(
          'Start Test Timer',
          handleTestTimerService,
          'timer'
        )}
        
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginTop: spacing.lg,
          marginBottom: spacing.md,
        }}>
          📄 PDF Export System
        </Text>
        
        {renderTestButton(
          'Test PDF Generation',
          handleTestPdfExport,
          'document'
        )}
        
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginTop: spacing.lg,
          marginBottom: spacing.md,
        }}>
          📱 QR Code System
        </Text>
        
        {renderTestButton(
          'Generate Test QR Codes',
          handleTestQRService,
          'qr-code'
        )}
        
        <View style={{ height: spacing.xl }} />
      </ScrollView>
      
      {/* Product Search Modal */}
      {showProductSearch && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.bg,
          zIndex: 1000,
        }}>
          <ProductSearch
            isVisible={showProductSearch}
            items={menuItems}
            categories={categories}
            onSelectItem={(item) => {
              Alert.alert('Item Selected', `Selected: ${item.name} - ${formatPrice(item.price)}`);
              setShowProductSearch(false);
            }}
            onClose={() => setShowProductSearch(false)}
          />
        </View>
      )}
      
      {/* Notification Center */}
      <NotificationCenter
        isVisible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </SafeAreaView>
  );
}
