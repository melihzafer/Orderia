import { NavigationContainer, NavigationProp, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
// Screen imports (we'll create these next)
import {
  TablesScreen,
  MenuScreen,
  HistoryScreen,
  SettingsScreen,
  TableDetailScreen,
  AddMenuItemScreen,
  AddHallScreen,
  EditTableScreen,
  AddCategoryScreen,
  AnalyticsScreen,
  QRMenuScreen
} from '../screens';
import { PrimaryButton } from '../components';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type MainTabsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type RootStackParamList = {
  MainTabs: undefined;
  TableDetail: { tableId: string };
  AddMenuItem: { categoryId?: string; itemId?: string };
  AddHall: { hallId?: string };
  EditTable: { tableId: string };
  AddCategory: { categoryId?: string };
  Analytics: undefined;
  QRMenu: undefined;
};

export type TabParamList = {
  Tables: undefined;
  Menu: undefined;
  Analytics: undefined;
  QRMenu: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const navigation = useNavigation<MainTabsNavigationProp>();
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Tables':
              iconName = focused ? 'restaurant' : 'restaurant-outline';
              break;
            case 'Menu':
              iconName = focused ? 'menu' : 'menu-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'QRMenu':
              iconName = focused ? 'qr-code' : 'qr-code-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Tables" 
        component={TablesScreen}
        options={{
          title: t.tables,
          headerTitle: "",
          headerLeft: () => (
            <Text style={{ 
              marginLeft: 12, 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: colors.primary 
            }}>
              Orderia
            </Text>
          ),
          headerRight: () => (
            <Ionicons
              name="add-circle-outline"
              size={28}
              color={colors.primary}
              style={{ marginRight: 16 }}
              onPress={() => navigation.navigate('AddHall', {})}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Menu" 
        component={MenuScreen}
        options={{
          title: t.menu,
          headerTitle: t.menuManagement,
        }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{
          title: t.analytics || 'Analytics',
          headerTitle: t.salesAnalytics || 'Sales Analytics',
        }}
      />
      <Tab.Screen 
        name="QRMenu" 
        component={QRMenuScreen}
        options={{
          title: t.qrMenu || 'QR Menu',
          headerTitle: t.qrMenuManagement || 'QR Menu Management',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: t.settings,
          headerTitle: t.settings,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TableDetail" 
          component={TableDetailScreen}
          options={{
            title: t.tableDetail,
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="AddMenuItem" 
          component={AddMenuItemScreen}
          options={{
            title: t.addMenuItem,
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="AddHall" 
          component={AddHallScreen}
          options={{
            title: t.addHall,
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="EditTable" 
          component={EditTableScreen}
          options={{
            title: t.editTable,
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="AddCategory" 
          component={AddCategoryScreen}
          options={{
            title: t.addCategory,
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="Analytics" 
          component={AnalyticsScreen}
          options={{
            title: t.analytics || 'Analytics',
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="QRMenu" 
          component={QRMenuScreen}
          options={{
            title: t.qrMenu || 'QR Menu',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
