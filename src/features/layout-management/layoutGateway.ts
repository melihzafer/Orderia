import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  HallRow,
  RestaurantTableRow,
  TableSessionRow,
} from '../../services/supabase/database.types';

export interface LayoutScope {
  readonly organizationId: string;
  readonly branchId: string;
}

export interface ManagedHall {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly nextTableSequence: number;
}

export interface ManagedTable {
  readonly id: string;
  readonly hallId: string;
  readonly label: string;
  readonly sequenceNumber: number;
  readonly sortOrder: number;
  readonly isOpen: boolean;
}

export interface ManagedLayout {
  readonly halls: readonly ManagedHall[];
  readonly tables: readonly ManagedTable[];
}

export class SupabaseLayoutGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async load(scope: LayoutScope): Promise<ManagedLayout> {
    const [hallResult, tableResult, sessionResult] = await Promise.all([
      this.client
        .from('halls')
        .select('*')
        .eq('organization_id', scope.organizationId)
        .eq('branch_id', scope.branchId)
        .is('deleted_at', null)
        .order('sort_order')
        .order('name'),
      this.client
        .from('restaurant_tables')
        .select('*')
        .eq('organization_id', scope.organizationId)
        .eq('branch_id', scope.branchId)
        .is('deleted_at', null)
        .order('sort_order')
        .order('sequence_number'),
      this.client
        .from('table_sessions')
        .select('table_id, status')
        .eq('organization_id', scope.organizationId)
        .eq('branch_id', scope.branchId)
        .in('status', ['open', 'payment_pending'])
        .is('deleted_at', null),
    ]);

    if (hallResult.error) throw hallResult.error;
    if (tableResult.error) throw tableResult.error;
    if (sessionResult.error) throw sessionResult.error;

    const openTableIds = new Set(
      (sessionResult.data as Pick<TableSessionRow, 'table_id'>[]).map((row) => row.table_id),
    );
    const hallRows = hallResult.data as HallRow[];
    const tableRows = tableResult.data as RestaurantTableRow[];
    // restaurant_tables_active_sequence_unique is (branch_id, sequence_number) --
    // sequence numbers are unique across the WHOLE branch, not per hall. A
    // per-hall counter here would suggest 1 for every new hall's first table,
    // colliding with whichever hall already holds that number and making the
    // insert fail with a unique-constraint violation.
    let maxSequenceNumber = 0;
    for (const table of tableRows) {
      maxSequenceNumber = Math.max(maxSequenceNumber, table.sequence_number);
    }
    const nextTableSequence = maxSequenceNumber + 1;

    return {
      halls: hallRows.map((hall) => ({
        id: hall.id,
        name: hall.name,
        sortOrder: hall.sort_order,
        createdAt: hall.created_at,
        nextTableSequence,
      })),
      tables: tableRows.map((table) => ({
        id: table.id,
        hallId: table.hall_id,
        label: table.label,
        sequenceNumber: table.sequence_number,
        sortOrder: table.sort_order,
        isOpen: openTableIds.has(table.id),
      })),
    };
  }

  async saveHall(
    scope: LayoutScope,
    input: { readonly id?: string; readonly name: string; readonly sortOrder?: number },
  ): Promise<void> {
    const payload = {
      name: input.name.trim(),
      sort_order: input.sortOrder ?? 0,
    };
    if (input.id) {
      const { error } = await this.client
        .from('halls')
        .update(payload)
        .eq('id', input.id)
        .eq('organization_id', scope.organizationId)
        .eq('branch_id', scope.branchId)
        .select('id')
        .single();
      if (error) throw error;
      return;
    }

    const { error } = await this.client.from('halls').insert({
      ...payload,
      organization_id: scope.organizationId,
      branch_id: scope.branchId,
    });
    if (error) throw error;
  }

  async archiveHall(scope: LayoutScope, hallId: string): Promise<void> {
    const deletedAt = new Date().toISOString();
    const { error } = await this.client
      .from('halls')
      .update({ deleted_at: deletedAt })
      .eq('id', hallId)
      .eq('organization_id', scope.organizationId)
      .eq('branch_id', scope.branchId)
      .select('id')
      .single();
    if (error) throw error;

    const { error: tablesError } = await this.client
      .from('restaurant_tables')
      .update({ deleted_at: deletedAt })
      .eq('hall_id', hallId)
      .eq('organization_id', scope.organizationId)
      .eq('branch_id', scope.branchId);
    if (tablesError) throw tablesError;
  }

  async saveTable(
    scope: LayoutScope,
    input: {
      readonly id?: string;
      readonly hallId: string;
      readonly label: string;
      readonly sequenceNumber?: number;
      readonly sortOrder?: number;
    },
  ): Promise<void> {
    if (input.id) {
      const { error } = await this.client
        .from('restaurant_tables')
        .update({ label: input.label.trim() })
        .eq('id', input.id)
        .eq('organization_id', scope.organizationId)
        .eq('branch_id', scope.branchId)
        .eq('hall_id', input.hallId)
        .select('id')
        .single();
      if (error) throw error;
      return;
    }

    const { error } = await this.client.from('restaurant_tables').insert({
      organization_id: scope.organizationId,
      branch_id: scope.branchId,
      hall_id: input.hallId,
      label: input.label.trim(),
      sequence_number: input.sequenceNumber ?? 1,
      sort_order: input.sortOrder ?? 0,
    });
    if (error) throw error;
  }

  async archiveTable(scope: LayoutScope, tableId: string): Promise<void> {
    const { error } = await this.client
      .from('restaurant_tables')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tableId)
      .eq('organization_id', scope.organizationId)
      .eq('branch_id', scope.branchId)
      .select('id')
      .single();
    if (error) throw error;
  }
}
