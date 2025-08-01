import { NavigationContainer, NavigationProp, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import OrderiaTextIcon from '../../assets/orderia_text.svg';
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
  AddHallScreen
} from '../screens';
import EditTableScreen from '@/screens/EditTableScreen';
import AddCategoryScreen from '@/screens/AddCategoryScreen';
import { PrimaryButton } from '@/components';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type MainTabsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type RootStackParamList = {
  MainTabs: undefined;
  TableDetail: { tableId: string };
  AddMenuItem: { categoryId?: string };
  AddHall: { hallId?: string };
  EditTable: { tableId: string };
  AddCategory: { categoryId?: string };
};

export type TabParamList = {
  Tables: undefined;
  Menu: undefined;
  History: undefined;
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
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
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
            <OrderiaTextIcon width={120} height={32} style={{ marginLeft: 12 }} />
          ),
            headerRight: () => (
            <PrimaryButton
              title={t.addHall}
              onPress={() => navigation.navigate('AddHall', {})}
              variant="outline"
              style={{ marginRight: 12 }}
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
          // headerLeft: () => (
          //   <OrderiaTextIcon width={120} height={32} style={{ marginLeft: 12 }} />
          // ),
        
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          title: t.history,
          headerTitle: t.salesHistory,
          // headerLeft: () => (
          //   <OrderiaTextIcon width={120} height={32} style={{ marginLeft: 12 }} />
          // ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: t.settings,
          headerTitle: t.settings,
          // headerLeft: () => (
          //   <OrderiaTextIcon width={120} height={32} style={{ marginLeft: 12 }} />
          // ),
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
