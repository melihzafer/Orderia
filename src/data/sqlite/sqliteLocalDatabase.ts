import {
  DomainEntityMap,
  LocalDatabase,
  LocalTransaction,
  OutboxRepository,
  ReadRepository,
  RepositoryName,
  SyncStateRepository,
} from '../contracts';
import { migrateSqliteDatabase } from './migrations';
import { SqliteDriver } from './sqliteDriver';
import { SqliteOutboxRepository } from './sqliteOutboxRepository';
import { SqliteRepository } from './sqliteRepository';
import { SqliteSyncStateRepository } from './sqliteSyncStateRepository';

type DatabaseState = 'open' | 'closing' | 'closed';

export class SqliteLocalDatabase implements LocalDatabase {
  readonly engine = 'sqlite' as const;

  private transactionTail: Promise<void> = Promise.resolve();
  private state: DatabaseState = 'open';
  private readonly readDriver: SqliteDriver;

  private constructor(private readonly driver: SqliteDriver) {
    this.readDriver = new QueuedReadSqliteDriver(
      driver,
      async () => this.transactionTail,
      () => this.assertOpen(),
    );
  }

  static async open(driver: SqliteDriver): Promise<SqliteLocalDatabase> {
    try {
      await migrateSqliteDatabase(driver);
      return new SqliteLocalDatabase(driver);
    } catch (error) {
      await driver.close();
      throw error;
    }
  }

  get outbox(): Pick<OutboxRepository, 'getById' | 'list'> {
    this.assertOpen();
    return new SqliteOutboxRepository(() => {
      this.assertOpen();
      return this.readDriver;
    });
  }

  get syncState(): Pick<SyncStateRepository, 'getCursor' | 'getConflict' | 'listConflicts'> {
    this.assertOpen();
    return new SqliteSyncStateRepository(() => {
      this.assertOpen();
      return this.readDriver;
    });
  }

  repository<Name extends RepositoryName>(name: Name): ReadRepository<DomainEntityMap[Name]> {
    this.assertOpen();
    return new SqliteRepository(name, () => {
      this.assertOpen();
      return this.readDriver;
    });
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
      return await this.driver.exclusiveTransaction(async (transactionDriver) => {
        const getTransactionDriver = () => {
          if (!transactionActive) {
            throw new Error('Local transaction is no longer active');
          }

          return transactionDriver;
        };
        return work(createTransaction(getTransactionDriver));
      });
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
    await this.driver.close();
    this.state = 'closed';
  }

  private assertOpen(): void {
    if (this.state !== 'open') {
      throw new Error('Local database is closed');
    }
  }
}

function createTransaction(getDriver: () => SqliteDriver): LocalTransaction {
  return {
    repository: <Name extends RepositoryName>(name: Name) => new SqliteRepository(name, getDriver),
    outbox: new SqliteOutboxRepository(getDriver),
    syncState: new SqliteSyncStateRepository(getDriver),
  };
}

class QueuedReadSqliteDriver implements SqliteDriver {
  constructor(
    private readonly driver: SqliteDriver,
    private readonly waitForTransactions: () => Promise<void>,
    private readonly assertOpen: () => void,
  ) {}

  async exec(sql: string): Promise<void> {
    await this.wait();
    return this.driver.exec(sql);
  }

  async run(
    sql: string,
    parameters?: Parameters<SqliteDriver['run']>[1],
  ): ReturnType<SqliteDriver['run']> {
    await this.wait();
    return this.driver.run(sql, parameters);
  }

  async getFirst<Row extends Record<string, null | number | string>>(
    sql: string,
    parameters?: Parameters<SqliteDriver['getFirst']>[1],
  ): Promise<Row | null> {
    await this.wait();
    return this.driver.getFirst<Row>(sql, parameters);
  }

  async getAll<Row extends Record<string, null | number | string>>(
    sql: string,
    parameters?: Parameters<SqliteDriver['getAll']>[1],
  ): Promise<readonly Row[]> {
    await this.wait();
    return this.driver.getAll<Row>(sql, parameters);
  }

  async exclusiveTransaction<Result>(
    _work: (transaction: SqliteDriver) => Promise<Result>,
  ): Promise<Result> {
    throw new Error('Read-only SQLite driver cannot start a transaction');
  }

  async close(): Promise<void> {
    throw new Error('Read-only SQLite driver cannot close the database');
  }

  private async wait(): Promise<void> {
    this.assertOpen();
    await this.waitForTransactions();
    this.assertOpen();
  }
}
