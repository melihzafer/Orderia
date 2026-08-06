import { Hall, Table } from '../../types';
import { ManagedLayout } from './layoutGateway';

export function toLegacyLayout(layout: ManagedLayout): {
  readonly halls: readonly Hall[];
  readonly tables: readonly Table[];
} {
  return {
    halls: layout.halls.map((hall) => ({
      id: hall.id,
      name: hall.name,
      createdAt: Date.parse(hall.createdAt) || Date.now(),
      nextTableSequence: hall.nextTableSequence,
    })),
    tables: layout.tables.map((table) => ({
      id: table.id,
      hallId: table.hallId,
      seq: table.sequenceNumber,
      label: table.label,
      isOpen: table.isOpen,
      activeTicketIds: [],
    })),
  };
}
