import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useLayoutStore, useOrderStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Hall, Table } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TablesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
  
  const { 
    halls, 
    tables, 
    getHallsWithTables, 
    addHall, 
    addTable,
    deleteTable 
  } = useLayoutStore();
  
  const { 
    openTickets, 
    getTicketByTable, 
    getTicketTotal, 
    getTodayTotal 
  } = useOrderStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleEditHall = (hallId: string) => {
    navigation.navigate('AddHall', { hallId });
  };

  const handleEditTable = (tableId: string) => {
    navigation.navigate('EditTable', { tableId });
  };

  const handleDeleteTable = (table: Table) => {
    Alert.alert(
      t.deleteTable,
      t.deleteTableConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: () => {
            deleteTable(table.id);
            Alert.alert(t.success, t.tableDeleted);
          }
        }
      ]
    );
  };

  const handleAddHall = () => {
    navigation.navigate('AddHall', {});
  };

  const handleAddTable = (hallId: string) => {
    Alert.alert(
      t.addTable,
      t.addTableConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.add,
          onPress: () => {
            addTable({ hallId });
          }
        }
      ]
    );
  };

  const handleTablePress = (table: Table) => {
    navigation.navigate('TableDetail', { tableId: table.id });
  };

  const renderTable = (table: Table) => {
    const ticket = getTicketByTable(table.id);
    const total = ticket ? getTicketTotal(ticket.id) : 0;
    const displayName = table.label || `Masa ${table.seq}`;

    return (
      <View key={table.id} style={{ width: '33.33%', paddingHorizontal: 4, marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => handleTablePress(table)}
          style={{ flex: 1 }}
        >
          <SurfaceCard
        variant="outlined"
        padding="small"
        style={{
          minHeight: 80,
          backgroundColor: table.isOpen ? colors.accent + '20' : colors.surface,
          borderColor: table.isOpen ? colors.accent : colors.border,
          borderWidth: table.isOpen ? 2 : 1,
        }}
          >
        <View style={{ flex: 1, justifyContent: 'space-between', height: 'auto' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={{ 
          fontSize: 10, 
          fontWeight: '600', 
          color: colors.text,
          flex: 1
            }}>
          {displayName}
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <TouchableOpacity 
            onPress={() => handleEditTable(table.id)}
            style={{
              padding: 4,
            }}
              >
            <Ionicons name="pencil" size={12} color={colors.textSubtle} />
              </TouchableOpacity>
              
              <TouchableOpacity 
            onPress={() => handleDeleteTable(table)}
            style={{
              padding: 4,
            }}
              >
            <Ionicons name="trash" size={12} color="#ff4444" />
              </TouchableOpacity>
            </View>
          </View>
              
              {table.isOpen && (
                <View style={{ alignItems: 'center', marginTop: 4 }}>
                  <View style={{
                    backgroundColor: colors.accent,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}>
                    <Text style={{ 
                      fontSize: 10, 
                      color: '#FFFFFF',
                      fontWeight: '600'
                    }}>
                      {t.open}
                    </Text>
                  </View>
                  {total > 0 && (
                    <Text style={{ 
                      fontSize: 12, 
                      color: colors.textSubtle,
                      marginTop: 2
                    }}>
                      {formatPrice(total)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </SurfaceCard>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHall = ({ item: hall }: { item: Hall & { tables: Table[] } }) => {
    return (
      <SurfaceCard style={{ marginBottom: 16 }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 12
        }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: colors.text 
          }}>
            {hall.name}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              onPress={() => handleEditHall(hall.id)}
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="pencil" size={14} color={colors.textSubtle} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleAddTable(hall.id)}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: 12, 
                fontWeight: '600',
                marginLeft: 4
              }}>
                {t.addTable}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {hall.tables.length === 0 ? (
          <Text style={{ 
            color: colors.textSubtle, 
            textAlign: 'center',
            fontStyle: 'italic',
            padding: 20
          }}>
            {t.noTables}
          </Text>
        ) : (
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap',
            marginHorizontal: -4
          }}>
            {hall.tables.map(renderTable)}
          </View>
        )}
      </SurfaceCard>
    );
  };

  const hallsWithTables = getHallsWithTables();
  const todayTotal = getTodayTotal();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Today's Summary */}
        <SurfaceCard style={{ margin: 16, marginBottom: 8 }} variant="elevated">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 14, color: colors.textSubtle }}>{t.dailyTotal}</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>
                {formatPrice(todayTotal)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, color: colors.textSubtle }}>{t.openTables}</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.accent }}>
                {tables.filter(t => t.isOpen).length}
              </Text>
            </View>
          </View>
        </SurfaceCard>

        {/* Halls and Tables */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {hallsWithTables.length === 0 ? (
            <SurfaceCard style={{ padding: 32 }}>
              <Text style={{ 
                textAlign: 'center', 
                color: colors.textSubtle,
                fontSize: 16,
                marginBottom: 16
              }}>
                {t.noHalls}
              </Text>
              <PrimaryButton
                title={t.addFirstHall}
                onPress={handleAddHall}
                fullWidth
              />
            </SurfaceCard>
          ) : (
            <FlatList
              data={hallsWithTables}
              renderItem={renderHall}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListFooterComponent={
                <PrimaryButton
                  title={t.addNewHall}
                  onPress={handleAddHall}
                  variant="outline"
                  fullWidth
                />
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
