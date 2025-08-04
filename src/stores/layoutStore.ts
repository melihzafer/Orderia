import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Hall, Table, CreateHallData, CreateTableData } from '../types';
import { generateId, generateTableId } from '../constants/branding';

interface LayoutState {
  halls: Hall[];
  tables: Table[];
  
  // Hall actions
  addHall: (data: CreateHallData) => Hall;
  updateHall: (id: string, data: Partial<Hall>) => void;
  deleteHall: (id: string) => void;
  
  // Table actions
  addTable: (data: CreateTableData) => Table;
  updateTable: (id: string, data: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  
  // Selectors
  getHallsWithTables: () => Array<Hall & { tables: Table[] }>;
  getTablesByHall: (hallId: string) => Table[];
  getOpenTables: () => Table[];
  getTable: (tableId: string) => Table | undefined;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      halls: [],
      tables: [],

      // Hall actions
      addHall: (data) => {
        const hall: Hall = {
          id: generateId(),
          name: data.name,
          createdAt: Date.now(),
          nextTableSequence: 1,
        };
        
        set((state) => ({
          halls: [...state.halls, hall]
        }));
        
        return hall;
      },

      updateHall: (id, data) => {
        set((state) => ({
          halls: state.halls.map((hall) =>
            hall.id === id ? { ...hall, ...data } : hall
          )
        }));
      },

      deleteHall: (id) => {
        set((state) => ({
          halls: state.halls.filter((hall) => hall.id !== id),
          tables: state.tables.filter((table) => table.hallId !== id)
        }));
      },

      // Table actions
      addTable: (data) => {
        const hall = get().halls.find(h => h.id === data.hallId);
        if (!hall) {
          throw new Error('Hall not found');
        }

        const table: Table = {
          id: generateTableId(data.hallId, hall.nextTableSequence),
          hallId: data.hallId,
          seq: hall.nextTableSequence,
          label: data.label,
          isOpen: false,
          activeTicketIds: [],
        };
        
        set((state) => ({
          tables: [...state.tables, table],
          halls: state.halls.map((h) =>
            h.id === data.hallId 
              ? { ...h, nextTableSequence: h.nextTableSequence + 1 }
              : h
          )
        }));
        
        return table;
      },

      updateTable: (id, data) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === id ? { ...table, ...data } : table
          )
        }));
      },

      deleteTable: (id) => {
        set((state) => ({
          tables: state.tables.filter((table) => table.id !== id)
        }));
      },

      // Selectors
      getHallsWithTables: () => {
        const { halls, tables } = get();
        return halls.map((hall) => ({
          ...hall,
          tables: tables.filter((table) => table.hallId === hall.id)
        }));
      },

      getTablesByHall: (hallId) => {
        return get().tables.filter((table) => table.hallId === hallId);
      },

      getOpenTables: () => {
        return get().tables.filter((table) => table.isOpen);
      },

      getTable: (tableId) => {
        return get().tables.find((table) => table.id === tableId);
      },
    }),
    {
      name: 'layout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        halls: state.halls,
        tables: state.tables,
      }),
    }
  )
);
