import { InMemoryLocalDatabase } from '../inMemoryLocalDatabase';
import { defineLocalDatabaseContract } from '../localDatabaseContract';

defineLocalDatabaseContract('in-memory', () => new InMemoryLocalDatabase());
