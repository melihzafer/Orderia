import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAdaptiveLayout } from '../design-system';
import { useLocalization } from '../i18n';
import {
  AddCategoryScreen,
  AddHallScreen,
  AddTableScreen,
  AddMenuItemScreen,
  AnalyticsScreen,
  ApprovalsScreen,
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
import { AdaptiveTabBar } from './AdaptiveTabBar';
// Rota tipleri `./routes` içinde yaşıyor. Ekranlar da oradan alıyor; böylece
// "navigatör bütün ekranları, her ekran da navigatörü içe aktarır" döngüsü yok.
import type { RootStackParamList, TabParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const { activeMembership, status } = useAuth();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const isManager = status === 'unconfigured' || activeMembership?.role === 'manager';
  const layout = useAdaptiveLayout();
  const expandedManager = layout.mode === 'expanded' && isManager;

  return (
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
        component={TablesHomeScreen}
        name="Masalar"
        options={{
          headerShown: false,
          title: t.tablesNav,
        }}
      />
      <Tab.Screen
        component={OrdersFlowScreen}
        name="Orders"
        options={{
          headerShown: false,
          title: t.ordersNav,
        }}
      />
      <Tab.Screen
        component={HomeScreen}
        name="Home"
        options={{
          title: t.homeNav,
        }}
      />
      <Tab.Screen
        component={MenuScreen}
        name="Menu"
        options={{
          headerShown: false,
          title: t.menu,
        }}
      />
      <Tab.Screen
        component={HistoryScreen}
        name="Receipts"
        options={{
          headerShown: false,
          title: t.receiptsNav,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { tokens } = useTheme();
  const { t } = useLocalization();
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
          component={NewOrderScreen}
          name="NewOrder"
          options={{ headerShown: false, presentation: 'modal', title: t.newOrder }}
        />
        <Stack.Screen
          component={TableDetailScreen}
          name="TableDetail"
          options={{
            headerShown: false,
            title: t.tableDetail,
          }}
        />
        <Stack.Screen
          component={TablesScreen}
          name="Tables"
          options={{
            title: t.tablesTitle,
          }}
        />
        <Stack.Screen
          component={HallTablesScreen}
          name="HallTables"
          options={{
            title: t.tablesTitle,
          }}
        />
        <Stack.Screen
          component={AddMenuItemScreen}
          name="AddMenuItem"
          options={{
            presentation: 'modal',
            title: t.addMenuItem,
          }}
        />
        <Stack.Screen
          component={MenuAssistantScreen}
          name="MenuAssistant"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          component={AddHallScreen}
          name="AddHall"
          options={({ route }) => ({
            presentation: 'modal',
            title: route.params?.hallId ? t.editHall : t.addHall,
          })}
        />
        <Stack.Screen
          component={AddTableScreen}
          name="AddTable"
          options={({ route }) => ({
            presentation: 'modal',
            title: route.params?.tableId ? t.editTable : t.addTable,
          })}
        />
        <Stack.Screen
          component={EditTableScreen}
          name="EditTable"
          options={{
            presentation: 'modal',
            title: t.editTable,
          }}
        />
        <Stack.Screen
          component={AddCategoryScreen}
          name="AddCategory"
          options={{
            presentation: 'modal',
            title: t.addCategory,
          }}
        />
        <Stack.Screen
          component={AnalyticsScreen}
          name="Analytics"
          options={{
            title: t.analytics,
          }}
        />
        <Stack.Screen
          component={QRMenuScreen}
          name="QRMenu"
          options={{
            title: t.qrMenu,
          }}
        />
        <Stack.Screen
          component={DeviceManagementScreen}
          name="Devices"
          options={{
            title: t.devicesTitle,
          }}
        />
        <Stack.Screen
          component={ApprovalsScreen}
          name="Approvals"
          options={{
            title: t.pendingApprovalTitle ?? 'Approvals',
          }}
        />
        <Stack.Screen
          component={SettingsScreen}
          name="Settings"
          options={{
            title: t.settings,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
