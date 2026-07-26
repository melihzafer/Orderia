import { OutboxRepository } from './outbox';
import {
  DomainEntityMap,
  ReadRepository,
  RepositoryName,
  TransactionRepository,
} from './repository';
import { SyncStateRepository } from './syncState';

export type LocalDatabaseEngine = 'memory' | 'sqlite' | 'indexeddb';

export interface LocalTransaction {
  repository<Name extends RepositoryName>(name: Name): TransactionRepository<DomainEntityMap[Name]>;
  readonly outbox: OutboxRepository;
  readonly syncState: SyncStateRepository;
}

export interface LocalDatabase {
  readonly engine: LocalDatabaseEngine;
  repository<Name extends RepositoryName>(name: Name): ReadRepository<DomainEntityMap[Name]>;
  readonly outbox: Pick<OutboxRepository, 'getById' | 'list'>;
  readonly syncState: Pick<SyncStateRepository, 'getCursor' | 'getConflict' | 'listConflicts'>;
  transaction<Result>(work: (transaction: LocalTransaction) => Promise<Result>): Promise<Result>;
  close(): Promise<void>;
}
