import { SupabaseClient } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { BranchId, DeviceId, MutationId, OrganizationId, toDomainId } from '../../domain';
import {
  ConfirmCheckPaymentsCommand,
  ConfirmCheckPaymentsResult,
  SupabasePaymentGateway,
} from '../../features/payments';
import { ActiveSessionParticipantRow, Database, getSupabaseClient } from '../../services/supabase';
import { LocalDatabase, RepositoryScope } from '../contracts';
import {
  OutboxPushWorker,
  SupabaseMutationPushGateway,
  SupabaseSyncPullGateway,
  SyncPullEngine,
  SyncStatusSnapshot,
  deriveSyncStatus,
  subscribeToRealtimeSyncHints,
} from '../sync';
import { openPlatformLocalDatabase } from './openPlatformLocalDatabase';
import { inspectLocalSync } from './syncInspection';

export type OrderiaDataMode = 'local_only' | 'cloud';
export type OrderiaDataReadiness = 'opening' | 'ready' | 'error';

export interface OrderiaDataContextValue {
  readonly database: LocalDatabase | null;
  readonly mode: OrderiaDataMode;
  readonly readiness: OrderiaDataReadiness;
  readonly scope: Required<RepositoryScope> | null;
  readonly sync: SyncStatusSnapshot;
  readonly revision: number;
  readonly lastSuccessfulSyncAt?: string;
  readonly errorMessage?: string;
  refresh(): Promise<void>;
  resolveProfileNames(userIds: readonly string[]): Promise<Readonly<Record<string, string>>>;
  resolveActiveParticipants(
    tableSessionId: string,
  ): Promise<readonly ActiveSessionParticipantRow[]>;
  confirmCheckPayments(
    deviceId: DeviceId,
    clientMutationId: MutationId,
    command: ConfirmCheckPaymentsCommand,
  ): Promise<ConfirmCheckPaymentsResult>;
}

interface OrderiaDataProviderProps {
  readonly children: React.ReactNode;
  readonly openDatabase?: () => Promise<LocalDatabase>;
  readonly client?: SupabaseClient<Database> | null;
}

const initialSync = deriveSyncStatus({
  online: browserIsOnline(),
  pendingCount: 0,
  conflictCount: 0,
  syncing: false,
  hasError: false,
});

const OrderiaDataContext = createContext<OrderiaDataContextValue | undefined>(undefined);

