import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Rota sözleşmesi — yalnızca tipler, hiçbir ekran içe aktarılmaz.
 *
 * Bu dosya `AppNavigator`'dan ayrıldı çünkü orada durduğunda kaçınılmaz bir
 * döngü oluşuyordu: `AppNavigator` bütün ekranları `screens/index.ts` üzerinden
 * içe aktarıyor, her ekran da rota tiplerini `AppNavigator`'dan geri istiyordu.
 * On sekiz dairesel bağımlılığın tamamı bu tek desenden geliyordu.
 *
 * Kural: buraya yalnızca tip girer. Bir değer eklemek döngüyü geri getirir.
 */

export type TableFocusFilter = 'all' | 'mine' | 'alerts' | 'open' | 'payment' | 'available';

export interface TableListParams {
  readonly focus?: TableFocusFilter;
  readonly search?: boolean;
}

export type TabParamList = {
  Masalar: TableListParams | undefined;
  Home: undefined;
  Orders: TableListParams | undefined;
  Receipts: undefined;
  Menu: undefined;
};

export type RootStackParamList = {
  // Ayarlardan menü sekmesine geçebilmek için iç içe rota parametreleri açık:
  // navigation.navigate('MainTabs', { screen: 'Menu' })
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  NewOrder: undefined;
  TableDetail: { tableId: string };
  Tables: undefined;
  HallTables: { hallId: string };
  AddMenuItem: { categoryId?: string; itemId?: string };
  MenuAssistant: undefined;
  AddHall: { hallId?: string };
  AddTable: { hallId: string; tableId?: string };
  EditTable: { tableId: string };
  AddCategory: { categoryId?: string };
  Analytics: undefined;
  Approvals: undefined;
  QRMenu: undefined;
  Devices: undefined;
  Settings: undefined;
};
