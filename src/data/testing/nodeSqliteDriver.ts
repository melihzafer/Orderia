import { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { SqliteDriver, SqliteRow, SqliteRunResult, SqliteValue } from '../sqlite/sqliteDriver';

export class NodeSqliteDriver implements SqliteDriver {
  private readonly database: DatabaseSync;
  private closed = false;

  constructor(path = ':memory:') {
    this.database = new DatabaseSync(path);
  }

  async exec(sql: string): Promise<void> {
    this.assertOpen();
    this.database.exec(sql);
  }

  async run(sql: string, parameters: readonly SqliteValue[] = []): Promise<SqliteRunResult> {
    this.assertOpen();
    const result = this.database.prepare(sql).run(...(parameters as readonly SQLInputValue[]));

    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  async getFirst<Row extends SqliteRow>(
    sql: string,
    parameters: readonly SqliteValue[] = [],
  ): Promise<Row | null> {
    this.assertOpen();
    const row = this.database.prepare(sql).get(...(parameters as readonly SQLInputValue[]));
    return row ? (row as Row) : null;
  }

  async getAll<Row extends SqliteRow>(
    sql: string,
    parameters: readonly SqliteValue[] = [],
  ): Promise<readonly Row[]> {
    this.assertOpen();
    return this.database.prepare(sql).all(...(parameters as readonly SQLInputValue[])) as Row[];
  }

  async exclusiveTransaction<Result>(
    work: (transaction: SqliteDriver) => Promise<Result>,
  ): Promise<Result> {
    this.assertOpen();
    this.database.exec('BEGIN IMMEDIATE');

    try {
      const result = await work(this);
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;

    this.database.close();
    this.closed = true;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('SQLite driver is closed');
    }
  }
}