export function OrderiaDataProvider({
  children,
  openDatabase = openPlatformLocalDatabase,
  client: suppliedClient,
}: OrderiaDataProviderProps) {
  const { activeBranch } = useAuth();
  const [database, setDatabase] = useState<LocalDatabase | null>(null);
  const [readiness, setReadiness] = useState<OrderiaDataReadiness>('opening');
  const [sync, setSync] = useState<SyncStatusSnapshot>(initialSync);
  const [revision, setRevision] = useState(0);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  const client = useMemo(() => {
    if (suppliedClient !== undefined) return suppliedClient;
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  }, [suppliedClient]);

  const scope = useMemo<Required<RepositoryScope> | null>(() => {
    if (!activeBranch) return null;
    return {
      organizationId: toDomainId<OrganizationId>(activeBranch.organization_id),
      branchId: toDomainId<BranchId>(activeBranch.id),
    };
  }, [activeBranch]);

  useEffect(() => {
    mounted.current = true;
    let openedDatabase: LocalDatabase | null = null;
    let active = true;

    setReadiness('opening');
    void openDatabase()
      .then((opened) => {
        openedDatabase = opened;
        if (!active) {
          return opened.close();
        }
        setDatabase(opened);
        setReadiness('ready');
        setErrorMessage(undefined);
      })
      .catch(() => {
        if (!active) return;
        setDatabase(null);
        setReadiness('error');
        setErrorMessage('Local orders could not be opened on this device.');
      });

    return () => {
      active = false;
      mounted.current = false;
      refreshInFlight.current = null;
      if (openedDatabase) {
        void openedDatabase.close();
      }
    };
  }, [openDatabase]);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const job = (async () => {
      if (!database || !scope || !client) {
        if (mounted.current) {
          setRevision((current) => current + 1);
        }
        return;
      }

      const online = browserIsOnline();
      setSync((current) =>
        deriveSyncStatus({
          ...syncCounts(current),
          online,
          syncing: online,
          hasError: false,
        }),
      );

      try {
        if (online) {
          const pushWorker = new OutboxPushWorker(
            database,
            new SupabaseMutationPushGateway(client),
          );
          await pushWorker.runOnce(scope);
          const engine = new SyncPullEngine(database, new SupabaseSyncPullGateway(client));
          await engine.runOnce(scope);
        }

        const next = await inspectLocalSync(database, scope, online, false);
        if (!mounted.current) return;
        setSync(next);
        setRevision((current) => current + 1);
        setErrorMessage(undefined);
        if (online) {
          setLastSuccessfulSyncAt(new Date().toISOString());
        }
      } catch {
        const next = await inspectLocalSync(database, scope, browserIsOnline(), true).catch(() =>
          deriveSyncStatus({
            online: browserIsOnline(),
            pendingCount: 0,
            conflictCount: 0,
            syncing: false,
            hasError: true,
          }),
        );
        if (!mounted.current) return;
        setSync(next);
        setRevision((current) => current + 1);
        setErrorMessage('Cloud refresh failed. Saved local orders remain available.');
      }
    })();

    refreshInFlight.current = job;
    try {
      await job;
    } finally {
      if (refreshInFlight.current === job) {
        refreshInFlight.current = null;
      }
    }
  }, [client, database, scope]);

  const resolveProfileNames = useCallback(
    async (userIds: readonly string[]): Promise<Readonly<Record<string, string>>> => {
      const uniqueUserIds = [...new Set(userIds)];
      if (!client || uniqueUserIds.length === 0) return {};

      const { data, error } = await client
        .from('profiles')
        .select('id, display_name')
        .in('id', uniqueUserIds);
      if (error) throw error;
      return Object.fromEntries(data.map((profile) => [profile.id, profile.display_name]));
    },
    [client],
  );

  const resolveActiveParticipants = useCallback(
    async (tableSessionId: string): Promise<readonly ActiveSessionParticipantRow[]> => {
      if (!client || !scope) return [];
      const activeSince = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data, error } = await client.rpc('list_active_session_participants', {
        requested_organization_id: scope.organizationId,
        requested_branch_id: scope.branchId,
        requested_table_session_id: tableSessionId,
        active_since: activeSince,
      });
      if (error) throw error;
      return data;
    },
    [client, scope],
  );

  const confirmCheckPayments = useCallback(
    async (
      deviceId: DeviceId,
      clientMutationId: MutationId,
      command: ConfirmCheckPaymentsCommand,
    ): Promise<ConfirmCheckPaymentsResult> => {
      if (!client || !scope) throw new Error('Cloud payment service is unavailable');
      const result = await new SupabasePaymentGateway(client).confirm({
        ...scope,
        deviceId,
        clientMutationId,
        command,
      });
      await refresh();
      return result;
    },
    [client, refresh, scope],
  );

  useEffect(() => {
    if (!database || !scope || !client) return;

    let active = true;
    let unsubscribeHints: (() => Promise<void>) | undefined;
    void refresh();
    void subscribeToRealtimeSyncHints(
      client,
      scope,
      () => {
        if (active) void refresh();
      },
      (state) => {
        if (!active || state === 'connecting' || state === 'subscribed') return;
        setSync((current) =>
          deriveSyncStatus({
            ...syncCounts(current),
            online: browserIsOnline(),
            syncing: false,
            hasError: true,
          }),
        );
      },
    )
      .then((subscription) => {
        if (!active) {
          return subscription.unsubscribe();
        }
        unsubscribeHints = subscription.unsubscribe;
      })
      .catch(() => {
        if (!active) return;
        setSync((current) =>
          deriveSyncStatus({
            ...syncCounts(current),
            online: browserIsOnline(),
            syncing: false,
            hasError: true,
          }),
        );
      });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => {
      active = false;
      appStateSubscription.remove();
      if (unsubscribeHints) {
        void unsubscribeHints();
      }
    };
  }, [client, database, refresh, scope]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const updateConnection = () => {
      setSync((current) =>
        deriveSyncStatus({
          ...syncCounts(current),
          online: browserIsOnline(),
          syncing: false,
          hasError: current.hasError,
        }),
      );
      if (browserIsOnline()) void refresh();
    };
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, [refresh]);

  const value = useMemo<OrderiaDataContextValue>(
    () => ({
      database,
      mode: client && scope ? 'cloud' : 'local_only',
      readiness,
      scope,
      sync,
      revision,
      lastSuccessfulSyncAt,
      errorMessage,
      refresh,
      resolveProfileNames,
      resolveActiveParticipants,
      confirmCheckPayments,
    }),
    [
      client,
      confirmCheckPayments,
      database,
      errorMessage,
      lastSuccessfulSyncAt,
      readiness,
      refresh,
      resolveActiveParticipants,
      resolveProfileNames,
      revision,
      scope,
      sync,
    ],
  );

  return <OrderiaDataContext.Provider value={value}>{children}</OrderiaDataContext.Provider>;
}

export function useOrderiaData(): OrderiaDataContextValue {
  const context = useContext(OrderiaDataContext);
  if (!context) {
    throw new Error('useOrderiaData must be used within OrderiaDataProvider');
  }
  return context;
}

function browserIsOnline(): boolean {
  if (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.onLine === 'boolean'
  ) {
    return navigator.onLine;
  }
  return true;
}

function syncCounts(snapshot: SyncStatusSnapshot): {
  readonly pendingCount: number;
  readonly conflictCount: number;
} {
  return {
    pendingCount: snapshot.pendingCount,
    conflictCount: snapshot.conflictCount,
  };
}
