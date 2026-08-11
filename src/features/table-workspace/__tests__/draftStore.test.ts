import type { DraftOrderLine } from '../orderCommands';
import { useWorkspaceDraftStore } from '../draftStore';

/**
 * Taslak artık ekran state'i değil, masa kimliğine göre bu store'da tutuluyor —
 * AddProductScreen ve TableDetailScreen aynı taslağı paylaşabilsin diye.
 * Buradaki testler masa izolasyonunu ve undo derinliğini doğruluyor.
 */

function line(id: string, quantity = 1): DraftOrderLine {
  return {
    id,
    quantity,
    selectedOptionIds: [],
    product: { id: `product-${id}` },
  } as unknown as DraftOrderLine;
}

beforeEach(() => {
  useWorkspaceDraftStore.setState({ draftsByTable: {}, undoByTable: {} });
});

describe('useWorkspaceDraftStore', () => {
  it('keeps drafts isolated per table', () => {
    const store = useWorkspaceDraftStore.getState();
    store.setDraft('table-1', [line('a')]);
    store.setDraft('table-2', [line('b'), line('c')]);

    const state = useWorkspaceDraftStore.getState();
    expect(state.draftsByTable['table-1']).toHaveLength(1);
    expect(state.draftsByTable['table-2']).toHaveLength(2);
  });

  it('reads an empty draft for a table that was never touched', () => {
    expect(useWorkspaceDraftStore.getState().draftsByTable['unknown-table']).toBeUndefined();
  });

  it('pushes and pops undo snapshots per table', () => {
    const store = useWorkspaceDraftStore.getState();
    store.pushUndo('table-1', []);
    store.pushUndo('table-1', [line('a')]);
    expect(useWorkspaceDraftStore.getState().undoByTable['table-1']).toHaveLength(2);

    const popped = useWorkspaceDraftStore.getState().popUndo('table-1');
    expect(popped).toEqual([line('a')]);
    expect(useWorkspaceDraftStore.getState().undoByTable['table-1']).toHaveLength(1);
  });

  it('caps undo depth at 20 entries', () => {
    const store = useWorkspaceDraftStore.getState();
    for (let index = 0; index < 25; index += 1) {
      store.pushUndo('table-1', [line(String(index))]);
    }
    expect(useWorkspaceDraftStore.getState().undoByTable['table-1']).toHaveLength(20);
  });

  it('clears both the draft and its undo stack for a table', () => {
    const store = useWorkspaceDraftStore.getState();
    store.setDraft('table-1', [line('a')]);
    store.pushUndo('table-1', []);
    store.clearDraft('table-1');

    const state = useWorkspaceDraftStore.getState();
    expect(state.draftsByTable['table-1']).toBeUndefined();
    expect(state.undoByTable['table-1']).toBeUndefined();
  });
});
