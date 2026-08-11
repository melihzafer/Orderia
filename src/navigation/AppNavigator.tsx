import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAdaptiveLayout, SyncStatusBanner } from '../design-system';
import { settingsCopy } from '../features/app-settings';
import { useLocalization } from '../i18n';
import {
  AddCategoryScreen,
  AddHallScreen,
  AddProductScreen,
  AddTableScreen,
  AddMenuItemScreen,
  AnalyticsScreen,
  ApprovalsScreen,
  CancellationReasonsScreen,
  DeviceManagementScreen,
  EditTableScreen,
  HomeScreen,
  HallTablesScreen,
  HistoryScreen,
  MenuScreen,
  MenuAssistantScreen,
  NewOrderScreen,
  OrdersFlowScreen,
  QRMenuScreen,
  SettingsScreen,
  TableDetailScreen,
  TablesScreen,
  TablesHomeScreen,
} from '../screens';
import { ScreenErrorBoundary } from '../observability';
import { AdaptiveTabBar } from './AdaptiveTabBar';
// Rota tipleri `./routes` içinde yaşıyor. Ekranlar da oradan alıyor; böylece
// "navigatör bütün ekranları, her ekran da navigatörü içe aktarır" döngüsü yok.
import type { RootStackParamList, TabParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Bir ekranı kendi hata sınırına sarar.
 *
 * `component={Screen}` yerine `component={guarded('TableDetail', Screen)}`
 * yazılır. Böylece bir ekranın render hatası yalnızca o ekranı düşürür;
 * kabuk, alt sekmeler ve gezinme yığını ayakta kalır ve kullanıcı "geri dön"
 * ile çalışan bir listeye çıkabilir.
 *
 * Sarmalayıcı modül seviyesinde önbelleklenir: her render'da yeni bir bileşen
 * kimliği üretmek, React'e "bu başka bir ekran" dedirtip ekranın state'ini her
 * seferinde sıfırlardı.
 */
const guardedScreens = new Map<string, React.ComponentType<Record<string, unknown>>>();

function guarded<Props extends object>(
  screenName: string,
  Screen: React.ComponentType<Props>,
): React.ComponentType<Props> {
  const cached = guardedScreens.get(screenName);
  if (cached) return cached as unknown as React.ComponentType<Props>;

  function GuardedScreen(props: Props & { navigation?: { goBack: () => void } }) {
    return (
      <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()} screenName={screenName}>
        <Screen {...props} />
      </ScreenErrorBoundary>
    );
  }
  GuardedScreen.displayName = `Guarded(${screenName})`;
  guardedScreens.set(screenName, GuardedScreen as React.ComponentType<Record<string, unknown>>);
  return GuardedScreen;
}

