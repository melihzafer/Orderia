import { defineLocalDatabaseContract } from '../../testing/localDatabaseContract';
import { NodeSqliteDriver } from '../../testing/nodeSqliteDriver';
import { migrateSqliteDatabase, sqliteMigrations } from '../migrations';
import { SqliteLocalDatabase } from '../sqliteLocalDatabase';

defineLocalDatabaseContract('SQLite', () => SqliteLocalDatabase.open(new NodeSqliteDriver()));

describe('SQLite migrations', () => {
  it('applies each migration once when initialization is repeated', async () => {
    const driver = new NodeSqliteDriver();

    await migrateSqliteDatabase(driver);
    await migrateSqliteDatabase(driver);

    const applied = await driver.getAll<{ version: number; name: string }>(
      `SELECT version, name
       FROM schema_migrations
       ORDER BY version`,
    );
    expect(applied).toEqual(sqliteMigrations.map(({ version, name }) => ({ version, name })));

    await driver.close();
  });
});

describe('SQLite lifecycle', () => {
  it('lets an accepted transaction finish before closing the connection', async () => {
    const database = await SqliteLocalDatabase.open(new NodeSqliteDriver());
    let continueTransaction!: () => void;
    const transactionGate = new Promise<void>((resolve) => {
      continueTransaction = resolve;
    });

    const transaction = database.transaction(async () => {
      await transactionGate;
      return 'committed';
    });
    const close = database.close();

    continueTransaction();

    await expect(transaction).resolves.toBe('committed');
    await expect(close).resolves.toBeUndefined();
    expect(() => database.repository('halls')).toThrow(/closed/);
  });
});
