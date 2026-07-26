import { LocalDatabase } from '../contracts';

export async function openPlatformLocalDatabase(): Promise<LocalDatabase> {
  throw new Error('A platform-specific local database adapter was not selected');
}
