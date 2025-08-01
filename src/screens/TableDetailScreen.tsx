import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useLayoutStore, useOrderStore, useMenuStore } from '../stores';
import { PrimaryButton, SurfaceCard, StatusBadge } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';
import { MenuItem, TicketLine, OrderStatus } from '../types';
import { generateOrderBillPDF } from '../utils/pdfGenerator';

type TableDetailRouteProp = RouteProp<RootStackParamList, 'TableDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TableDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TableDetailRouteProp>();
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
  
  const { tableId } = route.params;
  
  const { getTable } = useLayoutStore();
  const { 
    openTable, 
    getTicketByTable, 
    getTicketTotal,
    addTicketLine,
    updateLineQuantity,
    updateLineStatus,
    markAllDelivered,
    payTicket
  } = useOrderStore();
  const { getCategoriesWithItems } = useMenuStore();

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const table = getTable(tableId);
  const ticket = getTicketByTable(tableId);
  const categoriesWithItems = getCategoriesWithItems();

  useEffect(() => {
    if (categoriesWithItems.length > 0 && !selectedCategory) {
      setSelectedCategory(categoriesWithItems[0].id);
    }
  }, [categoriesWithItems, selectedCategory]);

  const handleOpenTable = () => {
    openTable(tableId);
  };

  const handleAddItem = (menuItem: MenuItem) => {
    if (!ticket) {
      const newTicket = openTable(tableId);
      addTicketLine(newTicket.id, {
        menuItemId: menuItem.id,
        quantity: 1,
        note: note.trim() || undefined,
      });
    } else {
      addTicketLine(ticket.id, {
        menuItemId: menuItem.id,
        quantity: 1,
        note: note.trim() || undefined,
      });
    }
    setNote('');
    setShowMenuModal(false);
  };

  const handleQuantityChange = (line: TicketLine, delta: number) => {
    if (!ticket) return;
    const newQuantity = line.quantity + delta;
    updateLineQuantity(ticket.id, line.id, newQuantity);
  };

  const handleStatusChange = (line: TicketLine, status: OrderStatus) => {
    if (!ticket) return;
    updateLineStatus(ticket.id, line.id, status);
  };

  const handleMarkAllDelivered = () => {
    if (!ticket) return;
    Alert.alert(
      t.deliverAllOrders,
      t.deliverAllConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.deliver, onPress: () => markAllDelivered(ticket.id) }
      ]
    );
  };

  const handlePayment = () => {
    if (!ticket) return;
    const total = getTicketTotal(ticket.id);
    Alert.alert(
      t.makePayment,
      `${t.total}: ${formatPrice(total)}\n\n${t.paymentConfirm}`,
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: t.makePayment, 
          onPress: () => {
            // Store ticket data before payment (since it will be moved to history)
            const ticketForBill = {
              ...ticket,
              status: 'paid' as const,
              lines: ticket.lines.map(line => ({
                ...line,
                status: 'paid' as const
              }))
            };
            
            payTicket(ticket.id);
            
            // Ask if customer wants order bill
            setTimeout(() => {
              Alert.alert(
                t.orderBill,
                t.generateOrderBill,
                [
                  { text: t.no, style: 'cancel', onPress: () => navigation.goBack() },
                  { 
                    text: t.yes, 
                    onPress: async () => {
                      try {
                        const displayName = table?.label || `${t.table} ${table?.seq}`;
                        await generateOrderBillPDF({
                          ticket: ticketForBill,
                          ticketLines: ticketForBill.lines,
                          tableName: displayName,
                          total,
                          formatPrice,
                          t
                        });
                        Alert.alert(t.success, t.orderBillGenerated, [
                          { text: t.ok, onPress: () => navigation.goBack() }
                        ]);
                      } catch (error) {
                        console.error('PDF generation error:', error);
                        Alert.alert(t.error, t.genericError, [
                          { text: t.ok, onPress: () => navigation.goBack() }
                        ]);
                      }
                    }
                  }
                ]
              );
            }, 500);
          }
        }
      ]
    );
  };
  const renderTicketLine = ({ item: line }: { item: TicketLine }) => {
    return (
      <SurfaceCard style={{ marginBottom: 8 }} variant="outlined">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {line.nameSnapshot}
            </Text>
            
            {line.note && (
              <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 2, fontStyle: 'italic' }}>
                {t.note}: {line.note}
              </Text>
            )}
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <StatusBadge status={line.status} size="small" />
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '700', 
                color: colors.primary,
                marginLeft: 8
              }}>
                {formatPrice(line.priceSnapshot * line.quantity)}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => handleQuantityChange(line, -1)}
                disabled={line.status !== 'pending'}
                style={{
                  backgroundColor: line.status === 'pending' ? colors.primary : colors.border,
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>-</Text>
              </TouchableOpacity>
              
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: colors.text,
                marginHorizontal: 12,
                minWidth: 24,
                textAlign: 'center'
              }}>
                {line.quantity}
              </Text>
              
              <TouchableOpacity
                onPress={() => handleQuantityChange(line, 1)}
                disabled={line.status !== 'pending'}
                style={{
                  backgroundColor: line.status === 'pending' ? colors.primary : colors.border,
                  borderRadius: 16,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>+</Text>
              </TouchableOpacity>
            </View>

            {line.status === 'pending' && (
              <TouchableOpacity
                onPress={() => handleStatusChange(line, 'delivered')}
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {t.deliver}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SurfaceCard>
    );
  };

  const renderMenuItem = ({ item: menuItem }: { item: MenuItem }) => {
    return (
      <TouchableOpacity
        onPress={() => handleAddItem(menuItem)}
        style={{ marginBottom: 8 }}
      >
        <SurfaceCard variant="outlined">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {menuItem.name}
              </Text>
              {menuItem.description && (
                <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 2 }}>
                  {menuItem.description}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
              {formatPrice(menuItem.price)}
            </Text>
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  if (!table) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: colors.textSubtle }}>{t.tableNotFound}</Text>
      </SafeAreaView>
    );
  }

  const displayName = table.label || `Masa ${table.seq}`;
  const total = ticket ? getTicketTotal(ticket.id) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          {displayName}
        </Text>
        {ticket && (
          <Text style={{ fontSize: 16, color: colors.textSubtle, textAlign: 'center', marginTop: 4 }}>
            {t.total}: {formatPrice(total)}
          </Text>
        )}
      </View>

      {/* Content */}
      {!ticket ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 18, color: colors.textSubtle, textAlign: 'center', marginBottom: 24 }}>
            {t.tableNotOpened}
          </Text>
          <PrimaryButton
            title={t.openTable}
            onPress={handleOpenTable}
            size="large"
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Order Lines */}
          <View style={{ flex: 1, padding: 16 }}>
            {ticket.lines.length === 0 ? (
              <SurfaceCard style={{ padding: 32 }}>
                <Text style={{ 
                  textAlign: 'center', 
                  color: colors.textSubtle,
                  fontSize: 16,
                  marginBottom: 16
                }}>
                  {t.noOrdersYet}
                </Text>
                <PrimaryButton
                  title={t.addFirstOrder}
                  onPress={() => setShowMenuModal(true)}
                  fullWidth
                />
              </SurfaceCard>
            ) : (
              <FlatList
                data={ticket.lines}
                renderItem={renderTicketLine}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Actions */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <PrimaryButton
                title={t.addOrder}
                onPress={() => setShowMenuModal(true)}
                style={{ flex: 1 }}
              />
              
              {ticket.lines.some(line => line.status === 'pending') && (
                <PrimaryButton
                  title={t.deliverAll}
                  onPress={handleMarkAllDelivered}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              )}
            </View>
            
            {ticket.lines.length > 0 && (
              <PrimaryButton
                title={`${t.makePayment} (${formatPrice(total)})`}
                onPress={handlePayment}
                size="large"
                fullWidth
              />
            )}
          </View>
        </View>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.bg
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
              {t.menu}
            </Text>
            <TouchableOpacity onPress={() => setShowMenuModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Note Input */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 14,
                color: colors.text,
                backgroundColor: colors.surface,
              }}
              value={note}
              onChangeText={setNote}
              placeholder={t.orderNote}
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          {/* Category Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 60 }}
            contentContainerStyle={{ padding: 16 }}
          >
            {categoriesWithItems.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  marginRight: 8,
                  borderRadius: 20,
                  backgroundColor: selectedCategory === category.id ? colors.primary : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: selectedCategory === category.id ? colors.primary : colors.border,
                }}
              >
                <Text style={{
                  color: selectedCategory === category.id ? '#FFFFFF' : colors.text,
                  fontWeight: selectedCategory === category.id ? '600' : '400',
                  fontSize: 14,
                }}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Menu Items */}
          <View style={{ flex: 1, padding: 16 }}>
            {selectedCategory && (
              <FlatList
                data={categoriesWithItems.find(c => c.id === selectedCategory)?.items.filter(item => item.isActive) || []}
                renderItem={renderMenuItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
