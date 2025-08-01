import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket, TicketLine, AddTicketLineData, OrderStatus } from '../types';
import { generateId } from '../constants/branding';
import { useLayoutStore } from './layoutStore';
import { useMenuStore } from './menuStore';
import { useHistoryStore } from './historyStore';

interface OrderState {
  openTickets: Record<string, Ticket>; // ticketId -> ticket
  
  // Ticket actions
  openTable: (tableId: string) => Ticket;
  closeTicket: (ticketId: string) => void;
  
  // Line actions
  addTicketLine: (ticketId: string, data: AddTicketLineData) => TicketLine;
  updateTicketLine: (ticketId: string, lineId: string, data: Partial<TicketLine>) => void;
  removeTicketLine: (ticketId: string, lineId: string) => void;
  updateLineStatus: (ticketId: string, lineId: string, status: OrderStatus) => void;
  updateLineQuantity: (ticketId: string, lineId: string, quantity: number) => void;
  
  // Batch actions
  markAllDelivered: (ticketId: string) => void;
  payTicket: (ticketId: string) => void;
  
  // Selectors
  getTicket: (ticketId: string) => Ticket | undefined;
  getTicketByTable: (tableId: string) => Ticket | undefined;
  getTicketTotal: (ticketId: string) => number;
  getAllOpenTickets: () => Ticket[];
  getTodayTotal: () => number;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      openTickets: {},

      // Ticket actions
      openTable: (tableId) => {
        const existingTicket = Object.values(get().openTickets).find(
          ticket => ticket.tableId === tableId && ticket.status === 'open'
        );
        
        if (existingTicket) {
          return existingTicket;
        }

        const ticket: Ticket = {
          id: generateId(),
          tableId,
          status: 'open',
          createdAt: Date.now(),
          lines: [],
        };

        set((state) => ({
          openTickets: {
            ...state.openTickets,
            [ticket.id]: ticket
          }
        }));

        // Update table status
        useLayoutStore.getState().updateTable(tableId, {
          isOpen: true,
          activeTicketId: ticket.id
        });

        return ticket;
      },

      closeTicket: (ticketId) => {
        const ticket = get().openTickets[ticketId];
        if (!ticket) return;

        set((state) => {
          const { [ticketId]: removedTicket, ...remainingTickets } = state.openTickets;
          return { openTickets: remainingTickets };
        });

        // Update table status
        useLayoutStore.getState().updateTable(ticket.tableId, {
          isOpen: false,
          activeTicketId: undefined
        });
      },

      // Line actions
      addTicketLine: (ticketId, data) => {
        const menuItem = useMenuStore.getState().menuItems.find(
          item => item.id === data.menuItemId
        );
        
        if (!menuItem) {
          throw new Error('Menu item not found');
        }

        const line: TicketLine = {
          id: generateId(),
          menuItemId: data.menuItemId,
          nameSnapshot: menuItem.name,
          priceSnapshot: menuItem.price,
          quantity: data.quantity,
          note: data.note,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          openTickets: {
            ...state.openTickets,
            [ticketId]: {
              ...state.openTickets[ticketId],
              lines: [...state.openTickets[ticketId].lines, line]
            }
          }
        }));

        return line;
      },

      updateTicketLine: (ticketId, lineId, data) => {
        set((state) => ({
          openTickets: {
            ...state.openTickets,
            [ticketId]: {
              ...state.openTickets[ticketId],
              lines: state.openTickets[ticketId].lines.map((line) =>
                line.id === lineId 
                  ? { ...line, ...data, updatedAt: Date.now() }
                  : line
              )
            }
          }
        }));
      },

      removeTicketLine: (ticketId, lineId) => {
        set((state) => ({
          openTickets: {
            ...state.openTickets,
            [ticketId]: {
              ...state.openTickets[ticketId],
              lines: state.openTickets[ticketId].lines.filter(
                (line) => line.id !== lineId || line.status !== 'pending'
              )
            }
          }
        }));
      },

      updateLineStatus: (ticketId, lineId, status) => {
        get().updateTicketLine(ticketId, lineId, { status });
      },

      updateLineQuantity: (ticketId, lineId, quantity) => {
        if (quantity <= 0) {
          get().removeTicketLine(ticketId, lineId);
        } else {
          get().updateTicketLine(ticketId, lineId, { quantity });
        }
      },

      // Batch actions
      markAllDelivered: (ticketId) => {
        const ticket = get().openTickets[ticketId];
        if (!ticket) return;

        set((state) => ({
          openTickets: {
            ...state.openTickets,
            [ticketId]: {
              ...ticket,
              lines: ticket.lines.map((line) =>
                line.status === 'pending' 
                  ? { ...line, status: 'delivered' as OrderStatus, updatedAt: Date.now() }
                  : line
              )
            }
          }
        }));
      },

      payTicket: (ticketId) => {
        const ticket = get().openTickets[ticketId];
        if (!ticket) return;

        const paidTicket: Ticket = {
          ...ticket,
          status: 'paid',
          closedAt: Date.now(),
          lines: ticket.lines.map((line) => ({
            ...line,
            status: 'paid' as OrderStatus,
            updatedAt: Date.now()
          }))
        };

        // Add to history
        useHistoryStore.getState().addTicketToHistory(paidTicket);

        // Remove from open tickets
        get().closeTicket(ticketId);
      },

      // Selectors
      getTicket: (ticketId) => {
        return get().openTickets[ticketId];
      },

      getTicketByTable: (tableId) => {
        return Object.values(get().openTickets).find(
          ticket => ticket.tableId === tableId
        );
      },

      getTicketTotal: (ticketId) => {
        const ticket = get().openTickets[ticketId];
        if (!ticket) return 0;

        return ticket.lines.reduce((total, line) => {
          // Exclude cancelled items from total calculation
          if (line.status === 'cancelled') return total;
          return total + (line.priceSnapshot * line.quantity);
        }, 0);
      },

      getAllOpenTickets: () => {
        return Object.values(get().openTickets);
      },

      getTodayTotal: () => {
        const tickets = Object.values(get().openTickets);
        return tickets.reduce((total, ticket) => {
          return total + get().getTicketTotal(ticket.id);
        }, 0);
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        openTickets: state.openTickets,
      }),
    }
  )
);