function MainTabs() {
  const { activeMembership, status } = useAuth();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const isManager = status === 'unconfigured' || activeMembership?.role === 'manager';
  const layout = useAdaptiveLayout();
  const expandedManager = layout.mode === 'expanded' && isManager;

  return (
    <View style={{ flex: 1 }}>
      <SyncStatusBanner />
      <Tab.Navigator
        sceneContainerStyle={
          expandedManager ? { marginLeft: tokens.sizing.expandedRailWidth } : undefined
        }
        tabBar={(props) => <AdaptiveTabBar {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: tokens.colors.surface,
          },
          headerTintColor: tokens.colors.text,
          headerTitleStyle: tokens.typography.subtitle,
          tabBarActiveTintColor: tokens.colors.primary,
          tabBarHideOnKeyboard: true,
          tabBarInactiveTintColor: tokens.colors.textSubtle,
          tabBarItemStyle: {
            minHeight: tokens.sizing.minimumTarget,
          },
          tabBarLabelStyle: tokens.typography.caption,
          tabBarStyle: {
            backgroundColor: tokens.colors.surface,
            borderTopColor: tokens.colors.border,
            borderTopWidth: 1,
            minHeight: tokens.sizing.bottomNavigationHeight,
          },
        }}
      >
        <Tab.Screen
          component={guarded('Masalar', TablesHomeScreen)}
          name="Masalar"
          options={{
            headerShown: false,
            title: t.tablesNav,
          }}
        />
        <Tab.Screen
          component={guarded('Orders', OrdersFlowScreen)}
          name="Orders"
          options={{
            headerShown: false,
            title: t.ordersNav,
          }}
        />
        <Tab.Screen
          component={guarded('Home', HomeScreen)}
          name="Home"
          options={{
            title: t.homeNav,
          }}
        />
        <Tab.Screen
          component={guarded('Menu', MenuScreen)}
          name="Menu"
          options={{
            headerShown: false,
            title: t.menu,
          }}
        />
        <Tab.Screen
          component={guarded('Receipts', HistoryScreen)}
          name="Receipts"
          options={{
            headerShown: false,
            title: t.receiptsNav,
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

export default function AppNavigator() {
  const { tokens } = useTheme();
  const { language, t } = useLocalization();
  const stackOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: tokens.colors.surface,
    },
    headerTintColor: tokens.colors.text,
    headerTitleStyle: tokens.typography.subtitle,
  };

  return (
    <NavigationContainer
      documentTitle={{
        formatter: (options) => (options?.title ? `${options.title} · Orderia` : 'Orderia'),
      }}
    >
      <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen component={MainTabs} name="MainTabs" options={{ headerShown: false }} />
        <Stack.Screen
          component={guarded('NewOrder', NewOrderScreen)}
          name="NewOrder"
          options={{ headerShown: false, presentation: 'modal', title: t.newOrder }}
        />
        <Stack.Screen
          component={guarded('TableDetail', TableDetailScreen)}
          name="TableDetail"
          options={{
            headerShown: false,
            title: t.tableDetail,
          }}
        />
        <Stack.Screen
          component={guarded('AddProduct', AddProductScreen)}
          name="AddProduct"
          options={{
            headerShown: false,
            title: t.tableDetail,
          }}
        />
        <Stack.Screen
          component={guarded('Tables', TablesScreen)}
          name="Tables"
          options={{
            title: t.tablesTitle,
          }}
        />
        <Stack.Screen
          component={guarded('HallTables', HallTablesScreen)}
          name="HallTables"
          options={{
            title: t.tablesTitle,
          }}
        />
        <Stack.Screen
          component={guarded('AddMenuItem', AddMenuItemScreen)}
          name="AddMenuItem"
          options={{
            presentation: 'modal',
            title: t.addMenuItem,
          }}
        />
        <Stack.Screen
          component={guarded('MenuAssistant', MenuAssistantScreen)}
          name="MenuAssistant"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          component={guarded('AddHall', AddHallScreen)}
          name="AddHall"
          options={({ route }) => ({
            presentation: 'modal',
            title: route.params?.hallId ? t.editHall : t.addHall,
          })}
        />
        <Stack.Screen
          component={guarded('AddTable', AddTableScreen)}
          name="AddTable"
          options={({ route }) => ({
            presentation: 'modal',
            title: route.params?.tableId ? t.editTable : t.addTable,
          })}
        />
        <Stack.Screen
          component={guarded('EditTable', EditTableScreen)}
          name="EditTable"
          options={{
            presentation: 'modal',
            title: t.editTable,
          }}
        />
        <Stack.Screen
          component={guarded('AddCategory', AddCategoryScreen)}
          name="AddCategory"
          options={{
            presentation: 'modal',
            title: t.addCategory,
          }}
        />
        <Stack.Screen
          component={guarded('Analytics', AnalyticsScreen)}
          name="Analytics"
          options={{
            title: t.analytics,
          }}
        />
        <Stack.Screen
          component={guarded('QRMenu', QRMenuScreen)}
          name="QRMenu"
          options={{
            title: t.qrMenu,
          }}
        />
        <Stack.Screen
          component={guarded('Devices', DeviceManagementScreen)}
          name="Devices"
          options={{
            title: t.devicesTitle,
          }}
        />
        <Stack.Screen
          component={guarded('Approvals', ApprovalsScreen)}
          name="Approvals"
          options={{
            title: t.pendingApprovalTitle ?? 'Approvals',
          }}
        />
        <Stack.Screen
          component={guarded('CancellationReasons', CancellationReasonsScreen)}
          name="CancellationReasons"
          options={{
            title: settingsCopy(language).cancellationReasonsTitle,
          }}
        />
        <Stack.Screen
          component={guarded('Settings', SettingsScreen)}
          name="Settings"
          options={{
            title: t.settings,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
