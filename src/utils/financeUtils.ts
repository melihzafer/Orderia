import { TicketLine } from '../types';

type BillableLine = Pick<TicketLine, 'priceSnapshot' | 'quantity' | 'status'>;

export function isBillableLine(line: Pick<TicketLine, 'status'>): boolean {
  return line.status !== 'cancelled';
}

export function calculateLinesTotal(lines: BillableLine[]): number {
  return lines.reduce(
    (total, line) => (isBillableLine(line) ? total + line.priceSnapshot * line.quantity : total),
    0,
  );
}
