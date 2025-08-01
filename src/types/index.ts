// Core data models for Orderia app

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number; // in cents (e.g., 12.50 => 1250)
  description?: string;
  isActive: boolean;
}

export interface Hall {
  id: string;
  name: string;
  createdAt: number;
  nextTableSequence: number; // auto-increment counter for tables
}

export interface Table {
  id: string; // hallId + '-' + seq
  hallId: string;
  seq: number; // auto-generated
  label?: string; // user-defined alias
  isOpen: boolean;
  activeTicketId?: string;
}

export interface Ticket {
  id: string;
  tableId: string;
  status: 'open' | 'paid';
  createdAt: number;
  closedAt?: number;
  lines: TicketLine[];
}

export interface TicketLine {
  id: string;
  menuItemId: string;
  nameSnapshot: string; // preserved even if menu item name changes
  priceSnapshot: number; // preserved even if menu item price changes
  quantity: number;
  note?: string;
  status: 'pending' | 'delivered' | 'paid';
  createdAt: number;
  updatedAt: number;
}

export interface DayHistory {
  id: string; // YYYY-MM-DD format
  tickets: Ticket[]; // closed tickets snapshot
  totals: { 
    gross: number; 
    byCategory: Record<string, number>; 
  };
  generatedAt: number;
}

// Status types
  status: 'pending' | 'delivered' | 'paid' | 'cancelled';
}

export interface AddTicketLineData {
  menuItemId: string;
  quantity: number;
  note?: string;
}

export type OrderStatus = 'pending' | 'delivered' | 'paid' | 'cancelled';
export type TicketStatus = 'open' | 'paid';

// UI related types
export interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

// Store state types
export interface MenuState {
  categories: Category[];
  menuItems: MenuItem[];
}

export interface LayoutState {
  halls: Hall[];
  tables: Table[];
}

export interface OrderState {
  openTickets: Record<string, Ticket>; // ticketId -> ticket
}

export interface HistoryState {
  dailyHistory: Record<string, DayHistory>; // date -> history
}

// API/Action types
export interface CreateCategoryData {
  name: string;
  order?: number;
}

export interface CreateMenuItemData {
  categoryId: string;
  name: string;
  price: number;
  description?: string;
}

export interface CreateHallData {
  name: string;
}

export interface CreateTableData {
  hallId: string;
  label?: string;
}

export interface AddTicketLineData {
  menuItemId: string;
  quantity: number;
  note?: string;
}
