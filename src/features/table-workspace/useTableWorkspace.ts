import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrderiaData } from '../../data/runtime';
import { RestaurantTableId, UserId } from '../../domain';
import type { WorkspaceCopy } from './workspaceCopy';
import { loadTableWorkspace, TableWorkspaceSnapshot } from './workspaceModel';

export interface UseTableWorkspaceResult {
  readonly snapshot: TableWorkspaceSnapshot | null;
  readonly loading: boolean;
  readonly loadError?: string;
  readonly reload: () => Promise<void>;
  readonly waiterNames: Readonly<Record<string, string>>;
  readonly participantNames: readonly string[];
  readonly incomingMessage?: string;
  readonly dismissIncoming: () => void;
}

/**
 * Masa çalışma alanının anlık görüntüsünü yükler ve tazeler.
 *
 * TableDetailScreen'den ayrıldı ki AddProductScreen da aynı yükleme/yarış
 * koruma mantığını tekrar yazmak zorunda kalmasın — ikisi de aynı hook'u
 * kullanır, davranış birebir aynı kalır.
 */
export function useTableWorkspace({
  tableId,
  actorUserId,
  copy,
}: {
  readonly tableId: RestaurantTableId;
  readonly actorUserId: UserId;
  readonly copy: WorkspaceCopy;
}): UseTableWorkspaceResult {
  const { database, resolveActiveParticipants, resolveProfileNames, revision, scope } =
    useOrderiaData();
  const [snapshot, setSnapshot] = useState<TableWorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [waiterNames, setWaiterNames] = useState<Readonly<Record<string, string>>>({});
  const [participantNames, setParticipantNames] = useState<readonly string[]>([]);
  const [incomingMessage, setIncomingMessage] = useState<string>();
  const snapshotRef = useRef<TableWorkspaceSnapshot | null>(null);
  const reloadRequestRevisionRef = useRef(0);

  const reload = useCallback(async () => {
    if (!database || !scope) return;
    const requestRevision = ++reloadRequestRevisionRef.current;
    const isCurrentRequest = () => requestRevision === reloadRequestRevisionRef.current;
    try {
      const next = await loadTableWorkspace(database, scope, tableId);
      if (!isCurrentRequest()) return;
      const previous = snapshotRef.current;
      if (previous && next) {
        const previousItemIds = new Set(previous.orderItems.map((item) => item.id));
        const incoming = next.orderItems.filter(
          (item) => !previousItemIds.has(item.id) && item.createdBy !== actorUserId,
        );
        if (incoming.length > 0) {
          const actorIds = [...new Set(incoming.map((item) => item.createdBy))];
          const names: Readonly<Record<string, string>> = await resolveProfileNames(actorIds).catch(
            () => ({}),
          );
          if (!isCurrentRequest()) return;
          const actorNames = actorIds.map((id) => names[id] ?? copy.unknownWaiter);
          setIncomingMessage(`${actorNames.join(', ')} · ${incoming.length} ${copy.incomingItems}`);
        }
      }
      if (!isCurrentRequest()) return;
      snapshotRef.current = next;
      setSnapshot(next);
      setLoadError(next ? undefined : copy.tableNotFound);
    } catch {
      if (isCurrentRequest()) setLoadError(copy.loadFailed);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [
    actorUserId,
    copy.incomingItems,
    copy.loadFailed,
    copy.tableNotFound,
    copy.unknownWaiter,
    database,
    resolveProfileNames,
    scope,
    tableId,
  ]);

  useEffect(() => {
    reloadRequestRevisionRef.current += 1;
    snapshotRef.current = null;
    setSnapshot(null);
    setLoadError(undefined);
    setIncomingMessage(undefined);
    setWaiterNames({});
    setParticipantNames([]);
    setLoading(true);

    return () => {
      reloadRequestRevisionRef.current += 1;
    };
  }, [scope?.branchId, scope?.organizationId, tableId]);

  useEffect(() => {
    void reload();
  }, [reload, revision]);

  useEffect(() => {
    if (!snapshot) return;
    const ids = [...new Set(snapshot.orderItems.map((item) => item.createdBy))];
    let active = true;
    void resolveProfileNames(ids)
      .then((names) => {
        if (active) setWaiterNames(names);
      })
      .catch(() => {
        if (active) setWaiterNames({});
      });
    return () => {
      active = false;
    };
  }, [resolveProfileNames, snapshot]);

  useEffect(() => {
    if (!snapshot?.session) {
      setParticipantNames([]);
      return;
    }
    let active = true;
    void resolveActiveParticipants(snapshot.session.id)
      .then((participants) => {
        if (active)
          setParticipantNames(participants.map((participant) => participant.display_name));
      })
      .catch(() => {
        if (!active) return;
        const cutoff = Date.now() - 15 * 60_000;
        const userIds = [
          ...new Set(
            snapshot.orderItems
              .filter((item) => Date.parse(item.updatedAt) >= cutoff)
              .map((item) => item.createdBy),
          ),
        ];
        setParticipantNames(userIds.map((id) => waiterNames[id] ?? copy.unknownWaiter));
      });
    return () => {
      active = false;
    };
  }, [copy.unknownWaiter, resolveActiveParticipants, revision, snapshot, waiterNames]);

  useEffect(() => {
    if (!incomingMessage) return;
    const timer = setTimeout(() => setIncomingMessage(undefined), 4_000);
    return () => clearTimeout(timer);
  }, [incomingMessage]);

  return {
    snapshot,
    loading,
    ...(loadError ? { loadError } : {}),
    reload,
    waiterNames,
    participantNames,
    ...(incomingMessage ? { incomingMessage } : {}),
    dismissIncoming: () => setIncomingMessage(undefined),
  };
}
