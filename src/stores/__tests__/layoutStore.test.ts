import { useLayoutStore } from '../layoutStore';

describe('layout store', () => {
  beforeEach(() => {
    useLayoutStore.setState({ halls: [], tables: [] });
  });

  it('keeps the hall and table flow connected', () => {
    const hall = useLayoutStore.getState().addHall({ name: 'Salon 1' });
    const firstTable = useLayoutStore.getState().addTable({ hallId: hall.id });
    const secondTable = useLayoutStore.getState().addTable({ hallId: hall.id, label: 'Pencere' });

    expect(useLayoutStore.getState().getHallsWithTables()).toEqual([
      expect.objectContaining({
        id: hall.id,
        name: 'Salon 1',
        nextTableSequence: 3,
        tables: [
          expect.objectContaining({ id: firstTable.id, seq: 1 }),
          expect.objectContaining({ id: secondTable.id, label: 'Pencere', seq: 2 }),
        ],
      }),
    ]);
  });

  it('updates labels and removes a hall together with its tables', () => {
    const hall = useLayoutStore.getState().addHall({ name: 'Salon 1' });
    const table = useLayoutStore.getState().addTable({ hallId: hall.id });

    useLayoutStore.getState().updateHall(hall.id, { name: 'Teras' });
    useLayoutStore.getState().updateTable(table.id, { label: 'Masa 1' });

    expect(useLayoutStore.getState().getTable(table.id)?.label).toBe('Masa 1');
    expect(useLayoutStore.getState().halls[0]?.name).toBe('Teras');

    useLayoutStore.getState().deleteHall(hall.id);

    expect(useLayoutStore.getState().halls).toEqual([]);
    expect(useLayoutStore.getState().tables).toEqual([]);
  });
});
