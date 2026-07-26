import { SupabaseClient } from '@supabase/supabase-js';
import { JsonValue } from '../../domain';
import { Database } from '../../services/supabase';
import { RepositoryScope } from '../contracts';
import { MutationPushError } from './retryPolicy';

export type RemoteSyncOperation = 'insert' | 'update' | 'delete';

export interface RemoteSyncEvent {
  readonly cursor: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly repository: string;
  readonly entityId: string;
  readonly operation: RemoteSyncOperation;
  readonly payload: JsonValue;
  readonly serverVersion?: number;
  readonly clientMutationId?: string;
  readonly committedAt: string;
}

export interface SyncPullGateway {
  pull(
    scope: Required<RepositoryScope>,
    afterCursor: string,
    pageSize: number,
  ): Promise<readonly RemoteSyncEvent[]>;
}

export class SupabaseSyncPullGateway implements SyncPullGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async pull(
    scope: Required<RepositoryScope>,
    afterCursor: string,
    pageSize: number,
  ): Promise<readonly RemoteSyncEvent[]> {
    const { data, error } = await this.client.rpc('pull_sync_events', {
      requested_organization_id: scope.organizationId,
      requested_branch_id: scope.branchId,
      after_sequence: afterCursor,
      page_size: pageSize,
    });

    if (error) {
      throw new MutationPushError(error.message, { code: error.code });
    }

    return data.map((row) => ({
      cursor: row.cursor,
      organizationId: row.organization_id,
      branchId: row.branch_id,
      repository: row.repository,
      entityId: row.entity_id,
      operation: row.operation,
      payload: row.payload_json as JsonValue,
      ...(row.server_version === null ? {} : { serverVersion: row.server_version }),
      ...(row.client_mutation_id === null ? {} : { clientMutationId: row.client_mutation_id }),
      committedAt: row.committed_at,
    }));
  }
}
