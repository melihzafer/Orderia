import {
  DomainEntityMap,
  LocalDatabase,
  LocalTransaction,
  OutboxRepository,
  ReadRepository,
  RepositoryName,
  SyncStateRepository,
} from '../contracts';
import { indexedDbStoreNames, indexedDbStores, openIndexedDbConnection } from './indexedDbSchema';
import { IndexedDbOutboxRepository } from './indexedDbOutboxRepository';
import { IndexedDbRepository } from './indexedDbRepository';
import { IndexedDbSyncStateRepository } from './indexedDbSyncStateRepository';
import {
  createStrictReadWriteTransaction,
  keepTransactionAlive,
  transactionResult,
} from './indexedDbUtils';

type DatabaseState = 'open' | 'closing' | 'closed';

export class IndexedDbLocalDatabase implements LocalDatabase {
  readonly engine = 'indexeddb' as const;

  private state: DatabaseState = 'open';
  private transactionTail: Promise<void> = Promise.resolve();

  private constructor(private readonly database: IDBDatabase) {
    database.onversionchange = () => {
      void this.close();
    };
  }

  static async open(
    databaseName = 'orderia-v2',
    factory: IDBFactory | undefined = globalThis.indexedDB,
  ): Promise<IndexedDbLocalDatabase> {
    if (!factory) {
      throw new Error('IndexedDB is not available in this environment');
    }

    const database = await openIndexedDbConnection(factory, databaseName);
    return new IndexedDbLocalDatabase(database);
  }

  get outbox(): Pick<OutboxRepository, 'getById' | 'list'> {
    this.assertOpen();
    return new IndexedDbOutboxRepository(() => this.readStore(indexedDbStores.outboxMutations));
  }

  get syncState(): Pick<SyncStateRepository, 'getCursor' | 'getConflict' | 'listConflicts'> {
    this.assertOpen();
    return new IndexedDbSyncStateRepository((name) => this.readStore(name));
  }

  repository<Name extends RepositoryName>(name: Name): ReadRepository<DomainEntityMap[Name]> {
    this.assertOpen();
    return new IndexedDbRepository(name, () => this.readStore(indexedDbStores.domainRecords));
  }

  async transaction<Result>(
    work: (transaction: LocalTransaction) => Promise<Result>,
  ): Promise<Result> {
    this.assertOpen();

    const previousTransaction = this.transactionTail;
    let releaseTransaction!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    await previousTransaction;
    let transactionActive = true;

    try {
      const indexedDbTransaction = createStrictReadWriteTransaction(
        this.database,
        indexedDbStoreNames,
      );
      const completion = transactionResult(indexedDbTransaction);
      const stopKeepAlive = keepTransactionAlive(indexedDbTransaction, indexedDbStores.metadata);
      const getStore = (name: string) => {
        if (!transactionActive) {
          throw new Error('Local transaction is no longer active');
        }

        return indexedDbTransaction.objectStore(name);
      };

      try {
        const result = await work(createTransaction(getStore));
        stopKeepAlive();
        await completion;
        return result;
      } catch (error) {
        stopKeepAlive();
        try {
          indexedDbTransaction.abort();
        } catch {
          // The browser may already have aborted the transaction.
        }
        try {
          await completion;
        } catch {
          // Preserve the original application or request error.
        }
        throw error;
      }
    } finally {
      transactionActive = false;
      releaseTransaction();
    }
  }

  async close(): Promise<void> {
    if (this.state === 'closed') return;
    if (this.state === 'closing') {
      await this.transactionTail;
      return;
    }

    this.state = 'closing';
    await this.transactionTail;
    this.database.close();
    this.state = 'closed';
  }

  private readStore(name: string): IDBObjectStore {
    this.assertOpen();
    return this.database.transaction(name, 'readonly').objectStore(name);
  }

  private assertOpen(): void {
    if (this.state !== 'open') {
      throw new Error('Local database is closed');
    }
  }
}

function createTransaction(getStore: (name: string) => IDBObjectStore): LocalTransaction {
  return {
    repository: <Name extends RepositoryName>(name: Name) =>
      new IndexedDbRepository(name, () => getStore(indexedDbStores.domainRecords)),
    outbox: new IndexedDbOutboxRepository(() => getStore(indexedDbStores.outboxMutations)),
    syncState: new IndexedDbSyncStateRepository(getStore),
  };
}
