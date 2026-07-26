import { LocalDatabase } from '../contracts';
import { IndexedDbLocalDatabase } from '../indexeddb';

export function openPlatformLocalDatabase(): Promise<LocalDatabase> {
  return IndexedDbLocalDatabase.open();
}
