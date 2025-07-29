import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayHistory, Ticket } from '../types';
import { generateDateKey } from '../constants/branding';
import { useMenuStore } from './menuStore';

interface HistoryState {
  dailyHistory: Record<string, DayHistory>; // date -> history
  
  // Actions
  addTicketToHistory: (ticket: Ticket) => void;
  getDayHistory: (date: string) => DayHistory | undefined;
  generateDayReport: (date: string) => DayHistory;
  
  // Selectors
  getHistoryDates: () => string[];
  getTotalGrossForDate: (date: string) => number;
  getCategoryTotalsForDate: (date: string) => Record<string, number>;
  getWeeklyTotal: (startDate: string) => number;
  getMonthlyTotal: (year: number, month: number) => number;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      dailyHistory: {},

      addTicketToHistory: (ticket) => {
        const dateKey = generateDateKey(new Date(ticket.closedAt || Date.now()));
        const currentHistory = get().dailyHistory[dateKey];
        
        if (currentHistory) {
          // Update existing day history
          const updatedHistory: DayHistory = {
            ...currentHistory,
            tickets: [...currentHistory.tickets, ticket],
            totals: calculateDayTotals([...currentHistory.tickets, ticket]),
            generatedAt: Date.now(),
          };
          
          set((state) => ({
            dailyHistory: {
              ...state.dailyHistory,
              [dateKey]: updatedHistory
            }
          }));
        } else {
          // Create new day history
          const newHistory: DayHistory = {
            id: dateKey,
            tickets: [ticket],
            totals: calculateDayTotals([ticket]),
            generatedAt: Date.now(),
          };
          
          set((state) => ({
            dailyHistory: {
              ...state.dailyHistory,
              [dateKey]: newHistory
            }
          }));
        }
      },

      getDayHistory: (date) => {
        return get().dailyHistory[date];
      },

      generateDayReport: (date) => {
        const existingHistory = get().dailyHistory[date];
        if (existingHistory) {
          return existingHistory;
        }

        // Create empty day report
        const emptyHistory: DayHistory = {
          id: date,
          tickets: [],
          totals: { gross: 0, byCategory: {} },
          generatedAt: Date.now(),
        };

        set((state) => ({
          dailyHistory: {
            ...state.dailyHistory,
            [date]: emptyHistory
          }
        }));

        return emptyHistory;
      },

      // Selectors
      getHistoryDates: () => {
        return Object.keys(get().dailyHistory).sort().reverse();
      },

      getTotalGrossForDate: (date) => {
        const history = get().dailyHistory[date];
        return history?.totals.gross || 0;
      },

      getCategoryTotalsForDate: (date) => {
        const history = get().dailyHistory[date];
        return history?.totals.byCategory || {};
      },

      getWeeklyTotal: (startDate) => {
        const start = new Date(startDate);
        const dates = [];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          dates.push(generateDateKey(date));
        }

        return dates.reduce((total, date) => {
          return total + get().getTotalGrossForDate(date);
        }, 0);
      },

      getMonthlyTotal: (year, month) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let total = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateKey = generateDateKey(date);
          total += get().getTotalGrossForDate(dateKey);
        }

        return total;
      },
    }),
    {
      name: 'history-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dailyHistory: state.dailyHistory,
      }),
    }
  )
);

// Helper function to calculate day totals
function calculateDayTotals(tickets: Ticket[]): { gross: number; byCategory: Record<string, number> } {
  const categories = useMenuStore.getState().categories;
  const menuItems = useMenuStore.getState().menuItems;
  
  let gross = 0;
  const byCategory: Record<string, number> = {};

  // Initialize category totals
  categories.forEach(cat => {
    byCategory[cat.name] = 0;
  });

  tickets.forEach(ticket => {
    ticket.lines.forEach(line => {
      const lineTotal = line.priceSnapshot * line.quantity;
      gross += lineTotal;

      // Find category for this menu item
      const menuItem = menuItems.find(item => item.id === line.menuItemId);
      if (menuItem) {
        const category = categories.find(cat => cat.id === menuItem.categoryId);
        if (category) {
          byCategory[category.name] = (byCategory[category.name] || 0) + lineTotal;
        }
      }
    });
  });

  return { gross, byCategory };
}
