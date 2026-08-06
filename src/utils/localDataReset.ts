import { useHistoryStore } from '../stores/historyStore';
import { useLayoutStore } from '../stores/layoutStore';
import { useMenuStore } from '../stores/menuStore';
import { useOrderStore } from '../stores/orderStore';
import { useProductPhotoStore } from '../stores/productPhotoStore';

/** Clears only device-local operational data. Shared Supabase rows are untouched. */
export function resetLocalOperationalData(): void {
  useLayoutStore.setState({ halls: [], tables: [] });
  useMenuStore.setState({ categories: [], menuItems: [] });
  useOrderStore.setState({ openTickets: {} });
  useHistoryStore.setState({ dailyHistory: {} });
  useProductPhotoStore.setState({ photoUris: {} });
}
