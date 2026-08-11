import { create } from 'zustand';
import type { DraftOrderLine } from './orderCommands';

/**
 * Masa başına gönderilmemiş taslak. TableDetail ve AddProduct ekranları arasında
 * geçişte taslağın kaybolmaması için ekran state'i yerine burada tutulur —
 * bilerek `persist` edilmez, oturum kapanınca taslak da kapanır.
 */
interface WorkspaceDraftState {
  readonly draftsByTable: Readonly<Record<string, readonly DraftOrderLine[]>>;
  readonly undoByTable: Readonly<Record<string, readonly (readonly DraftOrderLine[])[]>>;
  readonly setDraft: (tableId: string, lines: readonly DraftOrderLine[]) => void;
  readonly pushUndo: (tableId: string, previous: readonly DraftOrderLine[]) => void;
  readonly popUndo: (tableId: string) => readonly DraftOrderLine[] | undefined;
  readonly clearDraft: (tableId: string) => void;
}

const MAX_UNDO_DEPTH = 20;

export const useWorkspaceDraftStore = create<WorkspaceDraftState>()((set, get) => ({
  draftsByTable: {},
  undoByTable: {},

  setDraft: (tableId, lines) =>
    set((state) => ({ draftsByTable: { ...state.draftsByTable, [tableId]: lines } })),

  pushUndo: (tableId, previous) =>
    set((state) => ({
      undoByTable: {
        ...state.undoByTable,
        [tableId]: [...(state.undoByTable[tableId] ?? []).slice(-(MAX_UNDO_DEPTH - 1)), previous],
      },
    })),

  popUndo: (tableId) => {
    const stack = get().undoByTable[tableId] ?? [];
    const previous = stack.at(-1);
    if (previous) {
      set((state) => ({
        undoByTable: { ...state.undoByTable, [tableId]: stack.slice(0, -1) },
      }));
    }
    return previous;
  },

  clearDraft: (tableId) =>
    set((state) => {
      const draftsByTable = { ...state.draftsByTable };
      const undoByTable = { ...state.undoByTable };
      delete draftsByTable[tableId];
      delete undoByTable[tableId];
      return { draftsByTable, undoByTable };
    }),
}));

/** Verilen masanın taslak satırlarını okur; yoksa boş dizi. */
export function useTableDraft(tableId: string): readonly DraftOrderLine[] {
  return useWorkspaceDraftStore((state) => state.draftsByTable[tableId] ?? []);
}

/** Verilen masanın geri-al derinliğini okur. */
export function useTableDraftUndoDepth(tableId: string): number {
  return useWorkspaceDraftStore((state) => (state.undoByTable[tableId] ?? []).length);
}
