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
import { MenuItem, Ticket, TicketLine, OrderStatus, PaymentInfo } from '../types';
import { generateOrderBillPDF } from '../utils/pdfGenerator';
import { generateAndShareBill } from '../utils/exportUtils';

type TableDetailRouteProp = RouteProp<RootStackParamList, 'TableDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TableDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TableDetailRouteProp>();
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
  const { menuItems } = useMenuStore();
  
  const { tableId } = route.params;
  
  const { getTable } = useLayoutStore();
  const { 
    openTable, 
    getTicketsByTable, 
    getTicketTotal,
    addTicketLine,
    updateLineQuantity,
    updateLineStatus,
    markAllDelivered,
    payTicket,
    updateTicketName
  } = useOrderStore();
  const { getCategoriesWithItems } = useMenuStore();

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showTicketNameModal, setShowTicketNameModal] = useState(false);
  const [newTicketName, setNewTicketName] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');

  const table = getTable(tableId);
  const tickets = getTicketsByTable(tableId) || [];
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) : null;
  const categoriesWithItems = getCategoriesWithItems();

  useEffect(() => {
    if (categoriesWithItems.length > 0 && !selectedCategory) {
      setSelectedCategory(categoriesWithItems[0].id);
    }
  }, [categoriesWithItems, selectedCategory]);

  useEffect(() => {
    // Auto-select the first ticket if none is selected
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const handleOpenTable = (ticketName?: string) => {
    const newTicket = openTable(tableId, ticketName);
    setSelectedTicketId(newTicket.id);
  };

  const handleAddItem = (menuItem: MenuItem) => {
    if (!selectedTicket) {
      const newTicket = openTable(tableId);
      setSelectedTicketId(newTicket.id);
      addTicketLine(newTicket.id, {
        menuItemId: menuItem.id,
        quantity: 1,
        note: note.trim() || undefined,
      });
    } else {
      addTicketLine(selectedTicket.id, {
        menuItemId: menuItem.id,
        quantity: 1,
        note: note.trim() || undefined,
      });
    }
    setNote('');
    setShowMenuModal(false);
  };

  const handleQuantityChange = (line: TicketLine, delta: number) => {
    if (!selectedTicket) return;
    const newQuantity = line.quantity + delta;
    updateLineQuantity(selectedTicket.id, line.id, newQuantity);
  };

  const handleStatusChange = (line: TicketLine, status: OrderStatus) => {
    if (!selectedTicket) return;
    updateLineStatus(selectedTicket.id, line.id, status);
  };

  const handleMarkAllDelivered = () => {
    if (!selectedTicket) return;
    Alert.alert(
      t.deliverAllOrders,
      t.deliverAllConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.deliver, onPress: () => markAllDelivered(selectedTicket.id) }
      ]
    );
  };

  const handlePayPress = () => {
    if (!selectedTicket) return;
    setAmountReceived(''); // Reset amount for new payment
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = (paymentMethod: 'cash' | 'card') => {
    if (!selectedTicket) return;

    const total = getTicketTotal(selectedTicket.id);
    console.log(total) ;
    const received = parseFloat(amountReceived.replace(',', '.')) || 0;
    const receivedInCents = received * 100; // Convert to cents to match total
    const change = paymentMethod === 'cash' ? Math.max(0, receivedInCents - total) : 0;

    if (paymentMethod === 'cash' && receivedInCents < total) {
      Alert.alert(t.error, t.insufficientFunds);
      return;
    }

    const paymentInfo: PaymentInfo = {
      total,
      amountReceived: receivedInCents,
      change,
      paymentMethod,
    };

    // This object is created before the ticket is closed and moved to history
    const ticketToPrint: Ticket = {
      ...selectedTicket,
      paymentInfo,
      status: 'paid',
      closedAt: Date.now(),
    };

    payTicket(selectedTicket.id, paymentInfo);
    setShowPaymentModal(false);
    
    // Ask if customer wants order bill
    Alert.alert(
      t.orderBill,
      t.askForOrderBill,
      [
        { text: t.no, style: 'cancel', onPress: () => navigation.goBack() },
        { 
          text: t.yes, 
          onPress: async () => {
            try {
              await generateAndShareBill(ticketToPrint, t, (amount) => formatPrice(amount));
              Alert.alert(t.success, t.orderBillGenerated, [
                { text: t.ok, onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert(t.error, t.genericError);
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  const handlePayment = () => {
    if (!selectedTicket) return;
    const total = getTicketTotal(selectedTicket.id);
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
              ...selectedTicket,
              status: 'paid' as const,
              lines: selectedTicket.lines
                .filter((line: TicketLine) => line.status !== 'cancelled') // Exclude cancelled items from bill
                .map((line: TicketLine) => ({
                  ...line,
                  status: 'paid' as const
                }))
            };
            
            payTicket(selectedTicket.id);
            
            // Ask if customer wants order bill
            setTimeout(() => {
              Alert.alert(
                t.orderBill,
                t.askForOrderBill,
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
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {t.deliver}
                </Text>
              </TouchableOpacity>
            )}

            {line.status === 'delivered' && (
              <TouchableOpacity
                onPress={() => handleStatusChange(line, 'cancelled')}
                style={{
                  backgroundColor: '#EF4444',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {t.cancel}
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
        <Text style={{ fontSize: 18, color: colors.textSubtle }}>{t.tableNotFound || 'Table not found'}</Text>
      </SafeAreaView>
    );
  }

  const displayName = table.label || `Masa ${table.seq || '?'}`;
  const total = selectedTicket ? getTicketTotal(selectedTicket.id) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          {displayName}
        </Text>
        {selectedTicket && (
          <Text style={{ fontSize: 16, color: colors.textSubtle, textAlign: 'center', marginTop: 4 }}>
            {t.total}: {formatPrice(total)}
          </Text>
        )}
      </View>

      {/* Ticket Tabs */}
      {tickets && tickets.length > 0 && (
        <ScrollView horizontal style={{ maxHeight: 60, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', padding: 16, paddingBottom: 8 }}>
            {tickets.map((ticket, index) => (
              <TouchableOpacity
                key={ticket.id}
                onPress={() => setSelectedTicketId(ticket.id)}
                style={{
                  padding: 8,
                  marginRight: 8,
                  borderRadius: 8,
                  backgroundColor: selectedTicketId === ticket.id ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedTicketId === ticket.id ? colors.accent : colors.border,
                }}
              >
                <Text style={{
                  color: selectedTicketId === ticket.id ? colors.bg : colors.text,
                  fontWeight: selectedTicketId === ticket.id ? '600' : '400',
                }}>
                  {ticket.name || `Order ${index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowTicketNameModal(true)}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
              }}
            >
              <Text style={{ color: colors.textSubtle }}>+ New Order</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Content */}
      {!tickets || tickets.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 18, color: colors.textSubtle, textAlign: 'center', marginBottom: 24 }}>
            {t.tableNotOpened}
          </Text>
          <PrimaryButton
            title={t.openTable}
            onPress={() => handleOpenTable()}
            size="large"
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Order Lines */}
          <View style={{ flex: 1, padding: 16 }}>
            {!selectedTicket || selectedTicket.lines.length === 0 ? (
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
                data={selectedTicket.lines}
                renderItem={renderTicketLine}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Actions */}
          {selectedTicket && (
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <PrimaryButton
                title={t.addOrder}
                onPress={() => setShowMenuModal(true)}
                style={{ flex: 1 }}
              />
              
              {selectedTicket.lines.some(line => line.status === 'pending') && (
                <PrimaryButton
                  title={t.deliverAll}
                  onPress={handleMarkAllDelivered}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              )}
            </View>
            
            {selectedTicket.lines.length > 0 && (
              <PrimaryButton
                title={`${t.makePayment} (${formatPrice(total)})`}
                onPress={handlePayPress}
                size="large"
                fullWidth
              />
            )}
          </View>
          )}
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
            style={{ maxHeight: 75 }}
            contentContainerStyle={{ padding: 16 }}
          >
            {categoriesWithItems.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
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

      {/* Ticket Name Modal */}
      <Modal
        visible={showTicketNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTicketNameModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 20,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 16,
              textAlign: 'center'
            }}>
              New Order Name
            </Text>
            
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                color: colors.text,
                backgroundColor: colors.bg,
                marginBottom: 16
              }}
              value={newTicketName}
              onChangeText={setNewTicketName}
              placeholder="Order name (optional)"
              placeholderTextColor={colors.textSubtle}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowTicketNameModal(false);
                  setNewTicketName('');
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bg
                }}
              >
                <Text style={{ color: colors.text, textAlign: 'center' }}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  handleOpenTable(newTicketName.trim() || undefined);
                  setShowTicketNameModal(false);
                  setNewTicketName('');
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: colors.primary
                }}
              >
                <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 16 }}>
              {t.payment || 'Payment'}
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, color: colors.textSubtle, textAlign: 'center' }}>{t.totalAmount || 'Total Amount'}</Text>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.primary, textAlign: 'center' }}>
                {formatPrice(selectedTicket ? getTicketTotal(selectedTicket.id) : 0)}
              </Text>
            </View>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                color: colors.text,
                backgroundColor: colors.bg,
                marginBottom: 16,
                fontSize: 18,
                textAlign: 'center'
              }}
              value={amountReceived}
              onChangeText={setAmountReceived}
              placeholder={t.amountReceived || 'Amount Received'}
              placeholderTextColor={colors.textSubtle}
              keyboardType="numeric"
              autoFocus
            />

            {amountReceived && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, color: colors.textSubtle, textAlign: 'center' }}>{t.change || 'Change'}</Text>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
                  {formatPrice(Math.max(0, (parseFloat(amountReceived.replace(',', '.')) * 100) - (selectedTicket ? getTicketTotal(selectedTicket.id) : 0)))}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              <PrimaryButton
                title={t.cash || 'Cash'}
                onPress={() => handleConfirmPayment('cash')}
                style={{ flex: 1 }}
                disabled={!amountReceived}
              />
              <PrimaryButton
                title={t.card || 'Card'}
                onPress={() => handleConfirmPayment('card')}
                variant="secondary"
                style={{ flex: 1 }}
              />
            </View>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Text style={{ color: colors.textSubtle, textAlign: 'center', padding: 8 }}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
