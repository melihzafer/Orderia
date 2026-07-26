import { LocalDatabase, RepositoryScope } from '../contracts';
import { DomainRemoteChangeApplier, RemoteChangeApplier } from './domainChangeApplier';
import { SyncPullGateway } from './syncPullGateway';

export interface SyncPullEngineOptions {
  readonly pageSize?: number;
  readonly maximumPages?: number;
  readonly now?: () => Date;
  readonly applier?: RemoteChangeApplier;
}

export interface SyncPullCycleResult {
  readonly applied: number;
  readonly pages: number;
  readonly cursor: string;
  readonly skippedBecauseRunning: boolean;
}

export class SyncPullEngine {
  private running = false;
  private readonly pageSize: number;
  private readonly maximumPages: number;
  private readonly now: () => Date;
  private readonly applier: RemoteChangeApplier;

  constructor(
    private readonly database: LocalDatabase,
    private readonly gateway: SyncPullGateway,
    options: SyncPullEngineOptions = {},
  ) {
    this.pageSize = options.pageSize ?? 200;
    this.maximumPages = options.maximumPages ?? 100;
    this.now = options.now ?? (() => new Date());
    this.applier = options.applier ?? new DomainRemoteChangeApplier();

    if (!Number.isSafeInteger(this.pageSize) || this.pageSize < 1 || this.pageSize > 500) {
      throw new Error('Sync pull page size must be between 1 and 500');
    }
    if (!Number.isSafeInteger(this.maximumPages) || this.maximumPages <= 0) {
      throw new Error('Sync pull maximum pages must be a positive safe integer');
    }
  }

  async runOnce(scope: Required<RepositoryScope>): Promise<SyncPullCycleResult> {
    if (this.running) {
      const cursor = (await this.database.syncState.getCursor(scope))?.value ?? '0';
      return { applied: 0, pages: 0, cursor, skippedBecauseRunning: true };
    }

    this.running = true;
    try {
      let cursor = (await this.database.syncState.getCursor(scope))?.value ?? '0';
      let applied = 0;
      let pages = 0;
      let reachedEnd = false;

      while (pages < this.maximumPages) {
        const events = await this.gateway.pull(scope, cursor, this.pageSize);
        if (events.length === 0) {
          reachedEnd = true;
          break;
        }
        assertCursorOrder(
          cursor,
          events.map((event) => event.cursor),
        );

        const nextCursor = events[events.length - 1].cursor;
        await this.database.transaction(async (transaction) => {
          for (const event of events) {
            await this.applier.apply(transaction, scope, event);
          }
          await transaction.syncState.setCursor({
            organizationId: scope.organizationId,
            branchId: scope.branchId,
            value: nextCursor,
            updatedAt: this.now().toISOString(),
          });
        });

        cursor = nextCursor;
        applied += events.length;
        pages += 1;
        if (events.length < this.pageSize) {
          reachedEnd = true;
          break;
        }
      }

      if (!reachedEnd && pages === this.maximumPages) {
        throw new Error('Sync pull page safety limit reached');
      }

      return { applied, pages, cursor, skippedBecauseRunning: false };
    } finally {
      this.running = false;
    }
  }
}

function assertCursorOrder(previousCursor: string, cursors: readonly string[]): void {
  let previous = parseCursor(previousCursor);
  for (const cursor of cursors) {
    const current = parseCursor(cursor);
    if (current <= previous) {
      throw new Error('Remote sync cursors must be strictly increasing');
    }
    previous = current;
  }
}

function parseCursor(cursor: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(cursor)) {
    throw new Error(`Invalid durable sync cursor: ${cursor}`);
  }
  return BigInt(cursor);
}
