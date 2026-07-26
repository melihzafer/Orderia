import { LocalDatabase } from '../contracts';
import { openNativeLocalDatabase } from '../sqlite';

export function openPlatformLocalDatabase(): Promise<LocalDatabase> {
  return openNativeLocalDatabase();
}
