import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../services/supabase';
import { RepositoryScope } from '../contracts';

export type RealtimeSyncConnectionState =
  'connecting' | 'subscribed' | 'timed_out' | 'closed' | 'error';

export interface RealtimeSyncHintSubscription {
  unsubscribe(): Promise<void>;
}

export async function subscribeToRealtimeSyncHints(
  client: SupabaseClient<Database>,
  scope: Required<RepositoryScope>,
  onHint: (cursor: string) => void,
  onConnectionState?: (state: RealtimeSyncConnectionState) => void,
): Promise<RealtimeSyncHintSubscription> {
  await client.realtime.setAuth();
  onConnectionState?.('connecting');

  const channel = client
    .channel(syncTopic(scope), { config: { private: true } })
    .on('broadcast', { event: 'sync_hint' }, ({ payload }) => {
      const cursor = readSyncHintCursor(payload);
      if (cursor) onHint(cursor);
    })
    .subscribe((status) => {
      onConnectionState?.(connectionState(status));
    });

  return {
    async unsubscribe() {
      await removeChannel(client, channel);
    },
  };
}

export function syncTopic(scope: Required<RepositoryScope>): string {
  return `orderia:${scope.organizationId}:${scope.branchId}:sync`;
}

export function readSyncHintCursor(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return null;
  }
  const cursor = (payload as { readonly cursor?: unknown }).cursor;
  if (typeof cursor === 'number' && Number.isSafeInteger(cursor) && cursor >= 0) {
    return String(cursor);
  }
  if (typeof cursor === 'string' && /^(0|[1-9][0-9]*)$/.test(cursor)) {
    return cursor;
  }
  return null;
}

function connectionState(status: string): RealtimeSyncConnectionState {
  switch (status) {
    case 'SUBSCRIBED':
      return 'subscribed';
    case 'TIMED_OUT':
      return 'timed_out';
    case 'CLOSED':
      return 'closed';
    case 'CHANNEL_ERROR':
      return 'error';
    default:
      return 'connecting';
  }
}

async function removeChannel(
  client: SupabaseClient<Database>,
  channel: RealtimeChannel,
): Promise<void> {
  await client.removeChannel(channel);
}
