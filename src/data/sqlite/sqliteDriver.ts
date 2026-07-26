export type SqliteValue = null | number | string;
export type SqliteRow = Record<string, null | number | string>;

export interface SqliteRunResult {
  readonly changes: number;
  readonly lastInsertRowId?: number;
}

export interface SqliteDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, parameters?: readonly SqliteValue[]): Promise<SqliteRunResult>;
  getFirst<Row extends SqliteRow>(
    sql: string,
    parameters?: readonly SqliteValue[],
  ): Promise<Row | null>;
  getAll<Row extends SqliteRow>(
    sql: string,
    parameters?: readonly SqliteValue[],
  ): Promise<readonly Row[]>;
  exclusiveTransaction<Result>(
    work: (transaction: SqliteDriver) => Promise<Result>,
  ): Promise<Result>;
  close(): Promise<void>;
}
