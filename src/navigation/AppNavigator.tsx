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
  AddMenuItemScreen,
  AnalyticsScreen,
  DeviceManagementScreen,
  EditTableScreen,
  HistoryScreen,
  MenuScreen,
  QRMenuScreen,
  SettingsScreen,
  ShiftBoardScreen,
  TableDetailScreen,
} from '../screens';
import { AdaptiveTabBar } from './AdaptiveTabBar';

export type RootStackParamList = {
  MainTabs: undefined;
  TableDetail: { tableId: string };
  AddMenuItem: { categoryId?: string; itemId?: string };
  AddHall: { hallId?: string };
  EditTable: { tableId: string };
  AddCategory: { categoryId?: string };
  Analytics: undefined;
  QRMenu: undefined;
  Devices: undefined;
};

export type TabParamList = {
  Service: undefined;
  Receipts: undefined;
  Profile: undefined;
  Menu: undefined;
  Reports: undefined;
  More: undefined;
};

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
        component={ShiftBoardScreen}
        name="Service"
        options={{
          headerShown: false,
          title: t.serviceNav,
        }}
      />
      {isManager ? (
        <>
          <Tab.Screen
            component={MenuScreen}
            name="Menu"
            options={{
              headerTitle: t.menuManagement,
              title: t.menu,
            }}
          />
          <Tab.Screen
            component={AnalyticsScreen}
            name="Reports"
            options={{
              headerTitle: t.salesAnalytics,
              title: t.reportsNav,
            }}
          />
          <Tab.Screen
            component={SettingsScreen}
            name="More"
            options={{
              headerTitle: t.settings,
              title: t.moreNav,
            }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            component={HistoryScreen}
            name="Receipts"
            options={{
              headerTitle: t.salesHistory,
              title: t.receiptsNav,
            }}
          />
          <Tab.Screen
            component={SettingsScreen}
            name="Profile"
            options={{
              headerTitle: t.profileNav,
              title: t.profileNav,
            }}
          />
        </>
      )}
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
          component={TableDetailScreen}
          name="TableDetail"
          options={{
            presentation: 'modal',
            title: t.tableDetail,
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
          component={AddHallScreen}
          name="AddHall"
          options={{
            presentation: 'modal',
            title: t.addHall,
          }}
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
            presentation: 'modal',
            title: t.analytics,
          }}
        />
        <Stack.Screen
          component={QRMenuScreen}
          name="QRMenu"
          options={{
            presentation: 'modal',
            title: t.qrMenu,
          }}
        />
        <Stack.Screen
          component={DeviceManagementScreen}
          name="Devices"
          options={{
            title: 'Authorized devices',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
