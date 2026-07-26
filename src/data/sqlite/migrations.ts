import { SqliteDriver } from './sqliteDriver';

export interface SqliteMigration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export const sqliteMigrations: readonly SqliteMigration[] = [
  {
    version: 1,
    name: 'local_first_foundation',
    sql: `
      CREATE TABLE IF NOT EXISTS domain_records (
        collection TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        branch_id TEXT NOT NULL DEFAULT '',
        entity_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        deleted_at TEXT,
        entity_json TEXT NOT NULL,
        PRIMARY KEY (collection, organization_id, branch_id, entity_id)
      );

      CREATE INDEX IF NOT EXISTS idx_domain_records_scope
        ON domain_records (organization_id, branch_id, collection, entity_id);

      CREATE INDEX IF NOT EXISTS idx_domain_records_active
        ON domain_records (organization_id, branch_id, collection, entity_id)
        WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS outbox_mutations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        client_mutation_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        repository TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        base_version INTEGER,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        last_attempt_at TEXT,
        next_attempt_at TEXT,
        applied_at TEXT,
        error_code TEXT,
        error_message TEXT,
        UNIQUE (device_id, client_mutation_id)
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_claim
        ON outbox_mutations (
          organization_id,
          branch_id,
          status,
          next_attempt_at,
          created_at
        );

      CREATE TABLE IF NOT EXISTS sync_cursors (
        organization_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        cursor_value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, branch_id)
      );

      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        mutation_id TEXT NOT NULL,
        repository TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        base_version INTEGER,
        server_version INTEGER NOT NULL,
        local_payload_json TEXT NOT NULL,
        server_payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        resolved_at TEXT,
        resolution_payload_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_scope
        ON sync_conflicts (organization_id, branch_id, status, detected_at);
    `,
  },
];

export async function migrateSqliteDatabase(driver: SqliteDriver): Promise<void> {
  await driver.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await driver.getAll<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  const appliedVersions = new Set(appliedRows.map((row) => Number(row.version)));

  for (const migration of sqliteMigrations) {
    if (appliedVersions.has(migration.version)) continue;

    await driver.exclusiveTransaction(async (transaction) => {
      await transaction.exec(migration.sql);
      await transaction.run(
        `INSERT INTO schema_migrations (version, name, applied_at)
         VALUES (?, ?, ?)`,
        [migration.version, migration.name, new Date().toISOString()],
      );
    });
  }
}
