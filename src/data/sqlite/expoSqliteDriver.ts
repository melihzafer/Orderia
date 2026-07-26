import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { SqliteDriver, SqliteRow, SqliteRunResult, SqliteValue } from './sqliteDriver';

export async function openExpoSqliteDriver(databaseName = 'orderia-v2.db'): Promise<SqliteDriver> {
  const database = await openDatabaseAsync(databaseName);
  return new ExpoSqliteDriver(database);
}

class ExpoSqliteDriver implements SqliteDriver {
  constructor(private readonly database: SQLiteDatabase) {}

  async exec(sql: string): Promise<void> {
    await this.database.execAsync(sql);
  }

  async run(sql: string, parameters: readonly SqliteValue[] = []): Promise<SqliteRunResult> {
    const result = await this.database.runAsync(sql, [...parameters]);
    return {
      changes: result.changes,
      lastInsertRowId: result.lastInsertRowId,
    };
  }

  async getFirst<Row extends SqliteRow>(
    sql: string,
    parameters: readonly SqliteValue[] = [],
  ): Promise<Row | null> {
    return this.database.getFirstAsync<Row>(sql, [...parameters]);
  }

  async getAll<Row extends SqliteRow>(
    sql: string,
    parameters: readonly SqliteValue[] = [],
  ): Promise<readonly Row[]> {
    return this.database.getAllAsync<Row>(sql, [...parameters]);
  }

  async exclusiveTransaction<Result>(
    work: (transaction: SqliteDriver) => Promise<Result>,
  ): Promise<Result> {
    let result!: Result;

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      result = await work(new ExpoSqliteDriver(transaction));
    });

    return result;
  }

  async close(): Promise<void> {
    await this.database.closeAsync();
  }
}
