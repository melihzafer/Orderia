import type { SupabaseClient } from '@supabase/supabase-js';
import type { CancellationReasonRow, Database } from '../../services/supabase/database.types';

export interface CancellationReasonScope {
  readonly organizationId: string;
  readonly branchId: string;
}

export interface ManagedCancellationReason {
  readonly id: string;
  readonly name: string;
  readonly requiresManager: boolean;
  readonly isActive: boolean;
}

function toManaged(row: CancellationReasonRow): ManagedCancellationReason {
  return {
    id: row.id,
    name: row.name,
    requiresManager: row.requires_manager,
    isActive: row.is_active,
  };
}

/**
 * `cancellation_reasons` doğrudan PostgREST üzerinden yönetici RLS'iyle
 * yazılabilir (checks/order_items'ın aksine özel bir RPC gerekmiyor) — bu
 * yüzden gateway diğer komut-tabanlı akışlardan daha basit.
 */
export class SupabaseCancellationReasonGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(scope: CancellationReasonScope): Promise<readonly ManagedCancellationReason[]> {
    const { data, error } = await this.client
      .from('cancellation_reasons')
      .select('*')
      .eq('organization_id', scope.organizationId)
      .eq('branch_id', scope.branchId)
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return (data as CancellationReasonRow[]).map(toManaged);
  }

  async create(
    scope: CancellationReasonScope,
    input: { readonly name: string; readonly requiresManager: boolean },
  ): Promise<void> {
    const { error } = await this.client.from('cancellation_reasons').insert({
      organization_id: scope.organizationId,
      branch_id: scope.branchId,
      name: input.name.trim(),
      requires_manager: input.requiresManager,
    });
    if (error) throw error;
  }

  async setActive(
    scope: CancellationReasonScope,
    reasonId: string,
    isActive: boolean,
  ): Promise<void> {
    const { error } = await this.client
      .from('cancellation_reasons')
      .update({ is_active: isActive })
      .eq('id', reasonId)
      .eq('organization_id', scope.organizationId)
      .eq('branch_id', scope.branchId)
      .select('id')
      .single();
    if (error) throw error;
  }

  async rename(scope: CancellationReasonScope, reasonId: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('cancellation_reasons')
      .update({ name: name.trim() })
      .eq('id', reasonId)
      .eq('organization_id', scope.organizationId)
      .eq('branch_id', scope.branchId)
      .select('id')
      .single();
    if (error) throw error;
  }
}
