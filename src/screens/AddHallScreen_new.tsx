import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useLayoutStore } from '../stores';
import { PrimaryButton, SurfaceCard, ActionSheet, ActionSheetAction } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Hall } from '../types';

type AddHallRouteProp = RouteProp<RootStackParamList, 'AddHall'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddHallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddHallRouteProp>();
  const { colors } = useTheme();
  const { t } = useLocalization();
  
  const { addHall, updateHall, halls, deleteHall } = useLayoutStore();
  
  // Check if we're editing an existing hall
  const editingHallId = route.params?.hallId;
  const editingHall = editingHallId ? halls.find(h => h.id === editingHallId) : null;
  const isEditing = !!editingHall;

  const [name, setName] = useState(editingHall?.name || '');
  const [loading, setLoading] = useState(false);
  
  // Action sheet for hall actions
  const [showHallActions, setShowHallActions] = useState(false);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const actionSheetRef = useRef<BottomSheet>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t.error, t.enterHallName);
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingHall) {
        updateHall(editingHall.id, { name: name.trim() });
      } else {
        addHall({
          name: name.trim(),
        });
      }
      
      // Clear form
      setName('');
      
      if (isEditing) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t.error, t.genericError);
    } finally {
      setLoading(false);
    }
  };

  const handleHallLongPress = (hall: Hall) => {
    setSelectedHall(hall);
    setShowHallActions(true);
  };

  const handleEditHall = (hall: Hall) => {
    setShowHallActions(false);
    setSelectedHall(null);
    navigation.navigate('AddHall', { hallId: hall.id });
  };

  const handleDeleteHall = (hall: Hall) => {
    setShowHallActions(false);
    setSelectedHall(null);
    
    Alert.alert(
      t.confirmDelete || 'Confirm Delete',
      `Are you sure you want to delete "${hall.name}"?`,
      [
        {
          text: t.cancel || 'Cancel',
          style: 'cancel',
        },
        {
          text: t.delete || 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deleteHall(hall.id);
            } catch (error) {
              Alert.alert(t.error, t.genericError);
            }
          }
        }
      ]
    );
  };

  const getHallActions = (): ActionSheetAction[] => [
    {
      id: 'edit',
      title: t.edit || 'Edit',
      icon: 'pencil',
      onPress: () => selectedHall && handleEditHall(selectedHall),
    },
    {
      id: 'delete',
      title: t.delete || 'Delete',
      icon: 'trash',
      destructive: true,
      onPress: () => selectedHall && handleDeleteHall(selectedHall),
    },
  ];

  const renderHall = ({ item }: { item: Hall }) => {
    return (
      <TouchableOpacity onLongPress={() => handleHallLongPress(item)}>
        <SurfaceCard style={{ marginBottom: 8 }} variant="outlined">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {item.name}
            </Text>
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
          
          {/* Add/Edit Form */}
          <SurfaceCard style={{ marginBottom: 16 }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text,
              marginBottom: 16
            }}>
              {isEditing ? t.editHall : t.addHall}
            </Text>
            
            <Text style={{ fontSize: 14, color: colors.textSubtle, marginBottom: 8 }}>
              {t.hallName} *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.surface,
                marginBottom: 16
              }}
              value={name}
              onChangeText={setName}
              placeholder={t.enterHallName}
              placeholderTextColor={colors.textSubtle}
              autoFocus={isEditing}
            />
            
            <PrimaryButton
              title={isEditing ? t.update : t.addHall}
              onPress={handleSave}
              loading={loading}
              disabled={!name.trim()}
            />
          </SurfaceCard>

          {/* Existing Halls List */}
          {!isEditing && halls.length > 0 && (
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: colors.text,
                marginBottom: 12
              }}>
                Existing Halls
              </Text>
              <FlatList
                data={halls}
                renderItem={renderHall}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Action Sheet */}
          {selectedHall && (
            <ActionSheet
              ref={actionSheetRef}
              title={selectedHall.name}
              subtitle="Actions for this hall"
              actions={getHallActions()}
              isVisible={showHallActions}
              onClose={() => {
                setShowHallActions(false);
                setSelectedHall(null);
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
