import { openExpoSqliteDriver } from './expoSqliteDriver';
import { SqliteLocalDatabase } from './sqliteLocalDatabase';

export async function openNativeLocalDatabase(
  databaseName = 'orderia-v2.db',
): Promise<SqliteLocalDatabase> {
  const driver = await openExpoSqliteDriver(databaseName);
  return SqliteLocalDatabase.open(driver);
}
